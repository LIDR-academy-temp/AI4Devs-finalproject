import { PrismaClient } from '@prisma/client';

/** The target user can't be resolved (never signed in, or no membership/project). */
export class SeedTargetError extends Error {}

export interface SeedTarget {
  userId: string;
  displayName: string;
  workspaceId: string;
  projectId: string;
}

/**
 * Read-only version of provisionIdentity's lookup (design.md decision 2): Clerk id →
 * user → oldest workspace membership → oldest live project. Deliberately not the user's
 * last active project (ADR 0017): a fixed target keeps reruns idempotent.
 */
export async function resolveSeedTarget(prisma: PrismaClient, clerkUserId: string): Promise<SeedTarget> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`;
    const [user] = await tx.$queryRaw<{ id: string; display_name: string }[]>`
      SELECT id, display_name FROM "user" WHERE clerk_user_id = ${clerkUserId}
    `;
    if (!user) {
      throw new SeedTargetError(`Clerk user ${clerkUserId} has never signed in to the app; sign in once, then seed`);
    }
    await tx.$executeRaw`SELECT set_config('app.user_id', ${user.id}, true)`;
    const [membership] = await tx.$queryRaw<{ workspace_id: string }[]>`
      SELECT workspace_id FROM workspace_membership WHERE user_id = ${user.id}::uuid ORDER BY created_at ASC LIMIT 1
    `;
    if (!membership) {
      throw new SeedTargetError(`User ${user.id} has no workspace`);
    }
    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${membership.workspace_id}, true)`;
    const [project] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM project WHERE workspace_id = ${membership.workspace_id}::uuid AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1
    `;
    if (!project) {
      throw new SeedTargetError(`Workspace ${membership.workspace_id} has no project`);
    }
    return { userId: user.id, displayName: user.display_name, workspaceId: membership.workspace_id, projectId: project.id };
  });
}
