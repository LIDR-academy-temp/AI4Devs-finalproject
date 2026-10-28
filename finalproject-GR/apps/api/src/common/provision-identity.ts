import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createWorkspaceDek } from './secrets-encryption';

export interface ProvisionedIdentity {
  userId: string;
  workspaceId: string;
  projectId: string;
  created: boolean;
}

/**
 * Resolves a Clerk identity to a user/workspace/Owner-membership, creating them on
 * first contact (ADR 0002's atomic sign-up). Manages its own transaction directly —
 * not a composition of withUserContext/withTenantContext, since those each open their
 * own transaction and this needs app.user_id and app.workspace_id set within one.
 */
export async function provisionIdentity(
  prisma: PrismaClient,
  clerkUserId: string,
  email: string,
  displayName: string,
): Promise<ProvisionedIdentity> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`;

    const existing = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "user" WHERE clerk_user_id = ${clerkUserId}
    `;

    if (existing.length > 0) {
      const userId = existing[0].id;
      await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
      // The active project (ADR 0017): the last one switched to, while it's live and
      // accessible; otherwise the oldest accessible live project, oldest workspace first.
      // A stale last_project_id is simply outranked, never cleared — reads stay read-only.
      const accessible = await tx.$queryRaw<{ id: string; workspace_id: string }[]>`
        SELECT p.id, p.workspace_id
        FROM project p
        JOIN workspace_membership wm ON wm.workspace_id = p.workspace_id AND wm.user_id = ${userId}::uuid
        JOIN "user" u ON u.id = ${userId}::uuid
        WHERE p.deleted_at IS NULL
          AND (wm.role = 'Owner' OR EXISTS (
            SELECT 1 FROM project_membership pm WHERE pm.project_id = p.id AND pm.user_id = ${userId}::uuid
          ))
        ORDER BY (p.id IS NOT DISTINCT FROM u.last_project_id) DESC, wm.created_at ASC, p.created_at ASC
        LIMIT 1
      `;
      if (accessible.length > 0) {
        return { userId, workspaceId: accessible[0].workspace_id, projectId: accessible[0].id, created: false };
      }

      // Nothing accessible: the oldest workspace's oldest live project, which the web app
      // shows as access denied. Any membership, not just Owner — an existing user can be
      // Collaborator-only (project-authorization's tests are the first to exercise that case).
      const membership = await tx.$queryRaw<{ workspace_id: string }[]>`
        SELECT workspace_id FROM workspace_membership
        WHERE user_id = ${userId}::uuid
        ORDER BY created_at ASC
        LIMIT 1
      `;
      if (membership.length === 0) {
        throw new Error(`User ${userId} has no workspace_membership row at all — cannot resolve a workspace`);
      }
      const workspaceId = membership[0].workspace_id;
      const project = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM project WHERE workspace_id = ${workspaceId}::uuid AND deleted_at IS NULL
        ORDER BY created_at ASC LIMIT 1
      `;
      if (project.length === 0) {
        throw new Error(`Workspace ${workspaceId} has no live project at all — cannot resolve a default project`);
      }
      return { userId, workspaceId, projectId: project[0].id, created: false };
    }

    const userId = randomUUID();
    const workspaceId = randomUUID();
    const projectId = randomUUID();
    const workspaceName = `${displayName}'s Workspace`;

    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    await tx.$executeRaw`
      INSERT INTO "user" (id, clerk_user_id, display_name, email)
      VALUES (${userId}::uuid, ${clerkUserId}, ${displayName}, ${email})
    `;

    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;
    await tx.$executeRaw`
      INSERT INTO workspace (id, name) VALUES (${workspaceId}::uuid, ${workspaceName})
    `;
    // Every workspace gets its own DEK at creation (secrets-encryption) — no retrofit
    // needed once a secret-holding feature starts writing rows.
    await createWorkspaceDek(tx, workspaceId);

    // Every workspace gets one project at creation (frontend-bootstrap), so a new user
    // always has something to land on; Owners create more from the app (project-management).
    await tx.$executeRaw`
      INSERT INTO project (id, workspace_id, name, slug)
      VALUES (${projectId}::uuid, ${workspaceId}::uuid, 'My First Project', 'my-first-project')
    `;

    await tx.$executeRaw`
      INSERT INTO workspace_membership (workspace_id, user_id, role)
      VALUES (${workspaceId}::uuid, ${userId}::uuid, 'Owner')
    `;

    return { userId, workspaceId, projectId, created: true };
  });
}
