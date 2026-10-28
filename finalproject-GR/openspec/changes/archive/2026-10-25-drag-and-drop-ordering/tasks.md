# Tasks

## 1. Decisions and docs

- [x] 1.1 ADR 0014 Consequences: add a dated (2026-10-25) note that `test_run` keeps integer `position`, renumbered 1..n by the Draft-only run move (why: small lists, execution lock serializes moves, `#` stays readable, no migration). Verify the note reads correctly next to decision 3
- [x] 1.2 roadmap-mvp.md: mark Phase 9 Slice 3 🚧 and point it at OpenSpec change `drag-and-drop-ordering`. Verify the legend matches Slices 1–2

## 2. API: run move

- [x] 2.1 Pure `reorderAfter(ids, runId, afterRunId)` (in `src/executions/`). It returns the new order or `null` for a no-op, and throws `BadRequestException` when `afterRunId` is the run itself or not in the list. Verify unit tests: move after another, move to first (`null`), move last, no-op returns null, self and unknown `afterRunId` throw
- [x] 2.2 `POST /projects/:projectId/executions/:executionId/runs/:runId/move` (Contributor+) per design.md decision 1: `FOR UPDATE` on the execution, 409 unless Draft, 404 for an unknown or foreign run or non-uuid ids, 400 for a non-uuid `afterRunId`, one `unnest … WITH ORDINALITY` position rewrite, `updated_at` bump, `test_execution.runs_reordered` activity only when changed, returns `loadExecution`. Verify additions to `test/executions.e2e-spec.ts`: A,B,C → C after A gives A,C,B with unchanged run ids; to first gives C,A,B; no-op succeeds and writes no activity entry; `afterRunId` from another execution 400; run of another execution 404; Ready execution 409; Viewer 403; other workspace 404; activity entry names the actor. Existing execution and lifecycle e2e specs still pass

## 3. Web: data and pure helpers

- [x] 3.1 `lib/executions-api.ts`: `moveRun(client, projectId, executionId, runId, afterRunId)`. Verify typecheck
- [x] 3.2 `lib/test-case-tree.ts`: `pickableIds(node)`, `folderCheckState(node, selected)`, and `toggleFolder(selected, node, checked)` per design.md decision 3. Verify unit tests in `test-case-tree.test.ts`: nested Ready ids in tree order (folders first, Draft/Deprecated skipped); checked / indeterminate / unchecked / empty states; checking appends only missing ids in tree order; unchecking removes the subtree's ids and keeps the rest in order

## 4. Web: execution form picker

- [x] 4.1 `components/executions/selected-test-cases.tsx`: sortable `<ol>` (dnd-kit `SortableContext`, `verticalListSortingStrategy`, pointer + keyboard sensors) with a grip handle, position, name, remove button, and a status marker for a non-Ready entry. Verify a component test: keyboard drag (Space, ArrowDown, Space) moves an item down one place and calls `onChange` with the new order; remove calls `onChange` without it
- [x] 4.2 `components/executions/execution-test-case-picker.tsx`: folder tree from `listFolders` + `listTestCases` via `buildTree`, name filter via `filterTree`, local expansion (ancestors of selected expanded on open), checkboxes using the helpers from 3.2, Draft/Deprecated shown disabled with their status. Verify component tests: Draft test case labelled and not checkable; checking a folder selects its nested Ready test cases in tree order; partly selected folder shows indeterminate; filter "card" shows the match and its ancestor folder only
- [x] 4.3 `ExecutionFormDialog`: replace the checkbox list and "Run order" list with picker + Selected panel side by side (`md:grid-cols-2`, dialog `sm:max-w-4xl`), both writing `testCaseIds` through `setValue`; keep the `sameOrder` guard. Verify `execution-form-dialog.test.tsx` updated and passing: create sends the Selected panel's order; "Pick at least one test case" still shown; edit without selection changes sends no `testCaseIds`; reordering in the panel then saving sends the new order; Run pre-selects the test case (`executions-screen.test.tsx` / test case Run flow still passes)

## 5. Web: runs table reorder

- [x] 5.1 `RunsTable` gains `reorderable` and `onMove(runId, afterRunId)`; when reorderable, rows use `useSortable` on `<tr>` with a grip button (listeners on the grip only, so the name still opens the run panel). Verify component tests: keyboard drag of the third row to the top calls `onMove(thirdId, null)`; no grip rendered when not reorderable
- [x] 5.2 `ExecutionDetail`: `reorderable = status === 'Draft' && role ≥ Contributor && outcomeFilter === null && !move.isPending`; mutation with optimistic cache update (`arrayMove` + renumber), rollback on error with `ActionError`, `useApplyExecution` on success, `notifySuccess('Run order updated')`. Verify `execution-detail.test.tsx`: Contributor on Draft sees grips and a move calls the API and shows the new order; Viewer, Ready execution, and active Pending filter show no grips; a 409 restores the previous order and shows the server's reason

## 6. Integration check

- [x] 6.1 Run root `npm run lint` and `npm run typecheck`, plus the API's unit and e2e tests and the web tests (each workspace's own scripts); all pass. Manually: create an execution by checking a folder, reorder in the Selected panel, save, drag a run in the Draft runs table, reload, and confirm the order persisted and the run panel still opens the same run

## Workflow follow-up

- User tests the slice manually before any commit (no commits until MVP v1 is user-tested).
- On archive: update roadmap-mvp.md Phase 9 Slice 3 to ✅ with Built / Key decisions / Deferred, as for Slices 1–2.
