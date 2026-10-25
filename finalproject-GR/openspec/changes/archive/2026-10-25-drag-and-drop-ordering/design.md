# Design

## Context

See proposal.md - Why. What this builds on:

- **API:**
  - `test_run.position` is an `integer`, with `UNIQUE (execution_id, position) DEFERRABLE INITIALLY DEFERRED` (migration 0008). Positions can be rewritten in one transaction without collisions.
  - `PATCH /executions/:id` with `testCaseIds` deletes and reinserts every run (new run ids). The form already skips re-sending an unchanged list for that reason.
  - Lifecycle transitions are conditional `UPDATE test_execution … WHERE status = …` (row lock). Edits lock the execution with `SELECT … FOR UPDATE`.
  - Patterns as before: routes nested under `/projects/:projectId`, raw SQL inside `withTenantContext`, `logExecutionActivity`, pure rule modules with unit tests, e2e specs in `apps/api/test/`.
- **Web:**
  - `lib/test-case-tree.ts` has `buildTree`, `filterTree`, `flattenVisible`, and `findNode`, all pure and tested.
  - `TestCaseTree` and `TreeRow` use dnd-kit with a "rows stay in place" strategy. That strategy suits a tree with into-zones, not a flat list.
  - `ExecutionFormDialog` keeps `testCaseIds: string[]` in react-hook-form. `RunsTable` is a plain `<table>`.
  - `useApplyExecution` writes a saved execution into the list and detail caches. `ActionError` shows server reasons.
  - shadcn `Checkbox` (Radix) supports `checked="indeterminate"`.

## Goals / Non-Goals

**Goals:**
- Run order changes never change run ids. That covers the runs-table move and details-only edits.
- One sortable-list pattern (dnd-kit `SortableContext` with a drag handle; shared sensors and drop-to-order logic in `lib/sortable-list.ts`) for both the Selected panel and the runs table. *After manual testing:* the Selected panel uses the Test Cases tree's stay-in-place behaviour. Rows don't shift while dragging, a drop line marks the target, a `DragOverlay` label follows the pointer, and the list reorders on drop.
- Every drag also works from the keyboard (dnd-kit `KeyboardSensor` + `sortableKeyboardCoordinates`), as ADR 0014 requires.

**Non-Goals:**
- Dragging from the picker tree into the Selected panel. Checking does that.
- Remembering picker expansion across dialog openings.
- Live updates for Draft executions (still not polled; ADR 0005/0011).

## Decisions

**1. Move endpoint renumbers integer positions (no fractional key for runs).**
`POST /projects/:projectId/executions/:executionId/runs/:runId/move`, body `{ afterRunId?: string | null }`, Contributor+. In one tenant transaction:
1. `SELECT status FROM test_execution … FOR UPDATE`: 404 if missing, 409 unless `Draft`. This serializes with concurrent moves, edits, and Mark as Ready.
2. Load the run ids `ORDER BY position, id`. 404 if `runId` isn't among them.
3. A pure `reorderAfter(ids, runId, afterRunId)` in `execution-input.ts` (or a sibling `run-order.ts`) returns the new id order. It throws 400 when `afterRunId` is the run itself or not in the list, and returns `null` when the order is unchanged.
4. If changed, run one `UPDATE test_run SET position = t.ord FROM unnest(${ids}::uuid[]) WITH ORDINALITY t(id, ord) WHERE test_run.id = t.id`, bump `test_execution.updated_at`, and log `test_execution.runs_reordered` with `{ runId, fromPosition, toPosition }`.
5. Return `loadExecution(...)`, the same response shape as the other execution routes.

Malformed ids are handled like elsewhere: a non-uuid `executionId`/`runId` returns 404, and a non-uuid `afterRunId` returns 400.

*Why integers over ADR 0014's fractional keys:* runs are ordered only while Draft, there are at most a few hundred per execution, and nothing else writes to them concurrently in Draft (the execution lock serializes moves). Rewriting n small rows is trivial, and `position` stays the human-readable "#" the table shows, with no migration. ADR 0014 picked fractional keys for the tree, where siblings span two tables and moves are frequent. *Alternative:* reuse `PATCH testCaseIds`. Rejected (user decision): it recreates every run on each drag and logs a generic edit. A dated note in ADR 0014's Consequences will record that `test_run` keeps renumbered integer positions.

**2. Runs table: optimistic reorder with rollback.**
The client can compute the result exactly (`arrayMove`, then renumber), unlike the tree's server-computed keys. So on drop the detail cache is updated immediately and the move is sent. The server response replaces the cache through `useApplyExecution`. On error the previous snapshot is restored and `ActionError` shows the reason. `afterRunId` is the run now just above the dropped one in the full (unfiltered) list. Sortable is enabled only when `status === 'Draft'`, the role is Contributor or above, no outcome filter is set, and no move is pending. Otherwise rows render exactly as today. Each row gets a grip `button` that carries the dnd-kit listeners and attributes, so clicking the name still opens the run panel. Rows use `useSortable` on `<tr>` with `CSS.Transform.toString` (vertical translate only).

**3. Picker = pure helpers + two components; the form's `testCaseIds` stays the single source of truth.**
- New pure helpers in `lib/test-case-tree.ts`, unit tested:
  - `pickableIds(node)`: Ready test case ids under a node, depth-first in tree order.
  - `folderCheckState(node, selected)`: `'checked' | 'indeterminate' | 'unchecked' | 'empty'`.
  - `toggleFolder(selected, node, checked)`: appends the missing pickable ids in tree order, or removes all of them while keeping the others' order.
- `ExecutionTestCasePicker` (`components/executions/`) loads folders (`folderKeys`/`listFolders`) and test cases (existing query key). It builds the tree with `buildTree`, applies `filterTree` for the name filter, and renders `flattenVisible` rows with a chevron, checkbox, and name. Non-Ready test cases render a disabled checkbox plus a status label. It has its own expansion state: on open, the ancestors of already-selected test cases are expanded, and the filter force-expands matches as on the Test Cases screen.
- `SelectedTestCases` is a sortable `<ol>` with a grip handle, position number, name, and remove button. It has no server calls.
- `ExecutionFormDialog` drops the checkbox list and the "Run order" list and renders the two panels side by side (`md:grid-cols-2`, stacked below `md`). It widens to `sm:max-w-4xl`. Both panels call `setValue('testCaseIds', …, { shouldValidate: true, shouldDirty: true })`. The `sameOrder` guard is unchanged, so an untouched selection isn't re-sent.

*Alternative:* reuse `TestCaseTree` in a "pick mode". Rejected. It carries actions menus, the into-zone drag, persisted expansion, and mutations, and a mode flag would touch most of it. The pure tree helpers are the reusable part.

## Risks / Trade-offs

- [A Draft's run references a test case that is no longer Ready (e.g. Deprecated after the Draft was made)] → It still shows in the Selected panel, marked with its status, so the user can remove it. If the list changed, saving gets the server's 400 reason through `ActionError`. If the list is unchanged it isn't re-sent, so it's harmless.
- [Two users reorder the same Draft at once] → The server serializes moves on the execution lock, and each response is authoritative. The other user's stale view is corrected on their next fetch or move. Draft isn't polled, which is acceptable for planning-time edits.
- [`<tr>` transforms in some browsers] → Only translateY is applied (no scale). The table keeps its fixed column widths, so dragged rows don't collapse.
- [jsdom can't measure layout for dnd-kit] → Component tests drive the keyboard sensor (Space, Arrow, Space), as `test-case-tree.test.tsx` already does. Pure order logic is covered by unit tests.

## Migration Plan

No schema change. The new route and UI ship together. Rollback means reverting the commit; positions written by moves stay valid 1..n.
