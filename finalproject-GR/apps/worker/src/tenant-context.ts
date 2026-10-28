import type { Pool, PoolClient } from 'pg';

/**
 * ADR 0008's contract on a pg client: one transaction, app.workspace_id set inside it,
 * the caller's queries run in that same transaction, so RLS scopes every one of them.
 * Rolls back and rethrows on any error.
 */
export async function withTenantContext<T>(
  pool: Pool,
  workspaceId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.workspace_id', $1, true)`, [workspaceId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Every workspace's id. The worker's role sees workspace ids (and nothing else) without a
 * tenant context — migration 0014's column grant and worker_list_workspaces policy.
 */
export async function listWorkspaceIds(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>('SELECT id FROM workspace ORDER BY id');
  return rows.map((row) => row.id);
}
