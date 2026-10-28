import { Body, Controller, ForbiddenException, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { log } from '../common/activity-logger';
import { RequireWorkspaceOwner, WorkspaceOwnerGuard } from '../common/workspace-owner.guard';
import { resolveWorkspaceRole, type WorkspaceRole } from '../common/workspace-role';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';
import { loadActorDisplayName } from '../executions/execution-queries';
import { parseName } from '../projects/project-rules';

/** ADR 0007: items in the trash are removed for good after this many days. */
const TRASH_RETENTION_DAYS = 30;

interface WorkspaceResponse {
  id: string;
  name: string;
  role: WorkspaceRole;
}

interface ProjectOverviewRow {
  id: string;
  name: string;
  slug: string;
  test_case_count: bigint;
  execution_count: bigint;
}

interface DeletedProjectRow {
  id: string;
  name: string;
  deleted_at: Date;
  deleted_by_id: string | null;
  deleted_by_name: string | null;
  days_since: number;
}

export interface WorkspaceProjectsResponse {
  projects: { id: string; name: string; slug: string; testCaseCount: number; executionCount: number }[];
  deleted: {
    id: string;
    name: string;
    deletedAt: string;
    deletedBy: { id: string; displayName: string } | null;
    daysLeft: number;
  }[];
}

/** The caller's active workspace (specs/workspace-administration). */
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async get(@Req() request: AuthenticatedRequest): Promise<WorkspaceResponse> {
    const { userId, workspaceId } = request.auth!;
    const role = await resolveWorkspaceRole(this.prisma, userId, workspaceId);
    if (!role) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    const [workspace] = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ name: string }[]>`SELECT name FROM workspace WHERE id = ${workspaceId}::uuid`,
    );
    return { id: workspaceId, name: workspace.name, role };
  }

  @Patch()
  @UseGuards(WorkspaceOwnerGuard)
  @RequireWorkspaceOwner()
  async rename(@Body() body: Record<string, unknown>, @Req() request: AuthenticatedRequest): Promise<WorkspaceResponse> {
    const name = parseName(body?.name);
    const { userId } = request.auth!;
    const workspaceId = request.auth!.ownedWorkspaceId!;
    const displayName = await loadActorDisplayName(this.prisma, userId);

    await withTenantContext(this.prisma, workspaceId, async (tx) => {
      const [before] = await tx.$queryRaw<{ name: string }[]>`
        SELECT name FROM workspace WHERE id = ${workspaceId}::uuid FOR UPDATE
      `;
      if (before.name === name) {
        return;
      }
      await tx.$executeRaw`UPDATE workspace SET name = ${name} WHERE id = ${workspaceId}::uuid`;
      await log(tx, {
        workspaceId,
        projectId: null,
        actorUserId: userId,
        actorDisplayName: displayName,
        actionCode: 'workspace.renamed',
        entityType: 'workspace',
        entityId: workspaceId,
        entityName: name,
        category: 'Workspace',
        details: { from: before.name, to: name },
      });
    });
    return { id: workspaceId, name, role: 'Owner' };
  }

  /**
   * Every live project with its live test case and execution counts (scalar subqueries,
   * as for tag counts), and the projects in the trash with the days left before removal.
   * Until the purge job exists (Phase 6), projects past 30 days stay with 0 days left.
   */
  @Get('projects')
  @UseGuards(WorkspaceOwnerGuard)
  @RequireWorkspaceOwner()
  async projects(@Req() request: AuthenticatedRequest): Promise<WorkspaceProjectsResponse> {
    const workspaceId = request.auth!.ownedWorkspaceId!;
    return withTenantContext(this.prisma, workspaceId, async (tx) => {
      const live = await tx.$queryRaw<ProjectOverviewRow[]>`
        SELECT p.id, p.name, p.slug,
          (SELECT COUNT(*) FROM test_case tc WHERE tc.project_id = p.id AND tc.deleted_at IS NULL) AS test_case_count,
          (SELECT COUNT(*) FROM test_execution te WHERE te.project_id = p.id AND te.deleted_at IS NULL) AS execution_count
        FROM project p
        WHERE p.workspace_id = ${workspaceId}::uuid AND p.deleted_at IS NULL
        ORDER BY lower(p.name), p.id
      `;
      // "user" rows are only self-visible under RLS, so the deleter's name comes from the
      // deletion's activity entry, which snapshots it (ADR 0007).
      const deleted = await tx.$queryRaw<DeletedProjectRow[]>`
        SELECT p.id, p.name, p.deleted_at, p.deleted_by AS deleted_by_id,
          (SELECT ae.actor_display_name FROM activity_entries ae
            WHERE ae.entity_id = p.id AND ae.action_code = 'project.deleted'
            ORDER BY ae.created_at DESC LIMIT 1) AS deleted_by_name,
          floor(extract(epoch FROM now() - p.deleted_at) / 86400)::int AS days_since
        FROM project p
        WHERE p.workspace_id = ${workspaceId}::uuid AND p.deleted_at IS NOT NULL
        ORDER BY p.deleted_at DESC, p.id
      `;
      return {
        projects: live.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          testCaseCount: Number(row.test_case_count),
          executionCount: Number(row.execution_count),
        })),
        deleted: deleted.map((row) => ({
          id: row.id,
          name: row.name,
          deletedAt: row.deleted_at.toISOString(),
          deletedBy: row.deleted_by_id ? { id: row.deleted_by_id, displayName: row.deleted_by_name ?? 'Former member' } : null,
          daysLeft: Math.max(0, TRASH_RETENTION_DAYS - row.days_since),
        })),
      };
    });
  }
}
