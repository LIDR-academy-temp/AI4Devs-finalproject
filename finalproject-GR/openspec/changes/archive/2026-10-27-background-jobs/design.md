# Design

## Context

See proposal.md, Why. Constraints from the current codebase and docs:

- **Roles:**
  - `db/init/01-roles.sql` runs as a superuser, only on a fresh volume, and in CI through `scripts/apply-sql.js`.
  - `railgun_migrator` owns every object but has no `CREATEROLE` and no `CREATE` on the database, so it can't create a new schema.
  - `railgun_app` owns nothing and cannot bypass RLS.
- **Migrations:** `scripts/apply-migrations.js` replays every `db/migrations/*.up.sql` file. That only works on a fresh database (CI). The dev database gets each new migration applied by hand.
- **RLS:** every tenant table has `FORCE ROW LEVEL SECURITY` and a `tenant_isolation` policy for every role. Foreign-key cascades and `SET NULL` actions bypass RLS and run as the table owner, so deleting a top-level row needs only `DELETE` on that row's table.
- **Cascades:**
  - A project deletion cascades to everything under it, and `user.last_project_id` is set to null.
  - `test_run.test_case_id`, `bug.test_case_id` and `bug.test_run_id` are `SET NULL`.
  - Runs cascade with their execution, and tag joins cascade with either side.
  - `folder.parent_folder_id` and `test_case.folder_id` have **no** cascade, so contents have to be removed before their folders.
  - A folder delete stamps one `deletion_id` on every folder and test case it takes with it.
- **Graphile Worker** (docs checked 2026-10-27; ADR 0018):
  - Requires Node 22.18+ and PostgreSQL 12+.
  - `runMigrations()` installs or updates its schema.
  - `run()` takes `connectionString` or `pgPool`, `taskList`, `crontab`, and `noHandleSignals`.
  - `add_job` needs owner privileges.
  - Cron scheduling is deduplicated across workers through its `known_crontabs` table.
  - **The docs do not state the runtime privileges a worker needs.**
- CI runs Node 20 and does not run the Jest suites, only lint, typecheck, the migrations and the RLS check.

## Goals / Non-Goals

**Goals:**
- One reusable job pattern: transactional enqueue, a least-privilege worker, scheduled tasks, tests against the real database.
- A purge that follows ADR 0007 exactly and is safe to rerun.
- Close ADR 0018's open item on the worker role.

**Non-Goals:**
- Sharing ADR 0008's Prisma helper with the worker (decision 4).
- Batching or throttling the purge. v1 volumes are small (risks).
- Enqueueing from API routes. No route needs a job yet.

## Decisions

### 1. A dedicated `railgun_worker` role, created in a new init file
`db/init/02-worker-role.sql` runs as a superuser and is idempotent (`DO` blocks that check `pg_roles`):
- it creates `railgun_worker` with `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE` and `NOBYPASSRLS`, password `worker_dev_password`;
- it grants `USAGE` on `public` to that role;
- it grants `CREATE ON DATABASE railgun` to `railgun_migrator`, so the migrator can install the `graphile_worker` schema it will own.

A separate file means an existing dev database needs one command (`node scripts/apply-sql.js db/init/02-worker-role.sql` with the superuser URL), not a volume reset. A fresh volume runs it automatically.
- *Alternative: reuse `railgun_app` for the worker.* Rejected. Giving the app role access to the queue tables would make the allow-listed wrapper (decision 3) pointless. It would also give every API request the worker's purge `DELETE` rights.

### 2. The queue schema is installed by the migrate step, as the migrator
A new `scripts/install-job-queue.js` calls Graphile Worker's `runMigrations({ connectionString })`. `apply-migrations.js` runs it **before** the SQL files, so `0014` can grant privileges on objects that already exist. The script is also runnable on its own for the dev database, and Graphile's migrations are idempotent. The worker never installs its own schema: it has no `CREATE`, so a version mismatch fails at startup instead of migrating silently.

### 3. `enqueue_job` wrapper in migration `0014`
```
public.enqueue_job(task text, payload jsonb DEFAULT '{}', run_at timestamptz DEFAULT now()) RETURNS bigint
```
- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public`, owned by `railgun_migrator`.
- It raises an exception unless `task` is on the allow-list, which is a constant array in the function. Today that is only `trash_purge`.
- It calls `graphile_worker.add_job(task, payload, run_at => run_at)` and returns the job id.
- `REVOKE ALL … FROM PUBLIC`, then `GRANT EXECUTE … TO railgun_app`. Adding a task means a migration that replaces the function, which makes the allow-list reviewable.
- Callers use `tx.$executeRaw` inside their existing transaction, so the job commits or rolls back with the change. This slice tests that behaviour directly; no API route uses it yet.

### 4. The worker uses `pg`, with its own small tenant-context helper
The worker connects with `pg.Pool` (`WORKER_DATABASE_URL`, defaulting to `postgresql://railgun_worker:worker_dev_password@localhost:5433/railgun`). It passes the same pool to Graphile Worker (`pgPool`). `src/tenant-context.ts` exports `withTenantContext(pool, workspaceId, fn)`, which runs `BEGIN`, `set_config('app.workspace_id', $1, true)`, `fn(client)`, then `COMMIT`, or `ROLLBACK` and rethrow. That is ADR 0008's contract on a `pg` client.
- *Alternative: import the API's Prisma helper, or extract a shared package.* Rejected for now. The worker needs no ORM, and a cross-app import or a new package for one 15-line helper costs more than it saves. Revisit when a second consumer, such as the email job, wants the API's query modules.

### 5. Worker privileges (migration `0014`)
- **Queue schema:**
  - `USAGE` on `graphile_worker`.
  - `SELECT, INSERT, UPDATE, DELETE` on all of its tables, `USAGE, SELECT` on its sequences, and `EXECUTE` on its functions.
  - Matching `ALTER DEFAULT PRIVILEGES FOR ROLE railgun_migrator IN SCHEMA graphile_worker`, so tables added by later Graphile versions are covered.

  Graphile's docs don't list the runtime privileges, so task 3.2 verifies by starting the worker under exactly these grants. If it needs more, add the exact grant here and in ADR 0018.
- **Tenant tables:** `SELECT, DELETE` on `project`, `folder`, `test_case`, `test_execution` and `bug`, plus `INSERT` on `activity_entries`. Nothing else.
- **Listing workspaces:** `GRANT SELECT (id) ON workspace TO railgun_worker` (a column privilege), plus `CREATE POLICY worker_list_workspaces ON workspace FOR SELECT TO railgun_worker USING (true)`. The worker can enumerate workspace ids without any context but can't read their names or anything tenant-scoped.
  - *Alternative: a `SECURITY DEFINER` function that lists workspaces.* Doesn't work: `FORCE RLS` applies to the owner too, so the definer still sees nothing.

### 6. Purge algorithm (`src/tasks/trash-purge.ts`)
`purgeTrash(pool)` lists workspace ids, then purges each workspace with a try/catch, so a failure in one is logged and the others still run. The cutoff is the database's `now() - interval '30 days'`. Each top-level item is removed in **its own transaction** under `withTenantContext`, together with its activity entry. The order within a workspace:
1. **Projects** with `deleted_at < cutoff`: `DELETE FROM project`, which cascades, then log `project.purged`.
2. **Bugs** due, in any project, including one still in the trash but not yet due itself: delete each and log `bug.purged`.
3. **Executions** due: delete each (runs cascade, bug links set to null) and log `test_execution.purged`.
4. **Test cases** due and deleted on their own (`deletion_id IS NULL`, or no folder carries that `deletion_id`): delete each (run and bug links set to null) and log `test_case.purged`.
5. **Folder trees**, grouped by `deletion_id`, whose root (the group's folder whose parent is not in the group) is due. In one transaction:
   - Lock the group.
   - Skip the tree, logging a warning and no entry, if any of its folders still holds a folder or test case outside the group.
   - Otherwise delete the group's test cases, then delete its folders from the deepest up: repeatedly delete the group's folders that no longer have a child.
   - Log `folder.purged` on the root, with `details: { folders, testCases }`.

Entries use `actorUserId: null`, `actorDisplayName: null` (the system), the item's name snapshot, its `projectId`, and the categories the API already uses: `Projects`, `Bugs`, `Executions`, `Test Cases`. The task throws at the end if any workspace failed, so Graphile retries. Because the purge is idempotent, a retry redoes nothing that already succeeded.

### 7. Runner, schedule and shutdown (`src/main.ts`)
`run({ pgPool, taskList: { trash_purge }, crontab: '0 3 * * * trash_purge ?fill=1d' })`. It runs daily at 03:00 UTC, and `fill=1d` catches up one missed run after downtime. `noHandleSignals` is left false, so Graphile handles SIGINT and SIGTERM itself: it stops taking jobs, finishes the running ones, then the process exits. The "scheduled once across several workers" guarantee comes from Graphile's `known_crontabs` locking. We test that our crontab parses and names the task; we don't re-test Graphile's lock.

### 8. Tests
`apps/worker` gets Jest with ts-jest, matching `apps/api`, and runs against the docker-compose database:
- Fixtures are inserted through a `railgun_app` pool under tenant context, with `deleted_at` backdated.
- The purge runs as `railgun_worker`.
- Enqueue is tested by calling `enqueue_job` as `railgun_app` inside a committed and a rolled-back transaction, then counting `graphile_worker.jobs` as `railgun_worker`.
- Shutdown is tested by running a runner with a test task that waits, calling `stop()` while it runs, and checking that the task finished.

### 9. Found while implementing (tasks 3.2, 4.3, 5.1)
- **Graphile enables RLS on its four `_private_*` tables, with no policies.** Only the owner gets through. 0014 adds one `FOR ALL TO railgun_worker` policy per table. A table that a later Graphile version adds with RLS needs its own policy (recorded in ADR 0018).
- **`member_visible` (0004) on `project` applies to every role.** Its subquery reads `workspace_membership`, so it denied the worker any read of `project`. 0014 scopes it `TO railgun_app`, the only role that does those user-context lookups, instead of giving the worker membership data.
- **`SELECT … FOR UPDATE` needs UPDATE privilege.** The purge therefore removes each item with a single `DELETE … WHERE <still due> RETURNING`, which locks and re-checks in one statement, so a concurrent restore still wins. Folder-tree deletes re-check "still due" the same way.
- **The purge checks each workspace for anything due before doing any per-kind work**, so the usual case costs one transaction per workspace. A full sweep of about 3,400 dev workspaces takes roughly 8 s. `purgeTrash` takes an optional `workspaceIds` scope, used by tests.
- **graphile-worker 0.18 is ESM-only.** Node 22.12+ can `require()` it, but Jest only can with `--experimental-vm-modules`, so the worker's `npm test` runs Jest through that flag.

## Risks / Trade-offs

- [Graphile's runtime privileges aren't documented] → Verified by starting the worker under exactly the decision 5 grants (task 3.2). The default privileges cover tables added by future Graphile migrations.
- [A huge backlog makes one purge run long] → v1 volume is small. Each item commits on its own, so an interrupted run loses nothing and the next run continues. Add batching only if a run is measured as too slow.
- [A dev database created before this change lacks the role and schema] → One command each, documented in CLAUDE.md (task 7.1). The worker fails fast with a clear connection or migration error.
- [`enqueue_job` runs as the owner] → It only accepts allow-listed names, uses a fixed `search_path`, and does nothing except call `add_job`.
- [A worker-side tenant-context helper duplicates ADR 0008's] → It is small and covered by its own test (RLS returns zero rows without context). Revisit trigger in decision 4.
- [CI doesn't run Jest] → Unchanged here: the worker's tests run locally like the API's. CI does install the schema and apply `0014`, which catches SQL errors.

## Migration Plan

- **Fresh databases (CI, a new volume):** the init files, then `install-job-queue`, then all SQL migrations.
- **Existing dev database, one time:**
  1. `apply-sql.js db/init/02-worker-role.sql` as postgres.
  2. `install-job-queue.js` as the migrator.
  3. Apply `0014` as the migrator.
- **Rollback:**
  - `0014.down.sql` drops the wrapper, the policy and the grants.
  - The `graphile_worker` schema can be dropped by hand (`DROP SCHEMA graphile_worker CASCADE`).
  - The role stays. It is harmless without grants.
