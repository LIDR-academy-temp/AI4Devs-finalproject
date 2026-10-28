import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import { createWorkerPool } from '../db';
import { runOnce } from 'graphile-worker';
import { purgeTrash } from './trash-purge';
import { createTaskList } from '.';
import { addUser, builder, createAppPool, createWorkspace, setLastProject } from '../../test/fixtures';

/**
 * Fixtures are written as railgun_app; the purge runs as railgun_worker. purgeTrash visits
 * every workspace on the dev database, so assertions stay on this test's own rows.
 */
describe('trash purge', () => {
  let app: Pool;
  let worker: Pool;

  beforeAll(() => {
    app = createAppPool();
    worker = createWorkerPool();
  });

  afterAll(async () => {
    await app.end();
    await worker.end();
  });

  async function setUp(label: string) {
    const ws = await createWorkspace(app, `${label}-${randomUUID().slice(0, 8)}`);
    const user = await addUser(app);
    const purge = () => purgeTrash(worker, { workspaceIds: [ws.workspaceId] });
    return { ws, user, b: builder(app, ws), purge };
  }

  async function entriesFor(b: ReturnType<typeof builder>, entityId: string) {
    return b
      .count('activity_entries', 'entity_id = $1', entityId)
      .then(async (n) => ({
        n,
        last: await b.one<{ action_code: string; actor_user_id: string | null; actor_display_name: string | null; entity_name: string; details: unknown }>(
          'SELECT action_code, actor_user_id, actor_display_name, entity_name, details FROM activity_entries WHERE entity_id = $1 ORDER BY created_at DESC LIMIT 1',
          [entityId],
        ),
      }));
  }

  it('removes a bug 31 days in the trash and keeps one 29 days in, logging the removal once with no actor', async () => {
    const { b, user, purge } = await setUp('Purge-Bugs');
    const old = await b.bug('Old bug', user, { deleted: 31 });
    const recent = await b.bug('Recent bug', user, { deleted: 29 });
    const live = await b.bug('Live bug', user);

    await purge();

    expect(await b.count('bug', 'id = $1', old)).toBe(0);
    expect(await b.count('bug', 'id = $1', recent)).toBe(1);
    expect(await b.count('bug', 'id = $1', live)).toBe(1);
    const log = await entriesFor(b, old);
    expect(log.n).toBe(1);
    expect(log.last).toMatchObject({
      action_code: 'bug.purged',
      actor_user_id: null,
      actor_display_name: null,
      entity_name: 'Old bug',
    });
  });

  it('leaves a workspace with nothing due untouched', async () => {
    const { b, user, purge } = await setUp('Purge-Live');
    const tc = await b.testCase('Live case');
    const tcRecent = await b.testCase('Recently deleted', { deleted: 10 });
    await b.execution('Live run', user, { testCaseId: tc });

    await purge();

    expect(await b.count('test_case', 'id = ANY($1::uuid[])', [tc, tcRecent])).toBe(2);
    expect(await b.count('activity_entries', 'entity_id = ANY($1::uuid[])', [tc, tcRecent])).toBe(0);
  });

  it('removes a project 31 days in the trash with everything in it, and clears it as last active project', async () => {
    const { ws, b, user, purge } = await setUp('Purge-Project');
    const doomed = await b.project('Old App', 31);
    const tc = await b.testCase('Case', { projectId: doomed });
    const { executionId } = await b.execution('Run', user, { projectId: doomed, testCaseId: tc });
    const bug = await b.bug('Bug', user, { projectId: doomed });
    const tag = await b.tag('smoke', doomed);
    const env = await b.environment('Staging', doomed);
    await setLastProject(app, user, doomed);
    const keptCase = await b.testCase('Kept', { projectId: ws.projectId });

    await purge();

    expect(await b.count('project', 'id = $1', doomed)).toBe(0);
    expect(await b.count('test_case', 'id = $1', tc)).toBe(0);
    expect(await b.count('test_execution', 'id = $1', executionId)).toBe(0);
    expect(await b.count('bug', 'id = $1', bug)).toBe(0);
    expect(await b.count('tag', 'id = $1', tag)).toBe(0);
    expect(await b.count('environment', 'id = $1', env)).toBe(0);
    expect(await b.count('test_case', 'id = $1', keptCase)).toBe(1);
    // last_project_id is only readable by the user themselves.
    const client = await app.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [user]);
      const { rows } = await client.query('SELECT last_project_id FROM "user" WHERE id = $1', [user]);
      await client.query('COMMIT');
      expect(rows[0].last_project_id).toBeNull();
    } finally {
      client.release();
    }
    const log = await entriesFor(b, doomed);
    expect(log.n).toBe(1);
    expect(log.last).toMatchObject({ action_code: 'project.purged', entity_name: 'Old App' });
    // Contents went with the project: no entries of their own.
    expect(await b.count('activity_entries', 'entity_id = ANY($1::uuid[])', [tc, executionId, bug])).toBe(0);
  });

  it('keeps the run and the bug when their test case is purged, clearing only the links', async () => {
    const { b, user, purge } = await setUp('Purge-TestCase');
    const tc = await b.testCase('Login works', { deleted: 31 });
    const { runId } = await b.execution('Live execution', user, { testCaseId: tc });
    const bug = await b.bug('Login fails', user, { testCaseId: tc });

    await purge();

    expect(await b.count('test_case', 'id = $1', tc)).toBe(0);
    expect(await b.one('SELECT test_case_id, test_case_name_snapshot FROM test_run WHERE id = $1', [runId])).toEqual({
      test_case_id: null,
      test_case_name_snapshot: 'Snapshot name',
    });
    expect(await b.one('SELECT test_case_id FROM bug WHERE id = $1', [bug])).toEqual({ test_case_id: null });
    expect((await entriesFor(b, tc)).last).toMatchObject({ action_code: 'test_case.purged', entity_name: 'Login works' });
  });

  it('keeps a bug filed from a run when the execution is purged', async () => {
    const { b, user, purge } = await setUp('Purge-Execution');
    const { executionId, runId } = await b.execution('Old run', user, { deleted: 31 });
    const bug = await b.bug('Found in run', user, { testRunId: runId });

    await purge();

    expect(await b.count('test_execution', 'id = $1', executionId)).toBe(0);
    expect(await b.count('test_run', 'id = $1', runId)).toBe(0);
    expect(await b.one('SELECT test_run_id FROM bug WHERE id = $1', [bug])).toEqual({ test_run_id: null });
    expect((await entriesFor(b, executionId)).last).toMatchObject({ action_code: 'test_execution.purged' });
  });

  it('keeps earlier activity entries unchanged, and a second run removes and logs nothing', async () => {
    const { ws, b, user, purge } = await setUp('Purge-Twice');
    const bug = await b.bug('Old bug', user, { deleted: 40 });
    await (async () => {
      const client = await app.connect();
      try {
        await client.query('BEGIN');
        await client.query(`SELECT set_config('app.workspace_id', $1, true)`, [ws.workspaceId]);
        await client.query(
          `INSERT INTO activity_entries (workspace_id, project_id, actor_user_id, actor_display_name, action_code,
             entity_type, entity_id, entity_name, category)
           VALUES ($1, $2, $3, 'Fixture User', 'bug.created', 'bug', $4, 'Old bug', 'Bugs')`,
          [ws.workspaceId, ws.projectId, user, bug],
        );
        await client.query('COMMIT');
      } finally {
        client.release();
      }
    })();

    await purge();
    const afterFirst = await b.count('activity_entries', 'entity_id = $1', bug);
    await purge();

    expect(afterFirst).toBe(2);
    expect(await b.count('activity_entries', 'entity_id = $1', bug)).toBe(2);
    expect(
      await b.one('SELECT action_code, actor_display_name FROM activity_entries WHERE entity_id = $1 ORDER BY created_at LIMIT 1', [bug]),
    ).toEqual({ action_code: 'bug.created', actor_display_name: 'Fixture User' });
  });

  it('runs as the trash_purge job: enqueued with enqueue_job, processed by the worker', async () => {
    const { b, user } = await setUp('Purge-Job');
    const bug = await b.bug('Old bug', user, { deleted: 31 });
    const client = await app.connect();
    try {
      await client.query("SELECT enqueue_job('trash_purge')");
    } finally {
      client.release();
    }

    // runOnce processes every queued job it knows, then resolves. This one visits every
    // workspace on the dev database, hence the timeout.
    await runOnce({ pgPool: worker, taskList: createTaskList(worker) });

    expect(await b.count('bug', 'id = $1', bug)).toBe(0);
    expect((await entriesFor(b, bug)).last).toMatchObject({ action_code: 'bug.purged' });
  }, 180_000);

  describe('folder trees', () => {
    it('removes a due folder with its subfolder and test cases, logging one entry for the tree', async () => {
      const { b, purge } = await setUp('Purge-Folder');
      const deletion = randomUUID();
      const root = await b.folder('Checkout', { deleted: 31, deletionId: deletion });
      const sub = await b.folder('Payments', { parentId: root, deleted: 31, deletionId: deletion });
      const cases = [
        await b.testCase('A', { folderId: root, deleted: 31, deletionId: deletion }),
        await b.testCase('B', { folderId: sub, deleted: 31, deletionId: deletion }),
        await b.testCase('C', { folderId: sub, deleted: 31, deletionId: deletion }),
      ];

      await purge();

      expect(await b.count('folder', 'id = ANY($1::uuid[])', [root, sub])).toBe(0);
      expect(await b.count('test_case', 'id = ANY($1::uuid[])', cases)).toBe(0);
      const log = await entriesFor(b, root);
      expect(log.n).toBe(1);
      expect(log.last).toMatchObject({
        action_code: 'folder.purged',
        actor_user_id: null,
        entity_name: 'Checkout',
        details: { folders: 2, testCases: 3 },
      });
      expect(await b.count('activity_entries', 'entity_id = ANY($1::uuid[])', [sub, ...cases])).toBe(0);
    });

    it('skips a due tree that still holds a live test case, leaving it in the trash', async () => {
      const { b, purge } = await setUp('Purge-FolderSkip');
      const deletion = randomUUID();
      const root = await b.folder('Trashed', { deleted: 31, deletionId: deletion });
      const movedIn = await b.testCase('Moved in later', { folderId: root });

      const summary = await purge();

      expect(summary.skippedFolderTrees).toBeGreaterThanOrEqual(1);
      expect(await b.count('folder', 'id = $1', root)).toBe(1);
      expect(await b.count('test_case', 'id = $1', movedIn)).toBe(1);
      expect(await b.count('activity_entries', 'entity_id = $1', root)).toBe(0);
    });

    it('removes a test case deleted on its own 31 days ago inside a folder deleted 10 days ago', async () => {
      const { b, purge } = await setUp('Purge-FolderRecent');
      const folder = await b.folder('Recent folder', { deleted: 10, deletionId: randomUUID() });
      const old = await b.testCase('Old case', { folderId: folder, deleted: 31 });

      await purge();

      expect(await b.count('test_case', 'id = $1', old)).toBe(0);
      expect(await b.count('folder', 'id = $1', folder)).toBe(1);
    });
  });
});
