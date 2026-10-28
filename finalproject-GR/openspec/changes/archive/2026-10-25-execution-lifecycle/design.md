# Design

## Context

See proposal.md - Why. Relevant current state:

- Every domain table so far (`test_case`, `environment`, `environment_credential`) is a standard `workspace_id`-keyed RLS table (`tenant_isolation` policy, `ENABLE`+`FORCE`), with a composite `(x_id, workspace_id)` FK to its parent so a child can never point across tenants. Migrations are hand-written SQL in `db/migrations/NNNN_*.up/down.sql`, applied by `scripts/apply-migrations.js`, and `npm run db:check-rls` fails CI if a table lacks RLS. Prisma has no models — controllers use `tx.$queryRaw` inside `withTenantContext` (ADR 0008).
- Controllers nest every route under `/projects/:projectId/...`, resolve the workspace via `resolveProjectWorkspaceId`, and gate with `ProjectRoleGuard` + `@RequireProjectRole(...)`. `test-cases.controller.ts` is the closest template.
- `ActivityLogger.log(tx, entry)` exists and is called today only by the environment credential reveal path; it takes the caller's own transaction.
- Postgres is 16 (docker-compose), so `ON DELETE SET NULL (column_list)` is available.

## Goals / Non-Goals

**Goals:**
- One place that owns lifecycle rules, so Slice 2 (frontend), and later Cancel/Try Again, add transitions without touching storage shape.
- Every transition is race-safe at the database level, not just checked in application code.
- Elapsed time is derivable by the client with no server push (ADR 0005), and never double-counts or loses time across pause/resume.

**Non-Goals:**
- Cancel, Try Again, Automated mode, step results/attempts, auto-bug creation (proposal.md - deferred).
- A generic workflow/state-machine library — seven states and seven edges do not need one.
- List filtering/sorting/pagination beyond `ORDER BY updated_at DESC` (PRD §6.3.2's filters are Slice 2 or later).

## Decisions

**Schema (migration `0008_test_execution`).**
- `test_execution`: `id`, `project_id`, `workspace_id`, `name`, `description`, `status` (`CHECK IN ('Draft','Ready','InProgress','Paused','Completed','Done','Canceled')` — `Canceled` included now so Cancel later needs no constraint migration), `environment_id` (nullable), `environment_name` (nullable text), `browser` (`CHECK IN ('Chromium','Firefox','WebKit')`), `viewport_width`/`viewport_height` (`int CHECK > 0`), `locale`, `timezone`, `auto_create_bug` (bool, default false), `elapsed_ms_accumulated` (bigint, default 0), `last_resumed_at` (timestamptz, nullable), `started_at`, `completed_at`, `signed_off_at`, `signed_off_by`, `created_by`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`. `UNIQUE (id, workspace_id)`; composite FK to `project`.
- `test_run`: `id`, `execution_id`, `workspace_id`, `test_case_id` (nullable), `position` (int), `outcome` (`CHECK IN ('Pending','Pass','Fail','NeedsReview')`, default `Pending`), `test_case_name_snapshot`/`gherkin_script_snapshot` (nullable until start), `outcome_updated_at`, `outcome_updated_by`. `UNIQUE (execution_id, position) DEFERRABLE INITIALLY DEFERRED` (lets a reorder rewrite positions in one statement), `UNIQUE (execution_id, test_case_id)`; composite FK `(execution_id, workspace_id) → test_execution ON DELETE CASCADE`.
- `test_case` gains `UNIQUE (id, workspace_id)` so `test_run (test_case_id, workspace_id)` can reference it with `ON DELETE SET NULL (test_case_id)` — keeps `workspace_id` intact when a future Trash purge hard-deletes a test case (ADR 0007: runs survive purges via their snapshot).
- `test_execution (environment_id, workspace_id) → environment ON DELETE SET NULL (environment_id)`, and `environment_name` is written whenever the environment is set. This is G10's resolution: the existing `DELETE` on environments needs no code change — the FK does it.
- Grants: `SELECT, INSERT, UPDATE` on `test_execution` (soft delete is an `UPDATE`, same lesson as `test-case-delete`); `SELECT, INSERT, UPDATE, DELETE` on `test_run` (Draft run-list replacement deletes rows; runs are not a Trash entity on their own).
- Alternative rejected: storing `outcome` as `'Needs Review'` with a space. The API uses `NeedsReview` as the wire value too; the display label is the frontend's job.

**Timer model: `elapsed_ms_accumulated` + `last_resumed_at`** (the readme ticket and ADR 0005's "computed in the browser"). Entering `InProgress` sets `last_resumed_at = now()`; leaving it (Pause, auto-Complete) adds `now() - last_resumed_at` to the accumulator and nulls `last_resumed_at`, in the same `UPDATE`. The client shows `accumulated + (now − last_resumed_at)` when the latter is set. Responses also include the server's `now` so Slice 2 can correct for client clock skew. Alternative rejected: an append-only intervals table — more rows and a `SUM` on every read, for an audit trail the activity log already provides.

**State machine as one table-driven module plus conditional UPDATEs.** A pure `execution-lifecycle.ts` holds the transition table (`action → {from, to, minRole}`) and is unit-tested without a database. Each transition endpoint runs one `UPDATE test_execution SET status = :to, ... WHERE id = :id AND project_id = :projectId AND status = :from AND deleted_at IS NULL RETURNING ...`. Zero rows → re-read to tell 404 (missing) from 409 (wrong status). The `WHERE status = :from` makes concurrent conflicting requests safe without explicit locks: Postgres re-evaluates the predicate after the first writer commits, so the second sees zero rows. Alternative rejected: `SELECT ... FOR UPDATE` then check in code — same safety, two round trips, and more room to forget the lock.

**Endpoints** (all under `/projects/:projectId/executions`):
- `POST /`, `GET /`, `GET /:executionId`, `PATCH /:executionId` (Draft only; optional `testCaseIds` replaces the run list), `DELETE /:executionId` (Admin, Draft only).
- `POST /:executionId/mark-ready`, `/back-to-draft`, `/run-all` (body `{ mode }`), `/pause`, `/resume`, `/sign-off` — one verb per PRD action rather than a generic `PATCH {status}`, so each carries its own role and preconditions and the API reads like the PRD's action table.
- `PATCH /:executionId/runs/:runId` (body `{ outcome }`).
- Role gating stays in `ProjectRoleGuard`. Endpoints are split across two controllers matching the two capabilities (`executions.controller.ts` for authoring, `execution-lifecycle.controller.ts` for transitions and outcomes) so neither grows past the size of `environments.controller.ts`.

**Run All snapshot is one statement.** `UPDATE test_run r SET test_case_name_snapshot = tc.name, gherkin_script_snapshot = tc.gherkin_script FROM test_case tc WHERE r.execution_id = :id AND tc.id = r.test_case_id`, inside the same transaction as the status `UPDATE`. Precondition checks in that transaction: run count > 0 (409). Run responses report `COALESCE(snapshot, live test_case.name)`, so Draft/Ready runs show the current name and started runs show the recorded one.

**Auto-complete is part of the outcome write.** The outcome `UPDATE` and a follow-up `UPDATE test_execution SET status='Completed', ... WHERE id = :id AND status = 'InProgress' AND NOT EXISTS (SELECT 1 FROM test_run WHERE execution_id = :id AND outcome = 'Pending')` run in one transaction. Two testers recording the last two outcomes concurrently: each transaction's `NOT EXISTS` sees the other's uncommitted row as still Pending under READ COMMITTED, so neither might complete it. To close that gap, the outcome write first takes `SELECT ... FROM test_execution WHERE id = :id FOR UPDATE`, serializing outcome writes per execution. Outcome writes are human-paced, so contention is negligible.

**Sign Off** checks `NOT EXISTS (... outcome = 'NeedsReview')` inside the conditional `UPDATE`'s `WHERE`. Zero rows plus status still `Completed` → 409 with a "resolve Needs Review runs first" message.

**Only `Ready` test cases are selectable** (decision; PRD §7.2 is silent). Create and Draft `PATCH` validate every `testCaseIds` entry in one query: same project, not deleted, `status = 'Ready'`. Otherwise → 400. The status is checked again at Mark as Ready, not just at selection, because a test case's status and deleted state are editable while an execution sits in Draft. Alternatives rejected: allowing any non-deleted test case (lets obsolete tests run), and excluding only Deprecated (lets unfinished Draft tests run).

**Mark as Ready** checks inside its transaction that every run's `test_case_id` points to a non-deleted test case with `status = 'Ready'` (a null id from a purge also fails). Otherwise → 409. That is the counterpart to the test-case delete guard: delete and status changes are allowed while an execution is Draft, so readying is where they get caught. After Mark as Ready, a test case's later status change does not affect the execution; Run All snapshots whatever exists at that moment.

**Test-case delete guard** joins `test_run → test_execution` for any status in `('Ready','InProgress','Paused')` inside the existing delete transaction, before the soft-delete `UPDATE`. `Draft` is deliberately not "active". A Draft is still being planned, and blocking deletes on it would let any forgotten Draft pin test cases forever. Mark as Ready catches the result instead. **Assumption recorded:** PRD §6.2.5 does not define "active"; this reading counts only executions that are queued or running.

**Input validation:** locale via `Intl.getCanonicalLocales` (throws on invalid tags), timezone via `Intl.supportedValuesOf('timeZone')` (plus `UTC`), browser and outcome from fixed lists, viewport as positive integers. G9's curated picker lists stay open. The API accepts any valid value, and Slice 2's picker can offer a subset without an API change. Defaults when omitted: browser = environment's `default_browser` else `Chromium`, viewport 1280×720, locale `en-US`, timezone `UTC`.

**Activity log action codes:** `test_execution.created|updated|deleted|marked_ready|returned_to_draft|started|paused|resumed|completed|signed_off`, `test_run.outcome_set` (with `{from, to}` in `details`), category `Executions` (implemented as the capitalized plural to match the existing `Projects`/`Environments` categories). Actor display name is looked up the way the reveal path already does it. Auto-completion is logged with the same actor as the outcome that triggered it, so the activity panel shows who completed it.

## Risks / Trade-offs

- [Composite FKs with `SET NULL (col)` are Postgres 15+] → Docker uses 16. Hosting (open-questions E1–E4) must be ≥15, so I'll add that to the migration's header comment.
- [The `FOR UPDATE` on outcome writes serializes testers on one execution] → Outcome writes are human-paced, and the lock is held for two statements.
- [Draft run-list replacement deletes and reinserts runs, so run ids change on edit] → No other entity references Draft runs (bugs link to runs only from Phase 8, and only to started runs). Documented in the PATCH response contract.
- [A Draft execution can reference a test case deleted afterwards] → Caught at Mark as Ready (409). Slice 2 can show those runs as "deleted" from the `COALESCE`'d null name.
- [Two controllers for one resource could drift on shared helpers] → Both use a shared `executions/execution-queries.ts` for the execution/run read shape and `toResponse`.

## Migration Plan

Forward only via `npm run db:migrate`. `0008_test_execution.down.sql` drops `test_run`, `test_execution`, and the added `test_case` unique constraint, in that order. No existing data is transformed. The only change to an existing table is an additive unique constraint on `test_case(id, workspace_id)`, which already holds because `id` is a primary key.
