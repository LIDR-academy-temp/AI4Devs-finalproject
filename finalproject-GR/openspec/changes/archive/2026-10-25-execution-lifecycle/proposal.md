# Proposal

## Why

Test cases can be authored (Phase 4) and environments configured (Phase 5), but there is still no way to actually *run* anything. The Test Execution lifecycle (PRD §6.3.4) is the product's architectural center of gravity and one of the MVP roadmap's non-negotiables: a transactional, DB-persisted state machine with snapshot-on-start and a pause-aware elapsed timer. Shipping a simplified lifecycle now would mean reconciling already-created executions later, so it is built in full shape — minus Cancel and Try Again, which roadmap-mvp.md Phase 7 explicitly defers.

Per the slicing decision for this phase, this change is **Slice 1: backend only** (DB + API + e2e tests). The Executions screen (list, detail header with live timer, runs table, run side panel, New Execution modal, polling) is Slice 2, a separate change — the same backend-then-frontend split Phases 4/5 → 6 already followed.

## What Changes

- **New tables** `test_execution` and `test_run` (standard `workspace_id`-keyed RLS, ADR 0003). Executions carry the PRD §7.2 metadata (name, description, environment, browser, viewport, locale, timezone, auto-create-bug toggle), lifecycle status, timer fields (`elapsed_ms_accumulated`, `last_resumed_at` — ADR 0005's "computed in the browser" model), sign-off fields, and soft-delete columns (ADR 0007). Runs carry an ordered position, a nullable test case reference, snapshot columns for the test case name and Gherkin script, and an outcome.
- **Draft authoring (Contributor+):** create an execution in `Draft` with an ordered list of test cases (one run each) — only test cases in `Ready` status are selectable (per decision; the PRD is silent, recorded as a new open-questions item resolved by ADR 0012), and Mark as Ready re-checks this; edit its metadata and replace/reorder its run list while still `Draft`. **Admin** may soft-delete a `Draft` execution.
- **Lifecycle transitions** as one domain state machine, each a single conditional update guarded on the expected current status (concurrent conflicting transitions → HTTP 409):
  - `Draft → Ready` (Mark as Ready), `Ready → Draft` (Back to Draft) — Contributor+.
  - `Ready → InProgress` (Run All, **Manual mode only**; `Automated` is rejected as unavailable per PRD §6.3.4/§9) — Contributor+. Refused when the execution has no runs. Snapshots every run's test case name and Gherkin script at that moment.
  - `InProgress ⇄ Paused` (Pause / Resume) — Contributor+. Paused time is excluded from elapsed time.
  - `InProgress → Completed` — **automatic**, when the last `Pending` run receives an outcome (resolves open-questions **G6**, per decision).
  - `Completed → Done` (Sign Off) — Admin only; **refused while any run is `Needs Review`** (G6, per decision).
- **Manual outcome entry (Contributor+):** set a run's outcome to `Pass`, `Fail`, or `Needs Review` while the execution is `InProgress` or `Completed` (so Needs Review can be resolved before sign-off).
- **Activity log:** every create/edit/delete/transition/outcome change writes an `ActivityLogger.log` entry in the same transaction (ADR 0007) — the data the PRD §6.3.3 execution activity panel will read in Slice 2.
- **Closes Phase 4's recorded gap:** deleting a test case is refused (HTTP 409) while it belongs to an *active* execution (`Ready`, `InProgress`, `Paused`) — PRD §6.2.5.
- **Resolves G10 by applying the data model's existing note:** deleting an environment clears an execution's environment link but keeps its name (snapshotted on the execution).
- **ADR 0012** records the G6 decision (amending ADR 0005, whose lifecycle rule this refines), and open-questions.md moves G6 and G10 to the resolved table.

**Explicitly deferred (recorded, not silently omitted):** Cancel and Try Again (and therefore G7) — the `Canceled` status value exists in the schema's check constraint but no transition reaches it yet; Automated mode; auto-create-bug behavior (the toggle is stored, but acting on it is Phase 8 / G8); step results, attempt history, AI confidence, console drawer, traceability graph; execution list filtering/sorting beyond a default order; the curated locale/timezone picker lists (G9 stays open — this slice validates values against `Intl` rather than a fixed list); all frontend work (Slice 2).

## Capabilities

### New Capabilities
- `test-execution-authoring`: creating, listing, viewing, editing, and deleting executions and their ordered run lists while in `Draft`, including execution metadata and environment linkage.
- `test-execution-lifecycle`: the execution state machine (Mark as Ready, Back to Draft, Run All, Pause, Resume, auto-Complete, Sign Off), snapshot-on-start, the pause-aware elapsed timer, and manual run outcome entry.

### Modified Capabilities
- `test-case-authoring`: an Admin's delete is refused while the test case belongs to an active execution.

## Impact

- **DB:** new migration `0008_test_execution.up/down.sql` — `test_execution`, `test_run`, plus `UNIQUE (id, workspace_id)` on `test_case` so runs can use the project's composite tenant FK pattern. `db:check-rls` must pass with the two new tables.
- **API:** new `apps/api/src/executions/` controller(s) nested under `/projects/:projectId/executions` (same nesting rule as test cases/environments — no bare-id lookups, no new RLS shape); `test-cases.controller.ts`'s delete gains one active-execution check.
- **Web:** none in this slice.
- **Docs:** new ADR 0012; open-questions.md (G6, G10 resolved); roadmap-mvp.md Phase 7 marked in progress with this slice.
- **Dependencies:** none new.
