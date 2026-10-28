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
import { RequireWorkspaceOwner, WorkspaceOwnerGuard } from '../common/workspace-owner.guard';
import type { ProjectRole } from '../common/project-role';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { withUserContext } from '../common/user-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import { log } from '../common/activity-logger';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import { loadActorDisplayName } from '../executions/execution-queries';
import { isUniqueViolation } from '../folders/folder-queries';
import { deriveSlug, parseName, uniqueSlug } from './project-rules';

interface ProjectRow {
  id: string;
  name: string;
  slug: string;
}

interface ProjectResponse extends ProjectRow {
  role: ProjectRole;
}

interface Actor {
  workspaceId: string;
  userId: string;
  displayName: string | null;
}

/** Writes one `Projects` activity entry in the caller's transaction (ADR 0007). */
function logProjectActivity(
  tx: Prisma.TransactionClient,
  actor: Actor,
  actionCode: string,
  project: ProjectRow,
  details?: Record<string, unknown>,
): Promise<void> {
  return log(tx, {
    workspaceId: actor.workspaceId,
    projectId: project.id,
    actorUserId: actor.userId,
    actorDisplayName: actor.displayName,
    actionCode,
    entityType: 'project',
    entityId: project.id,
    entityName: project.name,
    category: 'Projects',
    details,
  });
}

/** A workspace's projects (specs/project-management). */
@Controller('projects')
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(userId: string, workspaceId: string): Promise<Actor> {
    return { workspaceId, userId, displayName: await loadActorDisplayName(this.prisma, userId) };
  }

  /** The live projects in the active workspace that grant the caller a role (the switcher). */
  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<ProjectResponse[]> {
    const { userId, workspaceId } = request.auth!;
    return withUserContext(this.prisma, userId, (tx) =>
      tx.$queryRaw<ProjectResponse[]>`
        SELECT p.id, p.name, p.slug, CASE WHEN wm.role = 'Owner' THEN 'Admin' ELSE pm.role END AS role
        FROM project p
        JOIN workspace_membership wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ${userId}::uuid
        LEFT JOIN project_membership pm ON pm.project_id = p.id AND pm.user_id = ${userId}::uuid
        WHERE p.workspace_id = ${workspaceId}::uuid AND p.deleted_at IS NULL
          AND (wm.role = 'Owner' OR pm.role IS NOT NULL)
        ORDER BY lower(p.name), p.id
      `,
    );
  }

  @Get(':projectId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async getProject(
    @Param('projectId') projectId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectResponse> {
    // ProjectRoleGuard already proved the caller has at least Viewer access, which
    // requires them to be a member of the project's workspace — so the same
    // member_visible-backed lookup, under the caller's own user context, finds the row.
    const rows = await withUserContext(this.prisma, request.auth!.userId, (tx) =>
      tx.$queryRaw<ProjectRow[]>`SELECT id, name, slug FROM project WHERE id = ${projectId}::uuid`,
    );
    // ProjectRoleGuard already resolved and stored the caller's effective role
    // (frontend-bootstrap) — surfaced here so a client can gate its own UI without a
    // second request.
    return { ...rows[0], role: request.auth!.projectRole! };
  }

  /**
   * Owner only. The slug is derived once from the name, with the lowest free suffix —
   * trashed projects' slugs count, as the unique constraint does. A concurrent create
   * taking the same slug fails the constraint; one retry rereads, then 409.
   */
  @Post()
  @UseGuards(WorkspaceOwnerGuard)
  @RequireWorkspaceOwner()
  async create(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<ProjectResponse> {
    const name = parseName(body?.name);
    const actor = await this.actor(request.auth!.userId, request.auth!.ownedWorkspaceId!);
    const base = deriveSlug(name);

    for (let attempt = 0; ; attempt++) {
      try {
        return await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
          const rows = await tx.$queryRaw<{ slug: string }[]>`
            SELECT slug FROM project
            WHERE workspace_id = ${actor.workspaceId}::uuid AND (slug = ${base} OR slug ~ ${`^${base}-[0-9]+$`})
          `;
          const slug = uniqueSlug(base, new Set(rows.map((row) => row.slug)));
          const [created] = await tx.$queryRaw<ProjectRow[]>`
            INSERT INTO project (workspace_id, name, slug)
            VALUES (${actor.workspaceId}::uuid, ${name}, ${slug})
            RETURNING id, name, slug
          `;
          await logProjectActivity(tx, actor, 'project.created', created, { slug });
          return { ...created, role: 'Admin' as const };
        });
      } catch (error) {
        if (!isUniqueViolation(error)) {
          throw error;
        }
        if (attempt > 0) {
          throw new ConflictException('another project took this slug at the same time; try again');
        }
      }
    }
  }

  @Patch(':projectId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async rename(
    @Param('projectId') projectId: string,
    @Body() body: Record<string, unknown>,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProjectResponse> {
    const name = parseName(body?.name);
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    const actor = await this.actor(request.auth!.userId, workspaceId);

    const project = await withTenantContext(this.prisma, workspaceId, async (tx) => {
      const [before] = await tx.$queryRaw<ProjectRow[]>`
        SELECT id, name, slug FROM project WHERE id = ${projectId}::uuid FOR UPDATE
      `;
      if (before.name === name) {
        return before;
      }
      const [after] = await tx.$queryRaw<ProjectRow[]>`
        UPDATE project SET name = ${name} WHERE id = ${projectId}::uuid RETURNING id, name, slug
      `;
      await logProjectActivity(tx, actor, 'project.renamed', after, { from: before.name, to: name });
      return after;
    });
    return { ...project, role: request.auth!.projectRole! };
  }

  /**
   * Owner only; moves the project to the trash with everything in it. The live projects
   * are locked first, so two concurrent deletes can't remove the last two (design.md
   * decision 6): the second one sees a single live project and gets 409.
   */
  @Delete(':projectId')
  @HttpCode(204)
  @UseGuards(WorkspaceOwnerGuard)
  @RequireWorkspaceOwner()
  async remove(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<void> {
    const actor = await this.actor(request.auth!.userId, request.auth!.ownedWorkspaceId!);

    await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const live = await tx.$queryRaw<ProjectRow[]>`
        SELECT id, name, slug FROM project
        WHERE workspace_id = ${actor.workspaceId}::uuid AND deleted_at IS NULL
        ORDER BY id
        FOR UPDATE
      `;
      const target = live.find((project) => project.id === projectId);
      if (!target) {
        throw new NotFoundException('project not found');
      }
      if (live.length === 1) {
        throw new ConflictException('the last project in a workspace cannot be deleted');
      }
      await tx.$executeRaw`
        UPDATE project SET deleted_at = now(), deleted_by = ${actor.userId}::uuid WHERE id = ${projectId}::uuid
      `;
      await logProjectActivity(tx, actor, 'project.deleted', target);
    });
  }

  @Post(':projectId/restore')
  @UseGuards(WorkspaceOwnerGuard)
  @RequireWorkspaceOwner()
  async restore(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<ProjectResponse> {
    const actor = await this.actor(request.auth!.userId, request.auth!.ownedWorkspaceId!);

    const project = await withTenantContext(this.prisma, actor.workspaceId, async (tx) => {
      const [row] = await tx.$queryRaw<(ProjectRow & { deleted_at: Date | null })[]>`
        SELECT id, name, slug, deleted_at FROM project WHERE id = ${projectId}::uuid FOR UPDATE
      `;
      if (!row.deleted_at) {
        throw new ConflictException('project is not in the trash');
      }
      await tx.$executeRaw`UPDATE project SET deleted_at = NULL, deleted_by = NULL WHERE id = ${projectId}::uuid`;
      const restored = { id: row.id, name: row.name, slug: row.slug };
      await logProjectActivity(tx, actor, 'project.restored', restored);
      return restored;
    });
    return { ...project, role: 'Admin' };
  }
}
