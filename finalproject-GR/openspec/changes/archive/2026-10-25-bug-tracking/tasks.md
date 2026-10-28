# Tasks

## 1. Record the decisions

- [x] 1.1 Write `docs/adr/0013-bug-lifecycle-and-auto-creation.md` (amends ADR 0007, which models bug snapshots/purge): G4 any → any status for Contributor+ with every change activity-logged; G8 auto-create on setting Fail, same transaction, at most once per run (DB-enforced), severity Medium, tester as reporter; failed step = one trimmed line of the snapshot; one run per bug, link only unlinked bugs; reporter name stored like the activity log's actor name. Add 0013 to ADR 0001's and 0007's amended-by headers — verify links resolve
- [x] 1.2 open-questions.md: move G4 and G8 to the resolved table → ADR 0013 — verify neither remains in section G
- [x] 1.3 roadmap-mvp.md: Phase 8 🚧 In progress with a single-slice entry pointing at `bug-tracking` — verify the legend still matches

## 2. Migration

- [x] 2.1 `db/migrations/0009_bug.up.sql`: add `UNIQUE (id, workspace_id)` to `test_run`; create `bug` exactly as design.md (checks, composite FKs with `ON DELETE SET NULL (column)`, partial unique index for auto-created bugs per run, project and run indexes), standard `tenant_isolation` RLS, grant `SELECT, INSERT, UPDATE` — verify it applies on `0001`–`0008`, `npm run db:check-rls` passes, and grants are exactly those three
- [x] 2.2 `0009_bug.down.sql` (drop `bug`, then the `test_run` constraint) — verify up → down → up round-trips
- [x] 2.3 Extend `test/tenant-isolation.e2e-spec.ts` to `bug` — verify cross-workspace reads return nothing and no context returns zero rows

## 3. API

- [x] 3.1 `apps/api/src/bugs/bug-rules.ts`: `BugStatus`/`BugSeverity` lists, `isFailedStepOf(script, step)` (trimmed line match, non-blank), input parsing for create/update (title non-blank, enums, nullable text) — verify `bug-rules.spec.ts` covers each accept/reject case including CRLF scripts and blank steps
- [x] 3.2 `apps/api/src/bugs/bug-queries.ts`: bug read shape with `run { executionId, executionName, position, outcome, deleted }` and `testCase { id, deleted }` via LEFT JOINs, list (optional `testRunId`), `loadStartedRun(tx, projectId, runId)` (400 if missing/unstarted/other project), `logBugActivity`, and `autoCreateBugForRun(tx, actor, runId)` using `INSERT … ON CONFLICT DO NOTHING` — verify typecheck (behavior via e2e)
- [x] 3.3 `bugs.controller.ts`: `POST /` (optional `testRunId` + `failedStep`, snapshot from the run, failed step validated against it), `GET /` (+`?testRunId=`), `GET /:bugId`, `PATCH /:bugId` (logs `{ changes: { field: { from, to } } }`), `POST /:bugId/link-run` (conditional update, 409 if already linked), `DELETE /:bugId` (Admin, soft) ; register in `app.module.ts` — verify `test/bugs.e2e-spec.ts`: manual bug Open with reporter name; blank title/unknown severity → 400; Viewer → 403; filing from an In Progress run copies its snapshot and later test case edits don't change it; Draft-execution run → 400; valid failed step stored, step not in script → 400; Open → InProgress → Resolved → Closed → Open all succeed; unknown status → 400; Viewer PATCH → 403; link unlinked bug → snapshot copied; link linked bug → 409 unchanged; Admin delete → gone/404; Contributor delete → 403; `?testRunId=` returns only that run's bugs; other workspace's bug → 404; activity entries for create/status change/link/delete
- [x] 3.4 Auto-create in `ExecutionLifecycleController.setOutcome`: include `auto_create_bug` in the locked execution read; on `Fail` with the toggle on, call `autoCreateBugForRun`, log `bug.created` `{ auto: true }` only when inserted — verify e2e (in `bugs.e2e-spec.ts`): toggle on + Fail → one Open/Medium bug titled with the test case name, `autoCreated: true`, reporter = tester; toggle off → none; Fail → Pass → Fail → still exactly one; existing lifecycle e2e still passes

## 4. Web — Bugs screen

- [x] 4.1 `lib/bugs-api.ts` (types mirroring the API response; list/get/create/update/delete/linkRun; `bugKeys`), `lib/bug-permissions.ts`, `lib/bug-list-view.ts` (sort: updatedAt, createdAt, status lifecycle order, severity Critical→Low; filter: title, status, severity) — verify unit tests for permissions per role/status and every sort/filter
- [x] 4.2 `app/(app)/bugs/page.tsx` (`<Suspense>`) + `components/bugs/bugs-screen.tsx` with `?bug=` selection, and the shell's **Bugs** nav link — verify tests: `?bug=<id>` shows that bug; selecting updates the URL; nav marks Bugs current
- [x] 4.3 `bug-list.tsx`: title, severity dot, status badge, sort/filter controls, empty state with New only for Contributor+ — verify tests: filter by status narrows; severity sort desc puts Critical first; Viewer empty state has no New
- [x] 4.4 `bug-detail.tsx` + `gherkin-snapshot.tsx`: inline title/description/steps (save on blur), status and severity selects, reporter, linked run (link to `/executions?execution=…`, run position + outcome), linked test case (link to `/test-cases?testCase=…`), deleted links as plain "deleted" text, snapshot with the failed step highlighted, Admin delete with confirmation, refusals via `ActionError` — verify tests: status change calls PATCH and updates the view; Viewer sees no inputs; failed step line has `aria-label="Failed step"`; deleted test case isn't a link; manual bug shows "none" sections; Admin delete clears `?bug`
- [x] 4.5 `bug-form-dialog.tsx` (react-hook-form + zod): title required, severity default Medium, description, steps; with a `run`, title pre-filled from the run's test case name and the script's non-blank lines as an optional failed-step radio list; sends `testRunId`/`failedStep` — verify tests: missing title blocks submit; picking a line sends it as `failedStep`; without a run no step picker is shown

## 5. Web — run panel and Test Cases deep link

- [x] 5.1 `components/executions/run-bugs.tsx` inside `RunPanel`: linked bugs (`?testRunId=` query) as links to `/bugs?bug=…`; **File bug** (opens `BugFormDialog` with the run) and **Link existing bug** (select of project bugs with no run → `link-run`) for `canFileBugFromRun`; the outcome mutation also invalidates the bugs prefix — verify tests: linked bug listed with link; File bug with a picked step creates and lists it; not offered for a Draft execution or to a Viewer; linking a bug calls `link-run` and lists it
- [x] 5.2 `TestCasesScreen` reads `?testCase=` as the initial selection; its page gains `<Suspense>` — verify test: `?testCase=<id>` renders that test case's detail

## 6. Final verification

- [x] 6.1 Run `npm run lint`, `npm run typecheck`, `npm run test -w apps/web`, `npm test -w apps/api`, `npm run db:check-rls`, and `npm run build -w apps/web` — verify all pass
- [x] 6.2 Manual check (`npm run dev`): fail a run on an auto-create execution → bug appears in the run panel and Bugs screen; File bug from another run with a failed step → highlighted in detail; triage Open → In Progress → Resolved → Closed; link a manual bug to a run; follow the bug's execution and test case links; Admin delete — record anything that diverges
- [x] 6.3 roadmap-mvp.md Phase 8 Built / Key decisions / Deferred entry; mark Phase 8 ✅ once archived

## Workflow follow-up

- Archive with `/opsx:archive` once all tasks are done.
