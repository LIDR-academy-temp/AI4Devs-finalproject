import type { Pool, PoolClient } from 'pg';
import { listWorkspaceIds, withTenantContext } from '../tenant-context';

/** ADR 0007: items stay in the trash this long, then go for good. */
const DUE = `deleted_at < now() - interval '30 days'`;

interface Item {
  id: string;
  project_id: string;
  name: string;
}

export interface PurgeSummary {
  projects: number;
  bugs: number;
  executions: number;
  testCases: number;
  folderTrees: number;
  skippedFolderTrees: number;
  failedWorkspaces: string[];
}

/**
 * One system entry per top-level item (ADR 0007 decision 4): no actor, the name as it was.
 * Written in the removal's own transaction.
 */
async function logPurged(
  client: PoolClient,
  workspaceId: string,
  item: Item,
  entity: { type: string; actionCode: string; category: string },
  details?: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO activity_entries (workspace_id, project_id, action_code, entity_type, entity_id, entity_name, category, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [workspaceId, item.project_id, entity.actionCode, entity.type, item.id, item.name, entity.category, details ?? null],
  );
}

/**
 * Projects, bugs, executions and individually deleted test cases: each one is re-checked,
 * removed (dependents go by FK cascade / SET NULL) and logged in its own transaction, so an
 * interrupted run loses nothing and a rerun redoes nothing.
 */
const SIMPLE_KINDS = [
  {
    key: 'projects',
    table: 'project',
    nameColumn: 'name',
    projectColumn: 'id',
    entity: { type: 'project', actionCode: 'project.purged', category: 'Projects' },
    extraWhere: '',
  },
  {
    key: 'bugs',
    table: 'bug',
    nameColumn: 'title',
    projectColumn: 'project_id',
    entity: { type: 'bug', actionCode: 'bug.purged', category: 'Bugs' },
    extraWhere: '',
  },
  {
    key: 'executions',
    table: 'test_execution',
    nameColumn: 'name',
    projectColumn: 'project_id',
    entity: { type: 'test_execution', actionCode: 'test_execution.purged', category: 'Executions' },
    extraWhere: '',
  },
  {
    // Test cases a folder delete took with it go with their folder tree instead.
    key: 'testCases',
    table: 'test_case',
    nameColumn: 'name',
    projectColumn: 'project_id',
    entity: { type: 'test_case', actionCode: 'test_case.purged', category: 'Test Cases' },
    extraWhere: 'AND (t.deletion_id IS NULL OR NOT EXISTS (SELECT 1 FROM folder f WHERE f.deletion_id = t.deletion_id))',
  },
] as const;

async function purgeSimple(pool: Pool, workspaceId: string, kind: (typeof SIMPLE_KINDS)[number]): Promise<number> {
  const select = `SELECT t.id, t.${kind.projectColumn} AS project_id, t.${kind.nameColumn} AS name FROM ${kind.table} t
    WHERE t.${DUE} ${kind.extraWhere}`;
  const due = await withTenantContext(pool, workspaceId, (client) => client.query<Item>(`${select} ORDER BY t.deleted_at, t.id`));

  let purged = 0;
  for (const candidate of due.rows) {
    const removed = await withTenantContext(pool, workspaceId, async (client) => {
      // One statement re-checks and removes, so a restore since the listing wins (no
      // SELECT … FOR UPDATE: that needs UPDATE privilege, which this role doesn't have).
      const { rows } = await client.query<Item>(
        `DELETE FROM ${kind.table} t WHERE t.id = $1 AND t.${DUE} ${kind.extraWhere}
         RETURNING t.id, t.${kind.projectColumn} AS project_id, t.${kind.nameColumn} AS name`,
        [candidate.id],
      );
      if (rows.length === 0) {
        return false; // restored or already purged since the listing
      }
      await logPurged(client, workspaceId, rows[0], kind.entity);
      return true;
    });
    purged += removed ? 1 : 0;
  }
  return purged;
}

/**
 * Folder trees: everything one folder delete took with it (one deletion_id), removed in
 * one transaction once the tree's root is due — its test cases first, then folders from
 * the deepest up (folder FKs don't cascade). Oldest trees first, so a subtree deleted
 * earlier on its own is gone before its parent's tree is checked. A tree still holding
 * anything else (e.g. a test case later moved into a trashed folder) is skipped.
 */
async function purgeFolderTrees(pool: Pool, workspaceId: string): Promise<{ purged: number; skipped: number }> {
  const roots = await withTenantContext(pool, workspaceId, (client) =>
    client.query<Item & { deletion_id: string }>(
      `SELECT f.id, f.project_id, f.name, f.deletion_id FROM folder f
       WHERE f.${DUE} AND f.deletion_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM folder p WHERE p.id = f.parent_folder_id AND p.deletion_id = f.deletion_id)
       ORDER BY f.deleted_at, f.id`,
    ),
  );

  let purged = 0;
  let skipped = 0;
  for (const root of roots.rows) {
    const outcome = await withTenantContext(pool, workspaceId, async (client) => {
      const group = root.deletion_id;
      const stillDue = await client.query(`SELECT id FROM folder WHERE deletion_id = $1 AND ${DUE}`, [group]);
      if (stillDue.rows.length === 0) {
        return 'gone' as const;
      }
      const { rows: outsiders } = await client.query(
        `SELECT 1 FROM folder c JOIN folder f ON f.id = c.parent_folder_id
           WHERE f.deletion_id = $1 AND c.deletion_id IS DISTINCT FROM $1
         UNION ALL
         SELECT 1 FROM test_case t JOIN folder f ON f.id = t.folder_id
           WHERE f.deletion_id = $1 AND t.deletion_id IS DISTINCT FROM $1
         LIMIT 1`,
        [group],
      );
      if (outsiders.length > 0) {
        return 'skipped' as const;
      }

      // Each delete re-checks "still due", so a restore racing this tree removes nothing it touched.
      const testCases = await client.query(`DELETE FROM test_case WHERE deletion_id = $1 AND ${DUE}`, [group]);
      let folders = 0;
      for (;;) {
        const leaves = await client.query(
          `DELETE FROM folder f WHERE f.deletion_id = $1 AND f.${DUE}
             AND NOT EXISTS (SELECT 1 FROM folder c WHERE c.parent_folder_id = f.id)`,
          [group],
        );
        if (!leaves.rowCount) break;
        folders += leaves.rowCount;
      }
      await logPurged(
        client,
        workspaceId,
        root,
        { type: 'folder', actionCode: 'folder.purged', category: 'Test Cases' },
        { folders, testCases: testCases.rowCount ?? 0 },
      );
      return 'purged' as const;
    });
    if (outcome === 'purged') purged++;
    if (outcome === 'skipped') {
      skipped++;
      console.warn(`trash_purge: folder tree ${root.deletion_id} in workspace ${workspaceId} still holds other items; left in the trash`);
    }
  }
  return { purged, skipped };
}

/** One cheap check per workspace, so the common case (nothing due) costs one transaction. */
async function hasAnythingDue(pool: Pool, workspaceId: string): Promise<boolean> {
  const { rows } = await withTenantContext(pool, workspaceId, (client) =>
    client.query(
      ['project', 'bug', 'test_execution', 'test_case', 'folder']
        .map((table) => `SELECT 1 FROM ${table} WHERE ${DUE}`)
        .join(' UNION ALL ') + ' LIMIT 1',
    ),
  );
  return rows.length > 0;
}

/**
 * Permanently removes everything in the trash for more than 30 days, workspace by
 * workspace (ADR 0007, specs/trash-purge). Projects first (they take their contents),
 * then bugs, executions, test cases and folder trees. A failing workspace doesn't stop
 * the others; the summary names it so the caller can fail the job and let it retry.
 * `workspaceIds` narrows the run (tests); by default every workspace is visited.
 */
export async function purgeTrash(pool: Pool, options: { workspaceIds?: string[] } = {}): Promise<PurgeSummary> {
  const summary: PurgeSummary = {
    projects: 0,
    bugs: 0,
    executions: 0,
    testCases: 0,
    folderTrees: 0,
    skippedFolderTrees: 0,
    failedWorkspaces: [],
  };
  for (const workspaceId of options.workspaceIds ?? (await listWorkspaceIds(pool))) {
    try {
      if (!(await hasAnythingDue(pool, workspaceId))) {
        continue;
      }
      for (const kind of SIMPLE_KINDS) {
        summary[kind.key] += await purgeSimple(pool, workspaceId, kind);
      }
      const trees = await purgeFolderTrees(pool, workspaceId);
      summary.folderTrees += trees.purged;
      summary.skippedFolderTrees += trees.skipped;
    } catch (error) {
      console.error(`trash_purge: workspace ${workspaceId} failed`, error);
      summary.failedWorkspaces.push(workspaceId);
    }
  }
  return summary;
}

/** The `trash_purge` task: runs the purge and fails the job (so Graphile retries) if any workspace failed. */
export function trashPurgeTask(pool: Pool) {
  return async (): Promise<void> => {
    const summary = await purgeTrash(pool);
    console.info('trash_purge done', summary);
    if (summary.failedWorkspaces.length > 0) {
      throw new Error(`trash_purge failed in ${summary.failedWorkspaces.length} workspace(s)`);
    }
  };
}
