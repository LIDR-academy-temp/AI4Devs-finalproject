import { PrismaClient } from '@prisma/client';
import { withUserContext } from './user-context';

export type WorkspaceRole = 'Owner' | 'Collaborator';

/** The caller's role in a workspace, or null when they aren't a member. Runs under app.user_id only. */
export async function resolveWorkspaceRole(
  prisma: PrismaClient,
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  return withUserContext(prisma, userId, async (tx) => {
    const rows = await tx.$queryRaw<{ role: WorkspaceRole }[]>`
      SELECT role FROM workspace_membership WHERE user_id = ${userId}::uuid AND workspace_id = ${workspaceId}::uuid
    `;
    return rows[0]?.role ?? null;
  });
}

/**
 * The workspace a project belongs to, trash included (project-management): restoring a
 * deleted project must still find it, unlike resolveEffectiveProjectRole. Visible only
 * through the caller's own memberships (member_visible), so null for a foreign project.
 */
export async function resolveProjectWorkspaceIncludingTrash(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
): Promise<string | null> {
  return withUserContext(prisma, userId, async (tx) => {
    const rows = await tx.$queryRaw<{ workspace_id: string }[]>`
      SELECT workspace_id FROM project WHERE id = ${projectId}::uuid
    `;
    return rows[0]?.workspace_id ?? null;
  });
}
