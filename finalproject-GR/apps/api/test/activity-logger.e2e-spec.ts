import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';
import { log } from '../src/common/activity-logger';

describe('ActivityLogger.log (e2e, commit/rollback atomicity)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function countEntries(workspaceId: string, entityId: string): Promise<number> {
    const rows = await withTenantContext(prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM activity_entries WHERE entity_id = ${entityId}::uuid`,
    );
    return Number(rows[0].count);
  }

  it('a rolled-back transaction leaves no entry', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Act-RB-${randomUUID().slice(0, 8)}`);

    await expect(
      withTenantContext(prisma, fixture.workspaceId, async (tx) => {
        await log(tx, {
          workspaceId: fixture.workspaceId,
          projectId: fixture.projectId,
          actionCode: 'project.renamed',
          entityType: 'project',
          entityId: fixture.projectId,
          entityName: 'Will not survive',
          category: 'Projects',
        });
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');

    expect(await countEntries(fixture.workspaceId, fixture.projectId)).toBe(0);
  });

  it('a committed transaction leaves exactly one entry', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Act-OK-${randomUUID().slice(0, 8)}`);

    await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      log(tx, {
        workspaceId: fixture.workspaceId,
        projectId: fixture.projectId,
        actionCode: 'project.renamed',
        entityType: 'project',
        entityId: fixture.projectId,
        entityName: 'Survives',
        category: 'Projects',
      }),
    );

    expect(await countEntries(fixture.workspaceId, fixture.projectId)).toBe(1);
  });
});
