# Proposal

## Why

Background work has nowhere to run yet: `apps/worker` is an empty placeholder. ADR 0005 chose a Postgres-backed job queue with transactional enqueue, and [ADR 0018](../../../docs/adr/0018-queue-library.md) picked Graphile Worker on 2026-10-27. Invitation emails, the Health Score snapshot and live-update work in Phase 6 and beyond all need a proven job pattern first.

The trash also never empties. Projects, folders, test cases, executions and bugs are soft-deleted, and PRD §2.11 and ADR 0007 say they are removed permanently after 30 days, but nothing does that today. A purge job is the right first job: it needs no external service, and it exercises scheduling, tenant context and activity logging. This is roadmap-full.md Phase 6, slice 1 (queue and worker).

## What Changes

- **Database setup (superuser, one time):**
  - A new `railgun_worker` login role (no RLS bypass).
  - `CREATE` on the database for `railgun_migrator`, so it can install the queue schema.
  - Both are added to `db/init`. CI applies them, and an existing dev database needs one command to catch up.
- **Migrations:**
  - `npm run db:migrate` installs Graphile Worker's own `graphile_worker` schema as `railgun_migrator`, before our SQL files.
  - Migration `0014_background_jobs` adds `enqueue_job(task, payload, run_at)`. It is a migrator-owned `SECURITY DEFINER` function that accepts only allow-listed task names; `railgun_app` gets `EXECUTE` on it.
  - The same migration grants `railgun_worker` what it needs on the queue schema, and the tenant-table rights the purge needs: `DELETE` on the trashed tables and `INSERT` on the activity log.
  - It also adds a `SELECT`-only policy that lets `railgun_worker` list workspace ids, and nothing else, so the purge can visit each workspace under its own tenant context.
- **Worker (`apps/worker`):** the first real code.
  - A Graphile Worker runner that connects as `railgun_worker` and handles shutdown signals.
  - A daily crontab entry for `trash_purge`.
  - A small `pg`-based tenant-context helper with the same contract as ADR 0008.
  - Scripts: `npm run dev -w apps/worker` and `npm test -w apps/worker`. The root `npm run dev` also starts the worker.
- **Trash purge (`trash_purge` task):** for each workspace, it permanently removes items in the trash for more than 30 days, in dependency order:
  1. projects, with everything in them;
  2. bugs;
  3. executions;
  4. test cases;
  5. folders, children before parents.

  Each top-level item gets one "permanently removed" activity entry from a system actor, with no person attached. The job is idempotent and safe to retry.
- **CI:** Node 20 → 22 (Graphile Worker requires 22.18+). The worker workspace joins lint and typecheck.

Out of scope:
- SSE live updates (Phase 6, slice 2).
- The email job (Phase 6, slice 3; needs open question A1).
- Enqueueing jobs from any API route. The wrapper is in place and tested, but no route uses it yet.
- Bug image deletion (no attachments exist yet; Phase 8).
- A UI for purge results (the Trash screen is Phase 3/7 work).
- Where the worker runs when deployed (E1–E2).

## Capabilities

### New Capabilities

- `background-jobs`: the job queue and worker process. Covers transactional enqueue through the allow-listed function, the worker's database role and its limits, scheduled jobs, and graceful shutdown.
- `trash-purge`: permanently removing items that have been in the trash for more than 30 days, with what survives (runs, bug links, the activity log), the order of removal, its activity entries, and idempotency.

### Modified Capabilities

None. Soft delete and restore stay as they are. The purge only removes what has already been in the trash for 30 days.

## Impact

- **DB:**
  - `db/init/02-worker-role.sql` (new, superuser).
  - `db/migrations/0014_background_jobs.{up,down}.sql`.
  - `scripts/apply-migrations.js` installs the Graphile Worker schema first.
  - `db:check-rls` is unchanged, because the queue tables carry no `workspace_id`.
- **Worker:**
  - `apps/worker` gains `src/` (runner, tenant context, tasks, crontab), Jest tests against the real database, and the `graphile-worker` and `pg` dependencies.
  - `scripts/dev.js` starts it alongside the API and web.
- **API:** no change.
- **CI:** `.github/workflows/ci.yml` moves to Node 22 and applies the new init file.
- **Docs:**
  - CLAUDE.md: worker commands and the env var `WORKER_DATABASE_URL`, plus the one-time dev database step.
  - roadmap-full.md: the Phase 6 slice 1 status.
  - ADR 0018: its open item on the worker role, closed by this change's role design.
