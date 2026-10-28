import { PrismaClient } from '@prisma/client';
import { withUserContext } from './user-context';

export type ProjectRole = 'Viewer' | 'Contributor' | 'Admin';

export const ROLE_RANK: Record<ProjectRole, number> = { Viewer: 0, Contributor: 1, Admin: 2 };

/**
 * Combines workspace-level Owner status and any explicit project_membership row into
 * one effective role (ADR 0002 — authorization is application logic, never RLS).
 * Runs entirely under app.user_id (no app.workspace_id needed) thanks to the
 * SELECT-only policies added in this change (design.md).
 */
export async function resolveEffectiveProjectRole(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
): Promise<ProjectRole | null> {
  return withUserContext(prisma, userId, async (tx) => {
    // A project in the trash grants nobody a role, Owners included (project-management),
    // so every project-scoped route is closed until it's restored.
    const project = await tx.$queryRaw<{ workspace_id: string }[]>`
      SELECT workspace_id FROM project WHERE id = ${projectId}::uuid AND deleted_at IS NULL
    `;
    if (project.length === 0) {
      return null;
    }

    const owner = await tx.$queryRaw<{ role: string }[]>`
      SELECT role FROM workspace_membership
      WHERE user_id = ${userId}::uuid AND workspace_id = ${project[0].workspace_id}::uuid AND role = 'Owner'
    `;
    if (owner.length > 0) {
      return 'Admin';
    }

    const membership = await tx.$queryRaw<{ role: string }[]>`
      SELECT role FROM project_membership WHERE user_id = ${userId}::uuid AND project_id = ${projectId}::uuid
    `;
    return (membership[0]?.role as ProjectRole | undefined) ?? null;
  });
}
