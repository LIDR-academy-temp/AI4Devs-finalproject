# Proposal

## Why

PRD §2.4 tags (coloured, named labels per project) are the cross-cutting way testers group test cases ("smoke", "regression", PRD §10.2), and the Test Cases, Executions and Bugs screens all filter by them. None of this exists yet. This is roadmap-full.md Phase 4 remainder, Slice 1. Tag rules are fixed by [ADR 0016](../../../docs/adr/0016-tag-management.md). The slice also closes a logging gap: test case create, edit (including status, [ADR 0015](../../../docs/adr/0015-test-case-status-changes.md)) and delete write no activity entries today, which ADR 0007 requires for every mutation. Adding tags touches that same update path.

## What Changes

- **Database:** migration `0011_tag` adds `tag` (per project: name unique ignoring case within the project, at most 50 characters, colour from an eight-token palette) and `test_case_tag` (join). Both are tenant-scoped with forced RLS. Deleting a tag removes its join rows.
- **API, tags:** `GET /projects/:projectId/tags` lists the project's tags with test case counts (Viewer+). `POST` creates a tag, Contributor+; without a colour it gets the next palette colour in turn. `PATCH /:tagId` renames and recolours (Contributor+). `DELETE /:tagId` is Admin-only and permanent, and removes the tag from every test case. A duplicate name returns 409. Every tag change is activity-logged.
- **API, test cases:** the list and detail responses include `tagIds`. `POST` and `PATCH` accept `tagIds` (replaces the set; each id must be a tag of the same project, otherwise 400). Create, update (with what changed, including status from/to and tags added/removed) and delete now write activity entries in the same transaction.
- **Web:**
  - A shared tag badge using new palette tokens (light and dark).
  - A tag picker (search, toggle, "Create" for a new name) in the test case detail, editable by Contributors and Admins and read-only badges for Viewers, and in the New Test Case modal (added 2026-10-27 at the user's request).
  - A multi-select Tags filter on the Test Cases tree with "any of" semantics. Drag and drop pauses while it's active, as with the other filters.
  - A Manage tags dialog opened from that filter: everyone sees the tags and their counts; Contributors and Admins rename and recolour; Admins delete after a confirmation stating how many test cases carry the tag. This is an interim home: Manage tags will move to a project settings page later (roadmap-full.md Phase 11).

Out of scope (Slice 2): tags on bugs, `bug_tag`, and the tag filters on the Executions and Bugs lists. Also out of scope: tag badges in tree rows (the PRD tree shows only outcome dots).

## Capabilities

### New Capabilities

- `tag-management`: a project's tags, meaning creating, listing with usage counts, renaming, recolouring and deleting them, with their validation, roles and activity logging.

### Modified Capabilities

- `test-case-authoring`: test cases carry tags (set on create and update, returned by list and detail); test case create, update and delete are activity-logged.
- `test-cases-screen`: tags in the test case detail, the tree's tag filter, and the Manage tags dialog.

## Impact

- **DB:** `db/migrations/0011_tag.{up,down}.sql`; `db:check-rls` covers the new tables.
- **API:**
  - New `src/tags/` (controller, validation, palette constant) registered in `app.module.ts`.
  - `src/test-cases/test-cases.controller.ts` gets `tagIds`, the logging, and a `tag_ids` aggregate in `TEST_CASE_SELECT`.
  - e2e specs for tags and the new test case behaviour.
- **Web:**
  - New: `lib/tags-api.ts`, `components/tags/` (badge, picker, Manage tags dialog).
  - Changed: `test-case-detail.tsx`, `test-case-tree.tsx` and `lib/test-case-tree.ts` (`filterTree` gains `tagIds`), `globals.css` palette tokens.
- **Dependencies:** shadcn `popover` and `command` (adds `cmdk`), which the tag picker and filter are built on. Per [ADR 0011](../../../docs/adr/0011-frontend-ui-stack.md), shadcn components are added as needed.
- **Docs:** roadmap-full.md Phase 4 Slice 1 status.
