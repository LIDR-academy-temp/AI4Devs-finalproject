import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { withUserContext } from '../src/common/user-context';
import { withTenantContext } from '../src/common/tenant-context';
import { provisionIdentity } from '../src/common/provision-identity';

describe('provisionIdentity (e2e)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function countByClerkId(clerkUserId: string): Promise<number> {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.clerk_user_id', ${clerkUserId}, true)`;
      return tx.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM "user" WHERE clerk_user_id = ${clerkUserId}`;
    });
    return Number(rows[0].count);
  }

  it('creates exactly one user, workspace, Owner membership, and default project on first contact', async () => {
    const clerkUserId = `clerk-prov-${randomUUID()}`;

    const result = await provisionIdentity(prisma, clerkUserId, 'ada@example.com', 'Ada Lovelace');

    expect(result.created).toBe(true);
    expect(await countByClerkId(clerkUserId)).toBe(1);

    const membershipCount = await withUserContext(prisma, result.userId, (tx) =>
      tx.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM workspace_membership
        WHERE user_id = ${result.userId}::uuid AND workspace_id = ${result.workspaceId}::uuid AND role = 'Owner'
      `,
    );
    expect(Number(membershipCount[0].count)).toBe(1);

    const dekCount = await withTenantContext(prisma, result.workspaceId, (tx) =>
      tx.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM workspace_dek WHERE workspace_id = ${result.workspaceId}::uuid
      `,
    );
    expect(Number(dekCount[0].count)).toBe(1);

    const projectRows = await withTenantContext(prisma, result.workspaceId, (tx) =>
      tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM project WHERE workspace_id = ${result.workspaceId}::uuid
      `,
    );
    expect(projectRows).toEqual([{ id: result.projectId }]);
  });

  it('is idempotent: a repeat call creates nothing new and returns the same workspace and project', async () => {
    const clerkUserId = `clerk-prov-${randomUUID()}`;

    const first = await provisionIdentity(prisma, clerkUserId, 'grace@example.com', 'Grace Hopper');
    const second = await provisionIdentity(prisma, clerkUserId, 'grace@example.com', 'Grace Hopper');

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.userId).toBe(first.userId);
    expect(second.workspaceId).toBe(first.workspaceId);
    expect(second.projectId).toBe(first.projectId);
    expect(await countByClerkId(clerkUserId)).toBe(1);

    const projectCount = await withTenantContext(prisma, first.workspaceId, (tx) =>
      tx.$queryRaw<{ count: bigint }[]>`
        SELECT count(*) FROM project WHERE workspace_id = ${first.workspaceId}::uuid
      `,
    );
    expect(Number(projectCount[0].count)).toBe(1);
  });

  it('resolves an existing user whose only membership is Collaborator (project-authorization correction)', async () => {
    const clerkUserId = `clerk-prov-collab-${randomUUID()}`;
    const workspaceId = randomUUID();

    // Simulate a user who exists but, unlike provisionIdentity's own "create" branch,
    // was never made an Owner anywhere — e.g. a future invitation-acceptance path.
    const userId = await prisma.$transaction(async (tx) => {
      const newUserId = randomUUID();
      await tx.$executeRaw`SELECT set_config('app.user_id', ${newUserId}, true)`;
      await tx.$executeRaw`INSERT INTO "user" (id, clerk_user_id, display_name, email)
        VALUES (${newUserId}::uuid, ${clerkUserId}, 'Collaborator Only', 'collab-only@example.com')`;
      return newUserId;
    });
    const projectId = randomUUID();
    await withTenantContext(prisma, workspaceId, async (tx) => {
      await tx.$executeRaw`INSERT INTO workspace (id, name) VALUES (${workspaceId}::uuid, 'Some Other Workspace')`;
      await tx.$executeRaw`INSERT INTO project (id, workspace_id, name, slug)
        VALUES (${projectId}::uuid, ${workspaceId}::uuid, 'Some Other Project', 'some-other-project')`;
      await tx.$executeRaw`INSERT INTO workspace_membership (workspace_id, user_id, role)
        VALUES (${workspaceId}::uuid, ${userId}::uuid, 'Collaborator')`;
    });

    const result = await provisionIdentity(prisma, clerkUserId, 'collab-only@example.com', 'Collaborator Only');

    expect(result.created).toBe(false);
    expect(result.userId).toBe(userId);
    expect(result.workspaceId).toBe(workspaceId);
    expect(result.projectId).toBe(projectId);
  });
});
