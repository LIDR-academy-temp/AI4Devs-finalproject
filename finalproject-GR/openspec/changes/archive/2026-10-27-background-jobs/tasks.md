# Tasks

## 1. Docs

- [x] 1.1 In roadmap-full.md, add a Phase 6 "Slice 1: Queue and worker 🚧" entry pointing at the OpenSpec change `background-jobs`, with its deferred list (SSE, email job, enqueue from API routes, bug images, deployment of the worker). Verify it reads like Phase 4's slice entries.

## 2. Roles and queue schema

- [x] 2.1 Write `db/init/02-worker-role.sql` (design.md decision 1). It must be idempotent: create the `railgun_worker` role and its `USAGE` on `public`, and grant `CREATE ON DATABASE railgun` to `railgun_migrator`. Verify:
  - running it twice against the dev database as postgres succeeds both times
  - `railgun_worker` can log in
  - `rolbypassrls` is false
- [x] 2.2 Add `scripts/install-job-queue.js`, which runs Graphile Worker's `runMigrations` against `DATABASE_URL` (design.md decision 2). Add `graphile-worker` and `pg` to `apps/worker`. Make `apply-migrations.js` run it before the SQL files. Verify:
  - against the dev database as `railgun_migrator`, it creates a `graphile_worker` schema owned by `railgun_migrator`
  - a second run succeeds without changes

## 3. Migration 0014

- [x] 3.1 Write `db/migrations/0014_background_jobs.up.sql` and `.down.sql` (design.md decisions 3 and 5):
  - the `enqueue_job` wrapper, with `EXECUTE` only for `railgun_app`
  - the worker's queue-schema grants and default privileges
  - the tenant-table grants
  - `SELECT (id)` on `workspace`, plus the `worker_list_workspaces` policy

  Verify:
  - it applies to the dev database after 2.1 and 2.2
  - up → down → up round-trips
  - `npm run db:check-rls` passes
- [x] 3.2 Start a Graphile Worker runner as `railgun_worker` with only these grants (`npm run dev -w apps/worker` once 4.3 exists, or a scratch script) and verify that it starts, schedules the crontab and runs a queued `trash_purge`. If it fails for lack of a privilege, add exactly that grant to 0014 and record it in ADR 0018's open item.

## 4. Worker foundation

- [x] 4.1 Set up `apps/worker`: a `src/` layout, a Jest/ts-jest config matching `apps/api`, the `dev`, `start`, `test` and `lint` scripts, and an ESLint config from `@railgun-qa/config`. Replace the `index.ts` placeholder. Verify `npm run lint` and `npm run typecheck` pass from the root with the worker included.
- [x] 4.2 Add `src/db.ts` (a `pg.Pool` from `WORKER_DATABASE_URL`, with the dev default) and `src/tenant-context.ts` (design.md decision 4). Verify with `tenant-context.spec.ts` against the database:
  - test cases read with no context return zero rows
  - inside a workspace's context only that workspace's rows are returned
  - an error inside the callback rolls back the transaction
  - listing workspace ids with no context returns ids, and selecting `name` is refused
- [x] 4.3 Add `src/main.ts` (the runner with `pgPool`, `taskList`, crontab `0 3 * * * trash_purge ?fill=1d`, and default signal handling) and `src/crontab.ts`. Verify:
  - `crontab.spec.ts`: the crontab parses with Graphile's `parseCrontab` into one item for `trash_purge`
  - `shutdown.spec.ts`: a runner with a test task that waits 300 ms; calling `stop()` while it runs resolves only after the task completed, and no further job is taken
- [x] 4.4 Verify `enqueue_job` (design.md decision 3) with `enqueue.spec.ts`, using `railgun_app` for the calls and `railgun_worker` for counting:
  - enqueueing `trash_purge` in a committed transaction adds one job
  - the same call in a rolled-back transaction adds none
  - `drop_everything` raises an error and adds none
  - `railgun_app` selecting from `graphile_worker.jobs` is refused

## 5. Trash purge

- [x] 5.1 Implement `src/tasks/trash-purge.ts`, steps 1–4 of design.md decision 6: projects, bugs, executions, and individually deleted test cases, each in its own transaction with its system activity entry, with per-workspace error isolation. Verify with `trash-purge.spec.ts` (fixtures backdated with `deleted_at`):
  - a bug deleted 31 days ago is removed and one deleted 29 days ago stays
  - a live workspace is untouched
  - a project 31 days in the trash is removed with its test cases, executions, bugs, tags and environments; a user whose last active project it was has `last_project_id` set to null; another project in the workspace is untouched
  - purging a test case keeps its run (name snapshot intact, `test_case_id` null) and its bug (`test_case_id` null)
  - purging an execution keeps the bug filed from its run (`test_run_id` null)
  - each removal writes exactly one entry with a null actor and the item's name, and existing entries are unchanged
  - a second run removes nothing and writes nothing
- [x] 5.2 Add folder trees (design.md decision 6, step 5). Verify with additions to `trash-purge.spec.ts`:
  - a folder deleted 31 days ago with a subfolder and three test cases is fully removed with exactly one `folder.purged` entry `{ folders: 2, testCases: 3 }`
  - a due tree whose folder still holds a live test case that was moved in is skipped and left in the trash, with no entry
  - a test case deleted on its own 31 days ago inside a folder deleted 10 days ago is removed while the folder stays
- [x] 5.3 Register `trash_purge` in the runner's task list and check it end to end: enqueue it with `enqueue_job`, run `runOnce` as `railgun_worker`, and verify that a due bug is gone afterwards. The test lives in `trash-purge.spec.ts`.

## 6. Dev and CI wiring

- [x] 6.1 Add the worker to `scripts/dev.js`, with its own prefix and colour. Verify `npm run dev` starts api, web and worker together and that Ctrl+C stops all three.
- [x] 6.2 In `.github/workflows/ci.yml`, move to Node 22 and add a step that applies `db/init/02-worker-role.sql` after `01-roles.sql`. Migrations already include the queue install through 2.2. Verify the YAML is valid and the steps are in order. Note that CI can only be confirmed when it runs on push.

## 7. Documentation and integration checks

- [x] 7.1 CLAUDE.md:
  - the worker commands
  - `WORKER_DATABASE_URL`
  - the one-time dev database steps (design.md migration plan)
  - the `railgun_worker` role
  - the Node 22.18+ requirement

  Update ADR 0018's open item with the role and grants chosen (plus anything 3.2 found), and `apps/api/.env.example` only if the API needs a new variable (it shouldn't). Verify the documented commands run as written against the dev database.
- [x] 7.2 Run `npm run lint`, `npm run typecheck`, `npm test -w apps/api`, `npm run test -w apps/web` and `npm test -w apps/worker` from `finalproject-GR/`. All must pass.

## Workflow follow-up

- Archive after the user has tried it hands-on. Don't commit until the user asks.
