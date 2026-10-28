import { PrismaClient } from '@prisma/client';
import { withUserContext } from './user-context';

/**
 * Resolves the workspace a project belongs to, via the caller's own membership
 * (member_visible, from project-authorization). Callers of this function have
 * already passed ProjectRoleGuard, so they're known to have at least the role it
 * required — this just avoids a second round trip through resolveEffectiveProjectRole
 * for the workspace_id it already looked up internally.
 */
export async function resolveProjectWorkspaceId(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
): Promise<string> {
  return withUserContext(prisma, userId, async (tx) => {
    const rows = await tx.$queryRaw<{ workspace_id: string }[]>`
      SELECT workspace_id FROM project WHERE id = ${projectId}::uuid
    `;
    return rows[0].workspace_id;
  });
}
