# Design

## Context

See proposal.md - Why. Current state this builds on:

- **API pattern** (`executions/`): routes nested under `/projects/:projectId`, `resolveProjectWorkspaceId` + `withTenantContext`, raw SQL via `tx.$queryRaw`, `ProjectRoleGuard`/`@RequireProjectRole`. Pure rules sit in their own module with unit tests (`execution-lifecycle.ts`, `execution-input.ts`). Shared reads and response shaping go in a queries module (`execution-queries.ts`), which already has `loadActorDisplayName` and `logExecutionActivity`.
- **Runs** (`test_run`): carry `test_case_name_snapshot`/`gherkin_script_snapshot`, written by Run All. They're non-null exactly when the execution has started. `test_run (id)` is unique; `test_case` has `UNIQUE (id, workspace_id)` since migration 0008.
- **`"user"` RLS** is self-only, so another user's display name can't be joined at read time. Activity entries already solve this by storing `actor_display_name`.
- **Outcome writes** (`ExecutionLifecycleController.setOutcome`) lock the execution row `FOR UPDATE`, then update the run and log, all in one transaction. That's the natural place for auto-creation, with the lock already serializing writes per execution.
- **Web pattern** (`components/executions/`):
  - Split screen with `?param=<id>` selection behind `<Suspense>`.
  - TanStack Query with REST-mirroring keys.
  - Pure permission and list-view modules, plus `ApiError`/`ActionError`.
  - shadcn `Dialog`/`Sheet`/`Select`, and react-hook-form + zod forms.
  - `RunPanel` already gets `execution`, `runId` and `role`.

## Goals / Non-Goals

**Goals:**
- Bugs end to end (file → triage → close) against the real API, with the snapshot and failed step always derived server-side.
- Auto-creation that can't double-fire and can't fail silently: same transaction as the outcome.
- Reuse the Executions screen's patterns 1:1, so the Bugs screen adds no new UI machinery.

**Non-Goals:**
- Images, tags, the bug activity panel, the dashboard, unlinking or relinking runs (proposal.md - deferred).
- A status workflow engine. G4 was decided as any → any, so status is a validated enum, not a state machine.

## Decisions

**Schema (`0009_bug`)**, following the readme §3 data model:
- `bug`: `id`, `project_id`, `workspace_id`, `title`, `severity CHECK IN ('Critical','High','Medium','Low')`, `status CHECK IN ('Open','InProgress','Resolved','Closed','WontFix') DEFAULT 'Open'`, `description`, `steps_to_reproduce`.
- Links: `test_run_id`, `test_case_id`, both nullable.
- Snapshots: `test_case_name_snapshot`, `gherkin_snapshot`, `failed_step_snapshot`.
- `reporter_id NOT NULL REFERENCES "user"`, `reporter_display_name NOT NULL`, `auto_created boolean DEFAULT false`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`.
- FKs:
  - `(project_id, workspace_id) → project ON DELETE CASCADE`.
  - `(test_run_id, workspace_id) → test_run (id, workspace_id) ON DELETE SET NULL (test_run_id)`. `test_run` needs `UNIQUE (id, workspace_id)` added; it already holds since `id` is the PK.
  - `(test_case_id, workspace_id) → test_case ON DELETE SET NULL (test_case_id)`.
- A **partial unique index `ON bug (test_run_id) WHERE auto_created AND deleted_at IS NULL`** enforces "at most one auto-created bug per run" in the database, not only in code. Also indexes on `(project_id) WHERE deleted_at IS NULL` and on `(test_run_id)`.
- Grants: `SELECT, INSERT, UPDATE` (soft delete only).
- `deletion_id` from the readme is left out. It exists for restoring a folder or project subtree from Trash together; a bug is a leaf, and nothing reads the column until the Trash phase.
- Alternative rejected: a separate `bug_run_link` join table for many runs per bug. The PRD and readme model one run per bug, and "link existing" only targets unlinked bugs.

**Reporter name stored, not joined:** `reporter_display_name` is written at creation from `loadActorDisplayName`, the same lookup the execution controllers use. Because users can only read their own row, a join would return the name only for your own bugs. This mirrors `activity_entries.actor_display_name`. Alternative rejected: a narrowly-scoped `SELECT` policy on `"user"` for co-members. That's a new RLS shape for one display field, and future member management will need its own policy design anyway.

**Snapshot comes from the run, inside the write's transaction.** For create-with-`testRunId` and for link, one query loads the run through its execution, filtered by project, non-deleted, and status not in `('Draft','Ready')`. It reads `test_case_name_snapshot`, `gherkin_script_snapshot`, `test_case_id` and the execution's status, then copies those into the bug. A missing run or an unstarted execution gives 400. Snapshot text in the request body is ignored, because the API never accepts it.

**Failed-step rule** (pure, `bugs/bug-rules.ts`): `isFailedStepOf(script, step)` is true when `step.trim()` is non-empty and equals some `line.trim()` of `script.split(/\r?\n/)`. The stored value is the trimmed line. The web highlights every line whose trim equals it; identical repeated lines are an accepted edge case. This makes "highlight the failed step in red" deterministic without step results. Alternative rejected: storing a line index. It's fragile to explain in the API, and the readme models `failed_step_snapshot` as text.

**Linking:** `POST /bugs/:bugId/link-run` with body `{ testRunId }`, Contributor+. A conditional `UPDATE ... WHERE id = :bug AND test_run_id IS NULL AND deleted_at IS NULL` sets the run, test case, name and script snapshots, and clears `failed_step_snapshot`. A manual bug had none, and linking doesn't pick one. Zero rows → re-read → 404, or 409 if the bug already has a run. That's the same conditional-update idiom as the lifecycle verbs.

**Status and severity are any → any.** `PATCH /bugs/:bugId` validates enums, title, and nullable text fields with the `COALESCE`/`CASE WHEN` pattern from executions. It logs `bug.updated` with `{ changes: { field: { from, to } } }`, so status history is reconstructable from the activity log (ADR 0012-style auditability, G4).

**Auto-create in `setOutcome`.** After the run update and its log, if `outcome === 'Fail'` and the locked execution row's `auto_create_bug` is true, it runs `INSERT INTO bug (...) SELECT ... FROM test_run WHERE id = :run ON CONFLICT DO NOTHING`, using the partial unique index as the conflict target. It returns the id, and logs `bug.created` with `{ auto: true, testRunId }` only if a row was inserted. The insert uses the run's snapshot and the acting user as reporter. It needs the actor's display name, which the controller already loads. The `SELECT` for `auto_create_bug` joins the existing `FOR UPDATE` query, so there's no extra lock. The insert lives in `bugs/bug-queries.ts` as `autoCreateBugForRun(tx, actor, runId)`, keeping bug SQL in the bugs module; the lifecycle controller only calls it. Alternative rejected: a background job (ADR 0005 queue). A bug that fails to appear after a 200 is worse than one transaction doing slightly more work, and there's no queue yet.

**Endpoints** (all `/projects/:projectId/bugs`):
- `POST /`, `GET /` (optional `?testRunId=`), `GET /:bugId`, `PATCH /:bugId` (Contributor+ for writes, Viewer+ for reads).
- `POST /:bugId/link-run` (Contributor+), `DELETE /:bugId` (Admin, soft delete).
- The response embeds `run: { id, executionId, executionName, position, outcome, deleted } | null` and `testCase: { id, deleted } | null`. Both are resolved with `LEFT JOIN`s, so a soft-deleted test case or execution shows `deleted: true` (PRD §2.11). A purged one has the link nulled by the FK.

**Web:**
- `app/(app)/bugs/page.tsx` + `components/bugs/bugs-screen.tsx`, a copy of the `ExecutionsScreen` shape with `?bug=`.
- `bug-list.tsx` with client-side sort and filter in `lib/bug-list-view.ts`. Severity order is Critical > High > Medium > Low; status order follows the lifecycle.
- `bug-detail.tsx`:
  - Title input and description/steps textareas saved on blur, like `TestCaseDetail`.
  - Status and severity `Select`s that save on change.
  - Read-only text for Viewers.
  - Linked run/test-case sections.
  - `GherkinSnapshot` renders lines in a `<pre>`, giving the matching one `bg-red-…` and `aria-label="Failed step"`.
- `bug-form-dialog.tsx`, react-hook-form + zod: title, severity (default Medium), description, steps. With a `run` prop it also shows the script lines as a radio list for the failed step (optional), and sends `testRunId` + `failedStep`.
- Permissions: `lib/bug-permissions.ts` (`canEditBug`, `canDeleteBug`, `canFileBugFromRun(status, role)`).
- `RunPanel` gains a `RunBugs` section: a `GET /bugs?testRunId=` query listing linked bugs as links to `/bugs?bug=<id>`, plus File bug (opens `BugFormDialog` with the run) and Link existing bug (a `Select` of project bugs without a run, then `link-run`). On success it invalidates the bug list and the run's bug query.
- Shell: a Bugs nav link.
- `TestCasesScreen` reads `?testCase=` as its initial selection, so its page also gets a `<Suspense>` wrapper.
- Query keys: `['projects', p, 'bugs']`, `['projects', p, 'bugs', id]`, `['projects', p, 'bugs', { testRunId }]`. Setting a run to Fail may auto-create a bug, so the outcome mutation also invalidates `['projects', p, 'bugs']` (prefix).

**Testing:**
- API: e2e for every scenario in `bug-tracking`, covering create, the snapshot, the failed-step rule, linking and its 409, any → any status, Admin delete, tenant 404, and auto-create (on, off, once per run, plus one concurrent double-Fail case). Unit tests for `bug-rules.ts`. A tenant-isolation test for the `bug` table.
- Web: unit tests for `bug-list-view.ts` and `bug-permissions.ts`. Component tests for the list's sort and filter; detail inline edits, failed-step highlight and deleted links; the form's validation and failed-step picker; the run panel's bug list, File bug, and Link existing; nav; the `?testCase=` deep link.

## Risks / Trade-offs

- [A stored reporter name goes stale if a user renames themselves] → Same accepted trade-off as the activity log; it's acceptable for an audit-style field. Revisit with member management.
- [Text-match failed step can't tell apart identical repeated lines] → Rare in Gherkin; all matches get highlighted. A line index can be added later without migrating existing text.
- [The auto-create insert adds work to every Fail write] → One conditional insert under a lock that's already held; it only runs when the toggle is on.
- [Linking is one-way (no unlink) in the MVP] → Explicitly deferred. A mistaken link means deleting and refiling the bug (Admin), which is acceptable at MVP scale.
- [`test_run` gets a new unique constraint] → Additive, and already true via the PK, so it's a fast constraint add.
