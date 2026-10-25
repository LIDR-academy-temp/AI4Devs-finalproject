import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { withTenantContext } from '../../src/common/tenant-context';

/** Not withUserContext's own bootstrap — same inline pattern used throughout prior changes' tests. */
export async function insertTestUser(prisma: PrismaClient, clerkUserId: string, displayName: string): Promise<string> {
  const userId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    await tx.$executeRaw`INSERT INTO "user" (id, clerk_user_id, display_name, email)
      VALUES (${userId}::uuid, ${clerkUserId}, ${displayName}, ${`${clerkUserId}@example.com`})`;
  });
  return userId;
}

export async function insertWorkspaceMembership(
  prisma: PrismaClient,
  workspaceId: string,
  userId: string,
  role: string,
): Promise<void> {
  await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$executeRaw`INSERT INTO workspace_membership (workspace_id, user_id, role)
      VALUES (${workspaceId}::uuid, ${userId}::uuid, ${role})`,
  );
}

export async function insertProjectMembership(
  prisma: PrismaClient,
  workspaceId: string,
  projectId: string,
  userId: string,
  role: string,
): Promise<void> {
  await withTenantContext(prisma, workspaceId, (tx) =>
    tx.$executeRaw`INSERT INTO project_membership (project_id, workspace_id, user_id, role)
      VALUES (${projectId}::uuid, ${workspaceId}::uuid, ${userId}::uuid, ${role})`,
  );
}
