import { randomUUID } from 'crypto';
import { Pool, type PoolClient } from 'pg';
import { withTenantContext } from '../src/tenant-context';

/** Fixtures are written as railgun_app (the API's role), the purge runs as railgun_worker. */
export function createAppPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? 'postgresql://railgun_app:app_dev_password@localhost:5433/railgun',
  });
}

export interface WorkspaceFixture {
  workspaceId: string;
  projectId: string;
}

/** A workspace with one project, the workspace's id set as context before its own insert (RLS WITH CHECK). */
export async function createWorkspace(pool: Pool, label: string): Promise<WorkspaceFixture> {
  const workspaceId = randomUUID();
  const projectId = randomUUID();
  await withTenantContext(pool, workspaceId, async (client) => {
    await client.query('INSERT INTO workspace (id, name) VALUES ($1, $2)', [workspaceId, label]);
    await client.query('INSERT INTO project (id, workspace_id, name, slug) VALUES ($1, $2, $3, $4)', [
      projectId,
      workspaceId,
      `${label} Project`,
      `p-${projectId}`,
    ]);
  });
  return { workspaceId, projectId };
}

/** Runs fixture SQL under the workspace's tenant context, as railgun_app. */
export function inWorkspace<T>(pool: Pool, workspaceId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withTenantContext(pool, workspaceId, fn);
}

/** `deleted_at` that many days ago (plus an hour, so "31 days" is safely past the cutoff). */
export const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000 - 3_600_000);

/** A user row ("user" is only writable by itself: app.user_id must match). */
export async function addUser(pool: Pool, displayName = 'Fixture User'): Promise<string> {
  const id = randomUUID();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [id]);
    await client.query('INSERT INTO "user" (id, clerk_user_id, display_name, email) VALUES ($1, $2, $3, $4)', [
      id,
      `clerk-${id}`,
      displayName,
      `${id}@example.com`,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return id;
}

export async function setLastProject(pool: Pool, userId: string, projectId: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.user_id', $1, true)`, [userId]);
    await client.query('UPDATE "user" SET last_project_id = $2 WHERE id = $1', [userId, projectId]);
    await client.query('COMMIT');
  } finally {
    client.release();
  }
}

/** Builds rows inside one workspace; `deleted` is days in the trash, omitted = live. */
export function builder(pool: Pool, ws: WorkspaceFixture) {
  const run = <T>(fn: (client: PoolClient) => Promise<T>) => inWorkspace(pool, ws.workspaceId, fn);
  const del = (deleted?: number) => (deleted === undefined ? null : daysAgo(deleted));

  return {
    async project(name: string, deleted?: number): Promise<string> {
      const id = randomUUID();
      await run((c) =>
        c.query('INSERT INTO project (id, workspace_id, name, slug, deleted_at) VALUES ($1, $2, $3, $4, $5)', [
          id,
          ws.workspaceId,
          name,
          `p-${id}`,
          del(deleted),
        ]),
      );
      return id;
    },
    async folder(
      name: string,
      opts: { projectId?: string; parentId?: string; deleted?: number; deletionId?: string } = {},
    ): Promise<string> {
      const id = randomUUID();
      await run((c) =>
        c.query(
          `INSERT INTO folder (id, project_id, workspace_id, parent_folder_id, name, position_key, deleted_at, deletion_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, opts.projectId ?? ws.projectId, ws.workspaceId, opts.parentId ?? null, name, `k${id}`, del(opts.deleted), opts.deletionId ?? null],
        ),
      );
      return id;
    },
    async testCase(
      name: string,
      opts: { projectId?: string; folderId?: string; deleted?: number; deletionId?: string } = {},
    ): Promise<string> {
      const id = randomUUID();
      await run((c) =>
        c.query(
          `INSERT INTO test_case (id, project_id, workspace_id, folder_id, name, position_key, deleted_at, deletion_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, opts.projectId ?? ws.projectId, ws.workspaceId, opts.folderId ?? null, name, `k${id}`, del(opts.deleted), opts.deletionId ?? null],
        ),
      );
      return id;
    },
    /** An execution with one run of `testCaseId` (name snapshot taken), as Run All leaves it. */
    async execution(
      name: string,
      createdBy: string,
      opts: { projectId?: string; testCaseId?: string; deleted?: number } = {},
    ): Promise<{ executionId: string; runId: string }> {
      const executionId = randomUUID();
      const runId = randomUUID();
      await run(async (c) => {
        await c.query(
          `INSERT INTO test_execution (id, project_id, workspace_id, name, browser, viewport_width, viewport_height,
             locale, timezone, created_by, deleted_at)
           VALUES ($1, $2, $3, $4, 'Chromium', 1280, 720, 'en-US', 'UTC', $5, $6)`,
          [executionId, opts.projectId ?? ws.projectId, ws.workspaceId, name, createdBy, del(opts.deleted)],
        );
        await c.query(
          `INSERT INTO test_run (id, execution_id, workspace_id, test_case_id, position, test_case_name_snapshot)
           VALUES ($1, $2, $3, $4, 1, 'Snapshot name')`,
          [runId, executionId, ws.workspaceId, opts.testCaseId ?? null],
        );
      });
      return { executionId, runId };
    },
    async bug(
      title: string,
      reporterId: string,
      opts: { projectId?: string; testCaseId?: string; testRunId?: string; deleted?: number } = {},
    ): Promise<string> {
      const id = randomUUID();
      await run((c) =>
        c.query(
          `INSERT INTO bug (id, project_id, workspace_id, title, severity, test_case_id, test_run_id,
             reporter_id, reporter_display_name, deleted_at)
           VALUES ($1, $2, $3, $4, 'High', $5, $6, $7, 'Fixture User', $8)`,
          [id, opts.projectId ?? ws.projectId, ws.workspaceId, title, opts.testCaseId ?? null, opts.testRunId ?? null, reporterId, del(opts.deleted)],
        ),
      );
      return id;
    },
    async tag(name: string, projectId = ws.projectId): Promise<string> {
      const id = randomUUID();
      await run((c) =>
        c.query("INSERT INTO tag (id, project_id, workspace_id, name, color) VALUES ($1, $2, $3, $4, 'gray')", [
          id,
          projectId,
          ws.workspaceId,
          name,
        ]),
      );
      return id;
    },
    async environment(name: string, projectId = ws.projectId): Promise<string> {
      const id = randomUUID();
      await run((c) =>
        c.query(
          "INSERT INTO environment (id, project_id, workspace_id, name, base_url, default_browser) VALUES ($1, $2, $3, $4, 'https://x.example.com', 'Chromium')",
          [id, projectId, ws.workspaceId, name],
        ),
      );
      return id;
    },
    /** How many rows of `table` match `where` (bound to $1) in this workspace. */
    async count(table: string, where: string, param: unknown): Promise<number> {
      const { rows } = await run((c) => c.query<{ n: string }>(`SELECT count(*) AS n FROM ${table} WHERE ${where}`, [param]));
      return Number(rows[0].n);
    },
    async one<T>(sql: string, params: unknown[]): Promise<T | undefined> {
      const { rows } = await run((c) => c.query(sql, params));
      return rows[0] as T | undefined;
    },
  };
}
