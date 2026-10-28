# Proposal

## Why

The Test Cases screen is still the flat list Phase 4 deliberately shipped ("flat, no folders/tags"). The PRD centres the screen on a **folder tree** (§2.3, §6.2.1–6.2.5, §7.1, journey §10.2: "create folders to reflect the feature areas… drag and drop test cases and folders to reorganise at any time"). That's how a real suite stays navigable past a few dozen test cases. Manual testing after Phase 8 made this a priority, and it was pulled into the MVP on 2026-10-25 as roadmap-mvp.md **Phase 9, Slice 2**. This slice also settles the drag-and-drop library and ordering scheme (open question F6) that Slice 3, execution picker and run reordering, will reuse.

## What Changes

- **Folders (new):** project-scoped, nestable **up to 4 levels** (PRD §2.3, amended 2026-10-25).
  - Contributors can create, rename (inline), move and reorder folders.
  - Admins can delete a folder **together with its subfolders and test cases**, as a soft delete that shares one deletion id so it can be restored together later (ADR 0007).
  - Deletion is refused, listing the executions involved, while any test case inside is part of a **Ready, In Progress or Paused** execution. This is the same rule as test-case delete (ADR 0012; Draft deliberately excluded, per decision).
  - A move is refused if it would exceed 4 levels or put a folder inside itself.
  - Sibling folder names must be unique (case-insensitive), so the tree stays unambiguous.
- **Test cases in the tree:**
  - A test case lives at the **root or in a folder** (folder optional, per decision; existing test cases stay at the root).
  - It's created into a chosen folder, can be **moved** to another folder or the root, and **reordered** among its siblings.
- **Ordering:** within a parent, **folders come first, then test cases** (per decision), each group in its own drag-and-drop order. Order is stored as **fractional index keys** (readme §3's `position_key`), so a move rewrites one row, not its siblings.
- **Last-run outcome:** the test case list reports each test case's most recent run outcome from started executions, shown as a colored dot in the tree (PRD §6.2.2; none when never run).
- **Test Cases screen** (PRD §6.2.1–6.2.5, §7.1):
  - The left panel becomes an **expandable folder tree**, its expansion remembered per browser. Test cases show outcome dots. A **filter** by name and status keeps matching items plus their ancestor folders.
  - **Drag and drop** (mouse and keyboard) reorders and moves folders and test cases. Every node also has an **actions menu**, opened by right-click or a "⋯" button: New folder here, New test case here, Rename, Move to…, Delete (Admin).
  - The right panel shows a **folder summary** when a folder is selected: breadcrumb, subfolder and test case counts, quick actions. When a test case is selected it shows the test case detail with a **breadcrumb**.
  - **New Test Case** picks its destination folder from a tree picker, defaulting to the selected folder.
- **ADR 0014:**
  - **dnd-kit** is the drag-and-drop library (resolves F6's drag-and-drop part, for the tree and Slice 3).
  - Fractional index keys are generated server-side by a small in-house base-36 implementation. The `fractional-indexing` package is ESM-only, which the API's CommonJS Jest setup can't load without extra configuration.
- **Docs:** the PRD §2.11/§6.2.5 deletion text is aligned with ADR 0012, so Draft doesn't block deletion. ADR 0012's statement that the PRD didn't define "active" is corrected. open-questions.md F6 notes the drag-and-drop part is resolved.

**Explicitly deferred (recorded, not silently omitted):**
- Trash UI and restore. Deleted items are kept, with `deletion_id`, but can't be restored from the UI yet.
- Tags and the tag filter.
- The Test Cases dashboard view.
- Health banners and run history in the test case detail.
- "Add to an existing execution" from the Run button.
- Moving several items at once.
- Folder-level permissions (none exist in the PRD).

## Capabilities

### New Capabilities
- `test-case-folders`: the folder hierarchy:
  - Creating, renaming, moving and reordering folders, with the 4-level limit and sibling-name uniqueness.
  - Admin subtree deletion and its active-execution guard.
  - Placing, moving and reordering test cases within the tree.
  - Activity logging.
- `test-cases-screen`: the web Test Cases screen as a tree:
  - Expandable tree with outcome dots and filter.
  - Drag-and-drop and keyboard moves, plus per-node actions menus.
  - Folder summary, breadcrumbs, and the destination picker in New Test Case.

### Modified Capabilities
- `test-case-authoring`:
  - Creating a test case accepts a destination folder.
  - Listing returns each test case's folder, order and last run outcome.
  - The delete requirement is unchanged: its scenarios already allow deletion when only Draft executions are involved.

## Impact

- **DB:** migration `0010_folder`:
  - New `folder` table, with self-referencing composite FK, standard RLS, soft-delete columns and `deletion_id`.
  - `test_case` gains `folder_id` (nullable, composite FK) and `position_key`, with existing rows backfilled in creation order.
- **API:**
  - New `apps/api/src/folders/` for folder CRUD, move and delete.
  - `test-cases.controller.ts` gains `folderId` on create, the list fields, and `POST /:id/move`.
  - A shared pure `ordering.ts` (key between neighbours) and `tree-rules.ts` (depth, cycle, sibling name). No new API dependency.
- **Web:**
  - `components/test-cases/` is rebuilt around a `TestCaseTree`, plus a folder summary, folder and move dialogs, and the tree picker.
  - New dependencies: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
  - shadcn `context-menu` and `collapsible`.
- **Docs:** ADR 0014; PRD §2.11/§6.2.5 wording; ADR 0012 correction note; open-questions F6; roadmap-mvp.md Phase 9 Slice 2.
