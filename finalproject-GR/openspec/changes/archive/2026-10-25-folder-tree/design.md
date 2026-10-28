# Design

## Context

See proposal.md - Why. State this builds on:

- **API:**
  - `test_case` (migration 0005, plus `UNIQUE (id, workspace_id)` since 0008) has no folder or order.
  - `test-cases.controller.ts` lists by `created_at`. Its delete is guarded by `ACTIVE_STATUSES` from `executions/execution-lifecycle.ts` (Ready/InProgress/Paused, ADR 0012).
  - Patterns as before: routes nested under `/projects/:projectId`, raw SQL inside `withTenantContext`, conditional updates, activity logging through `log(tx, …)`, pure rule modules with unit tests.
  - The API is **CommonJS under Jest** (ts-jest). ESM-only packages can't be required without extra transform config.
- **Web:**
  - `TestCasesScreen` is now a split pane (look-and-feel): `TestCaseList` (flat), `TestCaseDetail`, `CreateTestCaseForm`, selection kept in local state seeded from `?testCase=`.
  - Shared `EmptyState`/`ErrorState`/`ListSkeleton`, `notifySuccess`, `ActionError`, shadcn `Dialog`/`DropdownMenu`/`Select`, and `OUTCOME_COLORS` (token classes) exist.
- **Runs:** `test_run.outcome` with `outcome_updated_at`. Started runs carry name/script snapshots, and `test_case_id` is nullable.

## Goals / Non-Goals

**Goals:**
- A tree that stays correct under concurrent edits: each move rewrites one row, and invariants (depth, no cycles, unique sibling names) are checked server-side in the move's transaction.
- One drag-and-drop stack (ADR 0014) that Slice 3 can reuse for the execution picker and runs table.
- Drag-and-drop never the only way: every move is also available via the Move to… menu.

**Non-Goals:**
- Trash UI and restore, tags, dashboard, health banners, run history, multi-select moves (proposal.md - deferred).

## Decisions

**Schema (`0010_folder`):**
- `folder`:
  - Columns: `id`, `project_id`, `workspace_id`, `parent_folder_id` (nullable), `name`, `position_key text COLLATE "C" NOT NULL`, `created_at`, `updated_at`, `deleted_at`, `deleted_by`, `deletion_id`.
  - `UNIQUE (id, workspace_id)`.
  - FKs: `(project_id, workspace_id) → project ON DELETE CASCADE`; `(parent_folder_id, workspace_id) → folder (id, workspace_id)`. The parent FK has no cascade: subtree deletes are soft, and purge, a later phase, removes children first (ADR 0007).
  - Unique sibling names via the partial unique index `ON folder (project_id, COALESCE(parent_folder_id, '00000000-0000-0000-0000-000000000000'), lower(name)) WHERE deleted_at IS NULL`.
  - Standard RLS; grant `SELECT, INSERT, UPDATE`.
- `test_case` gains:
  - `folder_id uuid` (nullable; FK `(folder_id, workspace_id) → folder`).
  - `position_key text COLLATE "C"`, backfilled for existing rows per project in `created_at` order (below), then `SET NOT NULL`.
  - `deletion_id uuid` (nullable), so a folder delete can mark its test cases with the same id.
- Depth is **not stored**: it's computed per write by a recursive CTE (at most 4 hops). Storing it would mean rewriting a whole subtree on every folder move.

**Ordering keys (own implementation, ADR 0014):**
- `apps/api/src/common/ordering.ts` exports `keyBetween(a: string | null, b: string | null): string`.
- Keys are strings over the alphabet `0-9a-z`, read as base-36 fractions `0.k₁k₂…`. They are compared byte-wise, which is why the column is `COLLATE "C"`, so Postgres orders them exactly as JS `<` does.
- The midpoint is computed digit by digit, extending the key length when two keys are adjacent. Keys never end in `0`, so a key always exists between any two.
- `null` bounds mean the start or end of the list.
- Alternative rejected: the `fractional-indexing` package. Every version is ESM-only, and the API's CommonJS Jest setup would need ESM transform configuration for one ~40-line function.
- Another rejected alternative: integer positions with renumbering. A move would rewrite all of its siblings and contend under concurrency.
- **Backfill:** `lpad(row_number()::text, 8, '0') || '1'` per `(project_id)` by `created_at`. Fixed width keeps numeric and lexicographic order identical; the trailing `1` respects the never-end-in-`0` rule. All existing test cases are at the root, so one sequence per project is enough.
- Ties from two concurrent moves into the same gap get the same key. Ordering is `ORDER BY position_key, id` everywhere, so ties stay deterministic; the next move into that gap separates them.

**Pure tree rules** (`apps/api/src/folders/tree-rules.ts`, unit-tested): `MAX_FOLDER_DEPTH = 4`, `assertDepth(targetParentDepth, subtreeHeight)`, and name validation. The SQL side supplies the numbers:
- `folderDepth(tx, folderId)`: a recursive CTE up the ancestors.
- `subtreeHeight(tx, folderId)`: a recursive CTE down the descendants.
- `isDescendant(tx, ancestorId, folderId)`: rejects cycles.

**Endpoints** (all under `/projects/:projectId`):
- `GET /folders`: flat list `{ id, parentFolderId, name, positionKey }` (Viewer+).
- `POST /folders` `{ name, parentFolderId? }` (Contributor+): depth check (parent depth + 1 ≤ 4), name uniqueness (409), key = `keyBetween(lastSiblingFolderKey, null)`.
- `PATCH /folders/:folderId` `{ name }` (Contributor+): 409 on a duplicate.
- `POST /folders/:folderId/move` `{ parentFolderId: string | null, afterId: string | null }` (Contributor+):
  - Locks the moving row `FOR UPDATE`. The target parent must be the same project and not deleted (else 400). It can't be the folder itself or one of its descendants (409), and the new depth must fit, i.e. `targetDepth + 1 + height − 1 ≤ 4` (409).
  - `afterId` must be a sibling folder in the target parent, or null for first (400 otherwise).
  - New key = `keyBetween(key(afterId) | null, key(next sibling after it) | null)`.
- `GET /folders/:folderId/delete-impact` → `{ folders, testCases }` counts for the subtree (Viewer+).
- `DELETE /folders/:folderId` (Admin):
  - A recursive CTE collects the subtree's folder ids and their test cases.
  - Guard: any of those test cases with a run in an `ACTIVE_STATUSES` execution → 409 with `{ message, executions: [names] }`.
  - Otherwise one `deletion_id = gen_random_uuid()`, and both tables get `deleted_at`/`deleted_by`/`deletion_id` in one transaction.
  - Logs `folder.deleted` with counts.
- Test cases:
  - `POST /test-cases` accepts `folderId` (400 if foreign or deleted) and appends with `keyBetween(lastSiblingTestCaseKey, null)`.
  - `GET /test-cases` returns `folderId`, `positionKey` and `lastOutcome`.
  - New `POST /test-cases/:id/move` `{ folderId: string | null, afterId: string | null }` uses the same rules as folders, except depth and cycle checks don't apply.
- **`lastOutcome`:** a `LEFT JOIN LATERAL` takes the newest run of that test case (`outcome <> 'Pending'`, execution not deleted, ordered by `outcome_updated_at DESC`). That is, the last *recorded* outcome. An In Progress run still Pending doesn't blank out the dot from earlier results.
- Activity: `folder.created|renamed|moved|deleted`, `test_case.moved`, category `Test Cases`.

**Folders-first within a parent:** two independent key spaces, one per table and parent. The client renders folders sorted, then test cases sorted. There's no shared sequence, per decision.

**Web: data and pure helpers** (`lib/folders-api.ts`, `lib/test-case-tree.ts`, unit-tested):
- `buildTree(folders, testCases)` → nested nodes, folders before test cases, each sorted by `positionKey` then `id`.
- `flattenVisible(tree, expanded)` → rows `{ node, depth, parentId }` for rendering and drag-and-drop.
- `filterTree(tree, { name, status })` → matching items plus their ancestors, and the folder ids to force-expand.
- `breadcrumb(folderId)`, `folderCounts(folderId)` → `{ subfolders, directTestCases, totalTestCases }`.

**Web: drag and drop with dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`):
- One `DndContext` over the flattened visible rows, with `PointerSensor` (small activation distance, so clicks still select) and `KeyboardSensor` with `sortableKeyboardCoordinates`.
- On drag over, the pointer's vertical position within the target row picks a zone: top 25% = before, bottom 25% = after, the middle = **into**. Into only applies to folders; on test cases the middle counts as after.
- A pure `resolveDrop(rows, activeId, overId, zone)` turns that into an API move `{ parent, afterId }` honoring folders-first:
  - dropping a test case before or after a folder row → the first test case in that parent (`afterId: null`);
  - dropping a folder near a test case row → after the last folder in that parent;
  - into → append to the end of that folder's same-kind children.
  - Returns null for no-ops (same place) and for drops into the item's own subtree, which the client rejects before calling.
- A drop indicator line or folder highlight shows the zone.
- *As implemented:* the move is **not optimistic**. The client can't compute the server's ordering key without duplicating `keyBetween` in the web app, so it waits for the server and refetches folders and test cases. A refused move (e.g. 409 depth) never changes the tree, and its reason shows inline under the tree via `ActionError`. That still meets the spec ("explain why and leave the tree unchanged"), and order always matches the server. Dragging is also paused while a filter is active, because reordering among hidden siblings is ambiguous. After manual testing (2026-10-25): rows **don't shift while dragging**. The sortable strategy returns no transforms, so folders no longer slide away from a test case being dropped into them. A `DragOverlay` label follows the pointer while the original row stays in place, faded. A line between rows (before/after) or a highlighted folder (into) shows the target, and the tree reorders only after the drop. Empty folders show no expand control.
- **Keyboard:** dnd-kit's keyboard sensor moves between rows (before/after zones). Moving *into* a folder from the keyboard uses **Move to…**, which the spec also accepts as the accessible path.
- Alternative rejected: native HTML5 drag-and-drop. It has no keyboard support, poor touch support, and inconsistent drop feedback.

**Web: screen layout:**
- `TestCaseTree` replaces `TestCaseList`: filter inputs (name, status `Select`), the tree rows, and a "New" dropdown (New folder / New test case).
- Rows: chevron, folder or file icon, name, outcome dot, and a `⋯` button. The same `TreeActionsMenu` items are reused in a shadcn `ContextMenu` for right-click.
- Expansion is remembered in `localStorage` under `test-case-tree:expanded:<projectId>`, read in a `useEffect`. Hydration-safe: it starts collapsed and restores after mount.
- Selection is `{ kind: 'folder' | 'testCase', id }` in local state, seeded from `?testCase=` (existing) or `?folder=`.
- Right panel: `FolderSummary` (breadcrumb, counts, actions) or `TestCaseDetail` with a `Breadcrumb` header, or `CreateTestCaseForm`, which gains a **folder picker**.
- `FolderPicker` is a compact expandable tree with radio selection and a "Root" option. It's reused by Move to… (for folders it disables the folder itself, its descendants, and too-deep targets) and by the New Test Case form.
- Dialogs: `FolderNameDialog` (create/rename, zod: non-blank; the server's 409 for duplicates shown inline), `MoveDialog`, and a delete confirmation that fetches `delete-impact` and shows "2 folders and 3 test cases will be deleted".
- Query keys: `['projects', p, 'folders']`; `['projects', p, 'test-cases']` stays. Moves and creates invalidate both; folder delete also invalidates test cases.

**Docs:**
- **ADR 0014:** dnd-kit; in-house base-36 fractional keys with `COLLATE "C"`; folders-first ordering; Move to… as the accessible alternative. Resolves F6's drag-and-drop part.
- **PRD §2.11 and §6.2.5:** "Draft, Ready, In Progress, or Paused" → "Ready, In Progress, or Paused", in the test case and folder deletion rules, citing ADR 0012.
- **ADR 0012:** a dated correction note under decision 4. The PRD did list Draft; the decision stands, and the PRD has been amended to match.

**Testing:**
- **API unit:** `keyBetween` (start/end/between, adjacent keys extend, never ends in `0`, ordering matches `COLLATE "C"` byte order, 1000 random insertions stay sorted and unique) and `tree-rules`.
- **API e2e** (`folders.e2e-spec.ts` + test-case additions), one per spec scenario:
  - create nested; duplicate name 409; 5th level 409; subtree-too-deep move 409; cycle 409;
  - reorder A,C,B; move to root first; folders-first listing; invalid target 400;
  - delete-impact counts; subtree delete; active-execution 409 naming it; Draft doesn't block; Contributor 403;
  - tenant 404/400; activity entries;
  - create test case in a folder (appended last); foreign folder 400; `lastOutcome` reporting.
  - Plus the tenant-isolation test for `folder`.
- **Web unit:** `buildTree`, `flattenVisible`, `filterTree`, `breadcrumb`, `folderCounts`, `resolveDrop` (each folders-first and no-op case).
- **Web component:**
  - tree renders folders first, and expansion persists across remount;
  - filter shows matches and ancestors;
  - actions menu per role;
  - Move to… calls the move API;
  - a keyboard drag (space, arrow, space) calls the move API;
  - a refused move shows the reason and restores the order;
  - folder summary counts and delete confirmation text;
  - breadcrumb in detail;
  - new test case defaults its destination to the selected folder.
  - Pointer-drag geometry isn't reliable in jsdom, so the zone logic is covered by `resolveDrop` unit tests, and the manual check covers real mouse dragging.

## Risks / Trade-offs

- [Own fractional-key code could have edge-case bugs] → Pure, small, and covered by a randomized ordering test. The `COLLATE "C"` column guarantees DB and JS agree.
- [Concurrent moves into the same gap produce equal keys] → Deterministic tie-break by `id`, and the next move separates them. Acceptable for human-paced edits.
- [Keyboard users can reorder but only nest via Move to…] → An explicit, spec-accepted alternative; dnd-kit tree "into" via keyboard needs custom coordinate getters, deferred.
- [Large trees render every visible row] → Fine at MVP scale (hundreds of rows). Virtualization can come later behind `flattenVisible`.
- [`test_case.position_key` backfill must run before `NOT NULL`] → Same migration, same transaction; up/down round-trip tested.
