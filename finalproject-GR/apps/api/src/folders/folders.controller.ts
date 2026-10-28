import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import { isUuid } from '../executions/execution-input';
import { type ExecutionActor, loadActorDisplayName } from '../executions/execution-queries';
import { fitsDepth, MAX_FOLDER_DEPTH, parseFolderName, parseMoveTarget, parseParentId } from './tree-rules';
import {
  activeExecutionsFor,
  assertTargetFolder,
  type FolderResponse,
  type FolderRow,
  folderDepth,
  isSelfOrDescendant,
  isUniqueViolation,
  keyForAppend,
  keyForMove,
  loadFolder,
  logTreeActivity,
  subtreeContents,
  subtreeHeight,
  toFolderResponse,
} from './folder-queries';

const DUPLICATE_NAME = 'a folder with this name already exists here';
const TOO_DEEP = `folders can be nested at most ${MAX_FOLDER_DEPTH} levels deep`;

/** Folders (specs/test-case-folders). Test case placement and moves live in TestCasesController. */
@Controller('projects/:projectId/folders')
export class FoldersController {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(request: AuthenticatedRequest, projectId: string): Promise<ExecutionActor> {
    const userId = request.auth!.userId;
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, userId, projectId);
    const displayName = await loadActorDisplayName(this.prisma, userId);
    return { workspaceId, projectId, userId, displayName };
  }

  /** Runs a write; a race past the sibling-name pre-check still surfaces as 409. */
  private async write<T>(workspaceId: string, fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await withTenantContext(this.prisma, workspaceId, fn);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_NAME);
      }
      throw error;
    }
  }

  private async assertNameFree(
    tx: Prisma.TransactionClient,
    projectId: string,
    parentId: string | null,
    name: string,
    exceptId: string | null,
  ) {
    const [clash] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM folder
      WHERE project_id = ${projectId}::uuid AND deleted_at IS NULL
        AND parent_folder_id IS NOT DISTINCT FROM ${parentId}::uuid
        AND lower(name) = lower(${name}) AND id IS DISTINCT FROM ${exceptId}::uuid
    `;
    if (clash) {
      throw new ConflictException(DUPLICATE_NAME);
    }
  }

  @Get()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async list(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<FolderResponse[]> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    const rows = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<FolderRow[]>`
        SELECT id, parent_folder_id, name, position_key FROM folder
        WHERE project_id = ${projectId}::uuid AND deleted_at IS NULL
        ORDER BY position_key, id
      `,
    );
    return rows.map(toFolderResponse);
  }

  @Post()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async create(
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<FolderResponse> {
    const name = parseFolderName(body?.name);
    const parentId = parseParentId(body?.parentFolderId, 'parentFolderId');
    const actor = await this.actor(request, projectId);

    return this.write(actor.workspaceId, async (tx) => {
      await assertTargetFolder(tx, projectId, parentId);
      if (!fitsDepth(await folderDepth(tx, parentId), 1)) {
        throw new ConflictException(TOO_DEEP);
      }
      await this.assertNameFree(tx, projectId, parentId, name, null);
      const key = await keyForAppend(tx, 'folder', projectId, parentId);
      const [row] = await tx.$queryRaw<FolderRow[]>`
        INSERT INTO folder (project_id, workspace_id, parent_folder_id, name, position_key)
        VALUES (${projectId}::uuid, ${actor.workspaceId}::uuid, ${parentId}::uuid, ${name}, ${key})
        RETURNING id, parent_folder_id, name, position_key
      `;
      await logTreeActivity(tx, actor, 'folder.created', { type: 'folder', id: row.id, name }, { parentFolderId: parentId });
      return toFolderResponse(row);
    });
  }

  @Patch(':folderId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async rename(
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<FolderResponse> {
    if (!isUuid(folderId)) {
      throw new NotFoundException('folder not found');
    }
    const name = parseFolderName(body?.name);
    const actor = await this.actor(request, projectId);

    return this.write(actor.workspaceId, async (tx) => {
      const folder = await loadFolder(tx, projectId, folderId);
      if (!folder) {
        throw new NotFoundException('folder not found');
      }
      await this.assertNameFree(tx, projectId, folder.parent_folder_id, name, folderId);
      const [row] = await tx.$queryRaw<FolderRow[]>`
        UPDATE folder SET name = ${name}, updated_at = now() WHERE id = ${folderId}::uuid
        RETURNING id, parent_folder_id, name, position_key
      `;
      await logTreeActivity(tx, actor, 'folder.renamed', { type: 'folder', id: folderId, name }, { from: folder.name, to: name });
      return toFolderResponse(row);
    });
  }

  @Post(':folderId/move')
  @HttpCode(200)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async move(
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<FolderResponse> {
    if (!isUuid(folderId)) {
      throw new NotFoundException('folder not found');
    }
    const target = parseMoveTarget(body ?? {}, 'parentFolderId');
    const actor = await this.actor(request, projectId);

    return this.write(actor.workspaceId, async (tx) => {
      const [folder] = await tx.$queryRaw<FolderRow[]>`
        SELECT id, parent_folder_id, name, position_key FROM folder
        WHERE id = ${folderId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!folder) {
        throw new NotFoundException('folder not found');
      }
      await assertTargetFolder(tx, projectId, target.parentFolderId);
      if (target.parentFolderId !== null && (await isSelfOrDescendant(tx, folderId, target.parentFolderId))) {
        throw new ConflictException('a folder cannot be moved into itself or one of its subfolders');
      }
      if (!fitsDepth(await folderDepth(tx, target.parentFolderId), await subtreeHeight(tx, folderId))) {
        throw new ConflictException(TOO_DEEP);
      }
      if (folder.parent_folder_id !== target.parentFolderId) {
        await this.assertNameFree(tx, projectId, target.parentFolderId, folder.name, folderId);
      }
      const key = await keyForMove(tx, 'folder', projectId, target.parentFolderId, target.afterId, folderId);
      const [row] = await tx.$queryRaw<FolderRow[]>`
        UPDATE folder SET parent_folder_id = ${target.parentFolderId}::uuid, position_key = ${key}, updated_at = now()
        WHERE id = ${folderId}::uuid
        RETURNING id, parent_folder_id, name, position_key
      `;
      await logTreeActivity(tx, actor, 'folder.moved', { type: 'folder', id: folderId, name: folder.name }, {
        fromParentFolderId: folder.parent_folder_id,
        toParentFolderId: target.parentFolderId,
      });
      return toFolderResponse(row);
    });
  }

  @Get(':folderId/delete-impact')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async deleteImpact(
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ folders: number; testCases: number }> {
    if (!isUuid(folderId)) {
      throw new NotFoundException('folder not found');
    }
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    return withTenantContext(this.prisma, workspaceId, async (tx) => {
      if (!(await loadFolder(tx, projectId, folderId))) {
        throw new NotFoundException('folder not found');
      }
      const { folderIds, testCaseIds } = await subtreeContents(tx, folderId);
      return { folders: folderIds.length, testCases: testCaseIds.length };
    });
  }

  /** Soft-deletes the folder, its subfolders and their test cases under one deletion id (ADR 0007). */
  @Delete(':folderId')
  @HttpCode(204)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async remove(
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    if (!isUuid(folderId)) {
      throw new NotFoundException('folder not found');
    }
    const actor = await this.actor(request, projectId);

    await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [folder] = await tx.$queryRaw<FolderRow[]>`
        SELECT id, parent_folder_id, name, position_key FROM folder
        WHERE id = ${folderId}::uuid AND project_id = ${projectId}::uuid AND deleted_at IS NULL
        FOR UPDATE
      `;
      if (!folder) {
        throw new NotFoundException('folder not found');
      }
      const { folderIds, testCaseIds } = await subtreeContents(tx, folderId);
      // ADR 0012: Ready/InProgress/Paused executions block deletion; Draft doesn't.
      const executions = await activeExecutionsFor(tx, testCaseIds);
      if (executions.length > 0) {
        throw new ConflictException({
          message: `test cases in this folder are part of active executions: ${executions.join(', ')}`,
          executions,
        });
      }

      const [{ deletion_id: deletionId }] = await tx.$queryRaw<{ deletion_id: string }[]>`
        SELECT gen_random_uuid() AS deletion_id
      `;
      await tx.$executeRaw`
        UPDATE folder SET deleted_at = now(), deleted_by = ${actor.userId}::uuid, deletion_id = ${deletionId}::uuid,
          updated_at = now()
        WHERE id = ANY(${folderIds}::uuid[])
      `;
      if (testCaseIds.length > 0) {
        await tx.$executeRaw`
          UPDATE test_case SET deleted_at = now(), deleted_by = ${actor.userId}::uuid, deletion_id = ${deletionId}::uuid
          WHERE id = ANY(${testCaseIds}::uuid[])
        `;
      }
      await logTreeActivity(tx, actor, 'folder.deleted', { type: 'folder', id: folderId, name: folder.name }, {
        deletionId,
        folders: folderIds.length,
        testCases: testCaseIds.length,
      });
    });
  }
}
