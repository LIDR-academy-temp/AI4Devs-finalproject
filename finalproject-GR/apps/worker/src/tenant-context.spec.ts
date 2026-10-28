import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import { createWorkerPool } from './db';
import { listWorkspaceIds, withTenantContext } from './tenant-context';
import { createAppPool, createWorkspace, inWorkspace } from '../test/fixtures';

describe('worker tenant context (railgun_worker)', () => {
  let worker: Pool;
  let app: Pool;

  beforeAll(() => {
    worker = createWorkerPool();
    app = createAppPool();
  });

  afterAll(async () => {
    await worker.end();
    await app.end();
  });

  async function addTestCase(workspaceId: string, projectId: string): Promise<string> {
    const id = randomUUID();
    await inWorkspace(app, workspaceId, (client) =>
      client.query(
        'INSERT INTO test_case (id, project_id, workspace_id, name, position_key, deleted_at) VALUES ($1, $2, $3, $4, $5, now())',
        [id, projectId, workspaceId, 'Case', 'k0'],
      ),
    );
    return id;
  }

  it('sees no test cases without a workspace context', async () => {
    const a = await createWorkspace(app, 'TC-NoContext');
    await addTestCase(a.workspaceId, a.projectId);

    const { rows } = await worker.query('SELECT id FROM test_case');

    expect(rows).toEqual([]);
  });

  it("sees only that workspace's rows inside its context", async () => {
    const a = await createWorkspace(app, 'TC-A');
    const b = await createWorkspace(app, 'TC-B');
    const mine = await addTestCase(a.workspaceId, a.projectId);
    await addTestCase(b.workspaceId, b.projectId);

    const ids = await withTenantContext(worker, a.workspaceId, async (client) => {
      const { rows } = await client.query<{ id: string }>('SELECT id FROM test_case');
      return rows.map((row) => row.id);
    });

    expect(ids).toEqual([mine]);
  });

  it('rolls back when the callback throws', async () => {
    const a = await createWorkspace(app, 'TC-Rollback');
    const id = await addTestCase(a.workspaceId, a.projectId);

    await expect(
      withTenantContext(worker, a.workspaceId, async (client) => {
        await client.query('DELETE FROM test_case WHERE id = $1', [id]);
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    const still = await withTenantContext(worker, a.workspaceId, (client) =>
      client.query('SELECT id FROM test_case WHERE id = $1', [id]),
    );
    expect(still.rows).toHaveLength(1);
  });

  it("lists workspace ids without a context, but can't read their names", async () => {
    const a = await createWorkspace(app, 'TC-List');

    expect(await listWorkspaceIds(worker)).toContain(a.workspaceId);
    await expect(worker.query('SELECT name FROM workspace')).rejects.toThrow(/permission denied/);
  });
});
