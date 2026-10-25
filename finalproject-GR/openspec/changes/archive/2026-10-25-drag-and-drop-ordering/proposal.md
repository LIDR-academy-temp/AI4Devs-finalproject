# Proposal

## Why

The New/Edit Execution form still picks test cases from a flat checkbox list, and the run order is whatever order the boxes were ticked in, so fixing a mistake means unticking and re-ticking. Now that test cases live in a folder tree (Phase 9 Slice 2), the form should pick from that tree (PRD §7.2) with a "selected" panel that can be reordered by drag, and a Draft execution's runs should be reorderable in place (PRD §6.3.3, §6.3.4). This is roadmap-mvp.md Phase 9, Slice 3. ADR 0014 already chose dnd-kit for it.

## What Changes

- **API:** new `POST /projects/:projectId/executions/:executionId/runs/:runId/move` with `{ afterRunId: string | null }`. It moves one run of a **Draft** execution to just after `afterRunId`, or to the start when `afterRunId` is null. The server renumbers positions 1..n in one transaction, and run ids stay the same. It is refused with 409 outside Draft, 400 for an `afterRunId` that isn't another run of the same execution, and 403 for Viewers. It writes a `test_execution.runs_reordered` activity entry.
- **Web: execution form picker.** The flat checkbox list is replaced by a two-panel picker:
  - Left: the project's folder tree (folders first, same order as the Test Cases screen) with a name filter. Only Ready test cases can be checked; Draft and Deprecated ones are shown greyed out with their status. Checking a folder adds every Ready test case under it, in tree order, that isn't already selected; unchecking it removes them. A folder shows checked, indeterminate, or unchecked.
  - Right: a "Selected" panel listing the picked test cases in run order. It can be reordered by drag and drop (pointer and keyboard) and each item has a remove control. Its order is the run order that gets saved.
- **Web: runs table.** For Contributors and Admins, a Draft execution's runs table gets a drag handle per row. Rows can be reordered by pointer or keyboard, and a drop calls the move endpoint. Reordering is turned off while a stats-bar outcome filter is active, outside Draft, and for Viewers.
- Edit mode keeps today's rule: an unchanged selection isn't re-sent, so run ids survive a details-only edit.

Out of scope: removing individual runs from the runs table (PRD §6.3.3 hover remove), "add to existing execution", tags in the picker, multi-select drag, and Try Again's subset picker.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `test-execution-authoring`: adds a requirement for moving a single run within a Draft execution (order, stable ids, Draft-only, validation, role, activity).
- `executions-screen`: the create/edit form requirement changes from "picked order is the run order" to a folder-tree picker plus a reorderable Selected panel. Adds a requirement for drag-and-drop reordering of a Draft execution's runs table.

## Impact

- **API:** [apps/api/src/executions/executions.controller.ts](../../../apps/api/src/executions/executions.controller.ts) (new route, or a small sibling controller); e2e coverage in `apps/api/test/executions.e2e-spec.ts`. No migration: `test_run.position` is already `UNIQUE … DEFERRABLE INITIALLY DEFERRED`, so renumbering inside one transaction already works.
- **Web:** `execution-form-dialog.tsx` (picker replaced, wider dialog), new picker and selected-panel components under `components/executions/`, `runs-table.tsx` (sortable rows), `lib/executions-api.ts` (`moveRun`), and the pure tree helpers in `lib/test-case-tree.ts` (Ready descendants of a folder, folder check state). Existing form tests that rely on the "Run order" list or the flat checkboxes need updating.
- **Dependencies:** none new. `@dnd-kit/core` and `@dnd-kit/sortable` are already installed (ADR 0014).
- **Docs:** roadmap-mvp.md Phase 9 Slice 3 entry, updated when the change is archived.
