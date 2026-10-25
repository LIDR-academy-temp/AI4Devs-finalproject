import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';

/**
 * Not withUserContext (deliberately not built in this change — design.md). Just enough
 * to satisfy the user table's own bootstrap requirement for this one test's fixture.
 */
async function insertTestUser(prisma: PrismaClient, clerkUserId: string, displayName: string): Promise<string> {
  const userId = randomUUID();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    await tx.$executeRaw`INSERT INTO "user" (id, clerk_user_id, display_name, email)
      VALUES (${userId}::uuid, ${clerkUserId}, ${displayName}, ${`${clerkUserId}@example.com`})`;
  });
  return userId;
}

describe('project_membership composite foreign key (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a membership row whose workspace_id doesn't match its project's real workspace_id", async () => {
    const a = await createWorkspaceWithProject(prisma, `Fk-A-${randomUUID().slice(0, 8)}`);
    const b = await createWorkspaceWithProject(prisma, `Fk-B-${randomUUID().slice(0, 8)}`);
    const userId = await insertTestUser(prisma, `clerk-${randomUUID()}`, 'FK Test User');

    // Context matches the row's own workspace_id (b), so RLS's own check passes —
    // isolating the composite FK as the one thing that can still reject this insert:
    // project a.projectId's real workspace_id is a.workspaceId, not b.workspaceId.
    await expect(
      withTenantContext(prisma, b.workspaceId, (tx) =>
        tx.$executeRaw`INSERT INTO project_membership (id, project_id, workspace_id, user_id, role)
          VALUES (${randomUUID()}::uuid, ${a.projectId}::uuid, ${b.workspaceId}::uuid, ${userId}::uuid, 'Contributor')`,
      ),
    ).rejects.toThrow();
  });
});
