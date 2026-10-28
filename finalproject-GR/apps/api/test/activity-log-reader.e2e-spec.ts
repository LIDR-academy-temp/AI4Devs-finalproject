import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createTestPrismaClient } from './helpers/prisma-test-client';
import { createWorkspaceWithProject } from './helpers/cross-tenant-harness';
import { withTenantContext } from '../src/common/tenant-context';
import { listActivityEntries } from '../src/common/activity-log-reader';

describe('listActivityEntries (e2e, keyset pagination)', () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    prisma = createTestPrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('pages past a cursor, returning only strictly older entries in descending order', async () => {
    const fixture = await createWorkspaceWithProject(prisma, `Act-Page-${randomUUID().slice(0, 8)}`);

    // Five entries, 1 minute apart, oldest first, with explicit created_at so ordering
    // is deterministic regardless of how fast the inserts actually run.
    const base = new Date('2026-01-01T00:00:00Z');
    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: randomUUID(),
      createdAt: new Date(base.getTime() + i * 60_000),
      name: `Entry ${i}`,
    }));

    await withTenantContext(prisma, fixture.workspaceId, async (tx) => {
      for (const e of entries) {
        await tx.$executeRaw`
          INSERT INTO activity_entries (id, workspace_id, project_id, action_code, entity_type, entity_id, entity_name, category, created_at)
          VALUES (${e.id}::uuid, ${fixture.workspaceId}::uuid, ${fixture.projectId}::uuid, 'test.seed', 'project', ${fixture.projectId}::uuid, ${e.name}, 'Projects', ${e.createdAt})
        `;
      }
    });

    // First page: newest first.
    const firstPage = await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      listActivityEntries(tx, { workspaceId: fixture.workspaceId, projectId: fixture.projectId, limit: 2 }),
    );
    expect(firstPage.map((r) => r.entity_name)).toEqual(['Entry 4', 'Entry 3']);

    // Page past the last row of the first page — only strictly older entries.
    const lastOfFirstPage = firstPage[firstPage.length - 1];
    const secondPage = await withTenantContext(prisma, fixture.workspaceId, (tx) =>
      listActivityEntries(tx, {
        workspaceId: fixture.workspaceId,
        projectId: fixture.projectId,
        after: { createdAt: lastOfFirstPage.created_at, id: lastOfFirstPage.id },
        limit: 10,
      }),
    );
    expect(secondPage.map((r) => r.entity_name)).toEqual(['Entry 2', 'Entry 1', 'Entry 0']);
  });
});
