import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';
import { log } from '../src/common/activity-logger';

describe('ActivityLogger.log (e2e, no foreign keys)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('an entry survives deletion of the row it describes', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Act-Del-${randomUUID().slice(0, 8)}`);

    await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      log(tx, {
        workspaceId: fixture.workspaceId,
        projectId: fixture.projectId,
        actionCode: 'project.created',
        entityType: 'project',
        entityId: fixture.projectId,
        entityName: 'Original Name Snapshot',
        category: 'Projects',
      }),
    );

    // Delete the project the entry describes — no FK means this cannot cascade into the log.
    await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      tx.$executeRaw`DELETE FROM project WHERE id = ${fixture.projectId}::uuid`,
    );

    const entries = await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      tx.$queryRaw<
        { entity_name: string }[]
      >`SELECT entity_name FROM activity_entries WHERE entity_id = ${fixture.projectId}::uuid`,
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].entity_name).toBe('Original Name Snapshot');
  });
});
