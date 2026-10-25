# Tasks

## 1. Decisions and docs

- [x] 1.1 Write `docs/adr/0014-drag-and-drop-and-ordering.md` (amends ADR 0011, resolves F6's drag-and-drop part): dnd-kit; in-house base-36 fractional keys, `COLLATE "C"`, server-generated, tie-break by id; folders-first ordering; Move to… as the accessible alternative; why not `fractional-indexing` (ESM-only vs CommonJS Jest). Add 0014 to ADR 0001/0011 amended-by headers — verify links resolve
- [x] 1.2 PRD §2.11 and §6.2.5: test case and folder deletion blocked by "Ready, In Progress, or Paused" executions (Draft removed, citing ADR 0012); ADR 0012: dated correction note under decision 4; open-questions.md F6: drag-and-drop part resolved → ADR 0014 — verify wording in all three
- [x] 1.3 roadmap-mvp.md: Phase 9 Slice 2 🚧 pointing at `folder-tree` — verify legend

## 2. Migration

- [x] 2.1 `db/migrations/0010_folder.up.sql`: `folder` table per design.md (composite FKs, partial unique sibling-name index, `position_key text COLLATE "C"`, soft-delete + `deletion_id`, RLS, `SELECT, INSERT, UPDATE` grant); `test_case` gains `folder_id` (composite FK), `deletion_id`, `position_key text COLLATE "C"` backfilled per project by `created_at` (`lpad(row_number,8,'0') || '1'`) then `NOT NULL` — verify applies on `0001`–`0009`, `db:check-rls` passes, existing test cases keep their creation order
- [x] 2.2 `0010_folder.down.sql` — verify up → down → up round-trips
- [x] 2.3 Tenant-isolation test for `folder` — verify cross-workspace reads return nothing and no context returns zero rows

## 3. API

- [x] 3.1 `src/common/ordering.ts` `keyBetween(a, b)` — verify unit tests: null bounds, between two keys, adjacent keys extend length, never ends in `0`, throws if `a >= b`, randomized 1000 insertions stay strictly increasing under byte-wise comparison
- [x] 3.2 `src/folders/tree-rules.ts` (MAX depth 4, depth/height check, name validation) + SQL helpers `folderDepth`, `subtreeHeight`, `isDescendant`, `subtreeContents` — verify unit tests for the pure rules (helpers covered by e2e)
- [x] 3.3 `folders.controller.ts`: `GET /folders`, `POST /folders`, `PATCH /:id` (rename), `POST /:id/move`, `GET /:id/delete-impact`, `DELETE /:id` (Admin, subtree soft delete with active-execution guard listing execution names); activity entries; register in `app.module.ts` — verify `test/folders.e2e-spec.ts`: nested create appended last; duplicate sibling name (case-insensitive) 409 on create and rename; Viewer 403; 5th level 409; subtree-too-deep move 409; move into own descendant 409; folders-first listing irrelevant of creation time; invalid target/afterId 400; delete-impact 2 folders/3 test cases; subtree delete hides all; In Progress execution blocks with its name; Draft-only doesn't block; Contributor delete 403; other workspace's folder 404/400; activity entry for delete with counts
- [x] 3.4 Test cases: `POST` accepts `folderId` (append last; foreign/deleted → 400); `GET` returns `folderId`, `positionKey`, `lastOutcome` (newest non-Pending outcome in a non-deleted execution) ordered by `position_key, id`; `POST /:id/move` with the same parent/afterId rules; `test_case.moved` activity — verify e2e additions in `test-cases.e2e-spec.ts` and `folders.e2e-spec.ts`: created in folder appears last; foreign folder 400; reorder A,B,C → A,C,B; move to root first; `lastOutcome` Fail for a failed run, null when never run; existing test-case and execution e2e still pass

## 4. Web — data and pure helpers

- [x] 4.1 Add dependencies `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; `npx shadcn@latest add context-menu collapsible` — verify typecheck
- [x] 4.2 `lib/folders-api.ts` (list/create/rename/move/deleteImpact/delete + `moveTestCase`; `TestCase` type gains `folderId`, `positionKey`, `lastOutcome`) and `lib/test-case-tree.ts` (`buildTree`, `flattenVisible`, `filterTree`, `breadcrumb`, `folderCounts`, `resolveDrop`) — verify unit tests for every helper, including folders-first ordering, filter keeping ancestors, each `resolveDrop` zone/kind combination, no-op and own-subtree drops

## 5. Web — Test Cases screen

- [x] 5.1 `TestCaseTree` (replaces `TestCaseList`): rows with chevron/icon/name/outcome dot/`⋯`, expand/collapse remembered in localStorage per project, name + status filter, "New" dropdown (folder / test case), shared loading/empty/error states — verify tests: folders render before test cases; expansion survives remount; filter shows match inside expanded ancestor; outcome dot only when `lastOutcome` set
- [x] 5.2 `TreeActionsMenu` in both the `⋯` dropdown and a right-click `ContextMenu`: New folder here, New test case here, Rename, Move to…, Delete (Admin); `FolderNameDialog`, `FolderPicker`, `MoveDialog` (disables self/descendants/too-deep), delete confirmation from `delete-impact` — verify tests: Viewer sees no edit actions; Contributor has no Delete; Move to… → picking a folder calls move with that parent; rename duplicate shows the 409 reason; delete confirmation shows "2 folders and 3 test cases"
- [x] 5.3 Drag and drop: `DndContext` + sortable rows, pointer + keyboard sensors, zone detection (before/after/into), drop indicator, optimistic move with rollback and inline reason on refusal; disabled for Viewers — verify tests: keyboard pick-up/move/drop calls the move API with the `resolveDrop` result; a refused (409) move restores the previous order and shows the reason; Viewer rows aren't draggable
- [x] 5.4 Right panel: `FolderSummary` (breadcrumb, subfolder/direct/total counts, actions), breadcrumb above `TestCaseDetail`, `CreateTestCaseForm` with `FolderPicker` defaulting to the selected folder or the "New test case here" folder; selection from `?testCase=` or `?folder=` — verify tests: summary counts; breadcrumb "Checkout / Payments"; creating with a folder selected sends that `folderId` and selects the new test case; existing Test Cases tests (Run button, deep link, role gating) still pass

## 6. Verification

- [x] 6.1 Run `npm run lint`, `npm run typecheck`, `npm run test -w apps/web`, `npm test -w apps/api` (with `SECRETS_MASTER_KEY` set), `npm run db:check-rls`, `npm run build -w apps/web` — verify all pass
- [x] 6.2 Manual check (`npm run dev`): build a 4-level tree; try a 5th level (refused with reason); drag test cases and folders to reorder and nest, including with the keyboard; Move to… via right-click; filter; rename duplicate; delete a folder blocked by a running execution, then delete one that isn't (confirmation counts); outcome dots after running; create a test case into the selected folder — record anything that diverges
- [x] 6.3 roadmap-mvp.md Phase 9 Slice 2 Built / Key decisions / Deferred entry

## Workflow follow-up

- Archive with `/opsx:archive` once all tasks are done.
