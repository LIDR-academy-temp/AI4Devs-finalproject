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
import { isUniqueViolation, logTreeActivity } from '../folders/folder-queries';
import { nextColor, parseTagColor, parseTagName, type TagColor } from './tag-rules';

const DUPLICATE_NAME = 'a tag with this name already exists';

interface TagRow {
  id: string;
  name: string;
  color: TagColor;
  test_case_count: bigint;
  bug_count: bigint;
}

export interface TagResponse {
  id: string;
  name: string;
  color: TagColor;
  testCaseCount: number;
  bugCount: number;
}

const toResponse = (row: TagRow): TagResponse => ({
  id: row.id,
  name: row.name,
  color: row.color,
  testCaseCount: Number(row.test_case_count),
  bugCount: Number(row.bug_count),
});

/**
 * Tags with how many non-deleted test cases and bugs carry each (ADR 0016 decision 4).
 * Scalar subqueries: joining both carriers would multiply the rows being counted.
 */
const TAG_SELECT = Prisma.sql`
  SELECT t.id, t.name, t.color,
    (SELECT COUNT(*) FROM test_case_tag tt JOIN test_case tc ON tc.id = tt.test_case_id
      WHERE tt.tag_id = t.id AND tc.deleted_at IS NULL) AS test_case_count,
    (SELECT COUNT(*) FROM bug_tag bt JOIN bug b ON b.id = bt.bug_id
      WHERE bt.tag_id = t.id AND b.deleted_at IS NULL) AS bug_count
  FROM tag t
`;

async function loadTag(tx: Prisma.TransactionClient, projectId: string, tagId: string): Promise<TagRow | undefined> {
  const [row] = await tx.$queryRaw<TagRow[]>`
    ${TAG_SELECT}
    WHERE t.id = ${tagId}::uuid AND t.project_id = ${projectId}::uuid
  `;
  return row;
}

/** A project's tags (specs/tag-management, ADR 0016). Applying tags is a test case edit. */
@Controller('projects/:projectId/tags')
export class TagsController {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(request: AuthenticatedRequest, projectId: string): Promise<ExecutionActor> {
    const userId = request.auth!.userId;
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, userId, projectId);
    const displayName = await loadActorDisplayName(this.prisma, userId);
    return { workspaceId, projectId, userId, displayName };
  }

  /** Runs a write; a duplicate name (the lower(name) unique index) surfaces as 409. */
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

  @Get()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async list(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<TagResponse[]> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    const rows = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<TagRow[]>`
        ${TAG_SELECT}
        WHERE t.project_id = ${projectId}::uuid
        ORDER BY lower(t.name), t.id
      `,
    );
    return rows.map(toResponse);
  }

  @Post()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async create(
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<TagResponse> {
    const name = parseTagName(body?.name);
    const requestedColor = body?.color === undefined ? null : parseTagColor(body.color);
    const actor = await this.actor(request, projectId);

    return this.write(actor.workspaceId, async (tx) => {
      // Two concurrent creates may pick the same default colour; harmless (design.md).
      const [newest] = await tx.$queryRaw<{ color: string }[]>`
        SELECT color FROM tag WHERE project_id = ${projectId}::uuid ORDER BY created_at DESC, id DESC LIMIT 1
      `;
      const color = requestedColor ?? nextColor(newest?.color ?? null);
      const [created] = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO tag (project_id, workspace_id, name, color)
        VALUES (${projectId}::uuid, ${actor.workspaceId}::uuid, ${name}, ${color})
        RETURNING id
      `;
      await logTreeActivity(tx, actor, 'tag.created', { type: 'tag', id: created.id, name }, { color });
      return toResponse((await loadTag(tx, projectId, created.id))!);
    });
  }

  @Patch(':tagId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Contributor')
  async update(
    @Param('projectId') projectId: string,
    @Param('tagId') tagId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<TagResponse> {
    if (!isUuid(tagId)) {
      throw new NotFoundException('tag not found');
    }
    const name = body?.name === undefined ? null : parseTagName(body.name);
    const color = body?.color === undefined ? null : parseTagColor(body.color);
    const actor = await this.actor(request, projectId);

    return this.write(actor.workspaceId, async (tx) => {
      const [current] = await tx.$queryRaw<{ name: string; color: TagColor }[]>`
        SELECT name, color FROM tag WHERE id = ${tagId}::uuid AND project_id = ${projectId}::uuid FOR UPDATE
      `;
      if (!current) {
        throw new NotFoundException('tag not found');
      }
      const changes: Record<string, { from: string; to: string }> = {};
      if (name !== null && name !== current.name) changes.name = { from: current.name, to: name };
      if (color !== null && color !== current.color) changes.color = { from: current.color, to: color };

      if (Object.keys(changes).length > 0) {
        await tx.$executeRaw`
          UPDATE tag SET name = COALESCE(${name}, name), color = COALESCE(${color}, color), updated_at = now()
          WHERE id = ${tagId}::uuid
        `;
        await logTreeActivity(tx, actor, 'tag.updated', { type: 'tag', id: tagId, name: name ?? current.name }, { changes });
      }
      return toResponse((await loadTag(tx, projectId, tagId))!);
    });
  }

  /** Permanent (ADR 0016 decision 5): the tag leaves every test case and bug; the log keeps the history. */
  @Delete(':tagId')
  @HttpCode(204)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async remove(
    @Param('projectId') projectId: string,
    @Param('tagId') tagId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    if (!isUuid(tagId)) {
      throw new NotFoundException('tag not found');
    }
    const actor = await this.actor(request, projectId);

    await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const tag = await loadTag(tx, projectId, tagId);
      if (!tag) {
        throw new NotFoundException('tag not found');
      }
      await tx.$executeRaw`DELETE FROM tag WHERE id = ${tagId}::uuid`;
      await logTreeActivity(tx, actor, 'tag.deleted', { type: 'tag', id: tagId, name: tag.name }, {
        testCases: Number(tag.test_case_count),
        bugs: Number(tag.bug_count),
      });
    });
  }
}
