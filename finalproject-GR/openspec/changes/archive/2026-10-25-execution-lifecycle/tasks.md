# Tasks

## 1. Record the decisions

- [x] 1.1 Write `docs/adr/0012-execution-completion-and-sign-off.md` amending ADR 0005: auto-Complete when the last `Pending` run gets an outcome (Needs Review counts), outcomes stay editable in `Completed`, Sign Off (Admin) refused while any run is `NeedsReview`; also record "active execution" = `Ready`/`InProgress`/`Paused` for the test-case delete guard, and that only `Ready` test cases can be selected into an execution (re-checked at Mark as Ready). Add 0012 to ADR 0005's (and 0001's) amended-by header — verify the ADR's links resolve
- [x] 1.2 Add new item G11 ("Which test case statuses can be selected into an execution?" — PRD §7.2) directly as resolved → ADR 0012 (Ready only). Move G6 (→ ADR 0012) and G10 (→ FK `SET NULL (environment_id)` + `environment_name` snapshot, this change) to open-questions.md's resolved table; leave G7, G8, G9 open with a note that G9's API side accepts any valid `Intl` value — verify G6/G10 no longer appear in section G
- [x] 1.3 Mark roadmap-mvp.md Phase 7 🚧 In progress with a "Slice 1: Execution lifecycle backend" entry pointing at this change — verify the status legend still matches

## 2. Migration: test_execution, test_run

- [x] 2.1 Write `db/migrations/0008_test_execution.up.sql`: add `UNIQUE (id, workspace_id)` to `test_case`; create `test_execution` and `test_run` exactly as design.md's Schema decision (check constraints, composite FKs including `ON DELETE SET NULL (environment_id)` and `ON DELETE SET NULL (test_case_id)`, deferrable `(execution_id, position)` unique, `(execution_id, test_case_id)` unique); header comment notes the Postgres ≥15 requirement — verify it applies cleanly on top of `0001`–`0007`
- [x] 2.2 Enable + force RLS with the standard `tenant_isolation` policy on both tables; grant `railgun_app` `SELECT, INSERT, UPDATE` on `test_execution` and `SELECT, INSERT, UPDATE, DELETE` on `test_run` — verify `npm run db:check-rls` passes and `information_schema.role_table_grants` shows exactly those privileges
- [x] 2.3 Write `0008_test_execution.down.sql` (drop `test_run`, `test_execution`, then the `test_case` constraint) — verify up → down → up round-trips cleanly
- [x] 2.4 Extend the cross-tenant harness/e2e tenant-isolation coverage to the two new tables — verify workspace A's context sees none of B's executions or runs, and no context returns zero rows

## 3. Lifecycle module (pure, no DB)

- [x] 3.1 Create `apps/api/src/executions/execution-lifecycle.ts`: status/outcome types, the transition table (`markReady`, `backToDraft`, `runAll`, `pause`, `resume`, `signOff` → `{from, to, minRole}`), and the elapsed-time helper (`accumulated + (now − lastResumedAt)`) — verify unit tests in `execution-lifecycle.spec.ts` cover every allowed edge, a sample of disallowed ones, and elapsed time across pause/resume
- [x] 3.2 Create `apps/api/src/executions/execution-queries.ts`: shared read of one execution with ordered runs (run name = `COALESCE(snapshot, live test_case.name)`), list query with total/done/Pass/Fail/NeedsReview counts, `toResponse` including `elapsedMsAccumulated`, `lastResumedAt`, server `now`, `environmentId`, `environmentName` — verify typecheck passes; behavior is covered by sections 4–5 e2e tests
- [x] 3.3 Add input validators (name, browser, viewport, locale via `Intl.getCanonicalLocales`, timezone via `Intl.supportedValuesOf('timeZone')` + `UTC`, `testCaseIds` non-empty/unique, outcome ∈ `Pass|Fail|NeedsReview`, mode ∈ `Manual|Automated`) and the defaults from design.md — verify unit tests for each rejection case

## 4. Execution authoring endpoints (`executions.controller.ts`)

- [x] 4.1 `POST /projects/:projectId/executions` (Contributor+): validate test cases belong to the project, aren't deleted, and are `Ready`, validate environment belongs to the project and snapshot its name, insert execution + ordered runs, log `test_execution.created`, all in one `withTenantContext` transaction — verify e2e: Contributor creates A,B,C → `Draft`, three `Pending` runs at positions 1–3; blank name / foreign-project test case / deleted test case / `Draft` or `Deprecated` test case / duplicate id / foreign environment → 400; Viewer → 403
- [x] 4.2 `GET /` and `GET /:executionId` (Viewer+) — verify e2e: list shows counts (total 3, done 1, Pass 1 after one outcome); detail returns runs in position order with name and outcome; no-access caller → 403; another workspace's execution id via own project route → 404
- [x] 4.3 `PATCH /:executionId` (Contributor+, Draft only): metadata update plus optional `testCaseIds` that replaces the run list (delete + reinsert in one transaction), refresh `environment_name` when environment changes, log `test_execution.updated` — verify e2e: A,B,C → C,A,D gives C,A,D at 1–3 with B gone; replacing with a list containing a `Deprecated` test case → 400 and unchanged; PATCH on a `Ready` execution → 409 and unchanged
- [x] 4.4 `DELETE /:executionId` (Admin, Draft only) as soft delete (`deleted_at`/`deleted_by`), log `test_execution.deleted` — verify e2e: Admin deletes Draft → gone from list, detail 404; Contributor → 403; `InProgress` execution → 409 and unchanged
- [x] 4.5 Register the controller(s) in `app.module.ts`; confirm the ESLint `no-restricted-imports` rule needs no new allow-list entry (controllers use `PrismaService` + `withTenantContext` like `test-cases.controller.ts`) — verify `npm run lint -w apps/api` passes

## 5. Lifecycle endpoints (`execution-lifecycle.controller.ts`)

- [x] 5.1 Shared transition helper: conditional `UPDATE ... WHERE status = :from AND deleted_at IS NULL RETURNING`, zero rows → re-read to return 404 vs 409, then log the transition in the same transaction — verify via the endpoint tests below
- [x] 5.2 `POST .../mark-ready` and `.../back-to-draft` (Contributor+); mark-ready refuses (409) when any run's test case is deleted, nulled, or no longer `Ready` — verify e2e: Draft → Ready → Draft; Pause on `Ready` → 409; mark-ready after deleting one of its test cases → 409, stays `Draft`; mark-ready after changing one of its test cases to `Deprecated` → 409, stays `Draft`
- [x] 5.3 `POST .../run-all` (Contributor+, body `{ mode }`): `Automated` → 422; zero runs → 409; otherwise status `InProgress`, `started_at`/`last_resumed_at = now()`, and the one-statement snapshot `UPDATE` — verify e2e: start → `InProgress` with `lastResumedAt` set; editing then deleting a test case afterwards leaves the run's reported name and script unchanged; Viewer → 403; two concurrent run-all requests → exactly one 200, one 409
- [x] 5.4 `POST .../pause` and `.../resume` (Contributor+), accumulating/restarting the timer in the same `UPDATE` — verify e2e: after pause `lastResumedAt` is null and `elapsedMsAccumulated` > 0 and unchanged on re-read after a short wait; after resume the accumulator is unchanged and `lastResumedAt` is set
- [x] 5.5 `PATCH .../runs/:runId` (Contributor+, body `{ outcome }`): lock the execution row (`FOR UPDATE`), allow only `InProgress`/`Completed` (else 409), reject `Pending`/unknown (400), log `test_run.outcome_set`; if `InProgress` and no `Pending` remains, transition to `Completed` (accumulate timer, `completed_at`) and log `test_execution.completed` — verify e2e: Pass recorded; Paused → 409; `Pending` → 400; Viewer → 403; last outcome (incl. `NeedsReview`) → `Completed` with timer stopped and both log entries present; two concurrent last-two outcomes still end `Completed`
- [x] 5.6 `POST .../sign-off` (Admin): conditional on `Completed` and no `NeedsReview` runs; sets `signed_off_at`/`signed_off_by` — verify e2e: all Pass/Fail → `Done` with signer reported; one `NeedsReview` → 409; changing it to `Fail` then signing → `Done`; Contributor → 403

## 6. Test-case delete guard

- [x] 6.1 In `test-cases.controller.ts`'s delete, inside the existing transaction, refuse with 409 when the test case has a run in a `Ready`/`InProgress`/`Paused` execution — verify e2e (added to `test-cases.e2e-spec.ts`): delete while in a `Ready` execution → 409, not deleted; delete when only in `Draft`/`Completed`/`Done` executions → 204
- [x] 6.2 Verify the G10 behavior end to end: deleting an environment referenced by an execution succeeds, and the execution then reports `environmentId: null` with its `environmentName` intact

## 7. Final verification

- [x] 7.1 Run `npm run lint`, `npm run typecheck`, `npm test -w apps/api`, `npm run db:check-rls` — verify all pass
- [x] 7.2 Update CLAUDE.md only if something new is non-obvious (e.g. the Postgres ≥15 FK requirement); add this slice's Built / Key decisions / Deferred entry to roadmap-mvp.md Phase 7

## Workflow follow-up

- Archive with `/opsx:archive` once all tasks are done.
- Slice 2 (separate change): Executions screen — list, detail header with live timer (using the server `now` for skew), lifecycle buttons by role, runs table, run side panel outcome control, New Execution modal (react-hook-form + zod), TanStack Query polling.
