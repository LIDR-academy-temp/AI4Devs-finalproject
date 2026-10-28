# Proposal

## Why

Slice 1 (`test-case-tags`) gave test cases tags. PRD §2.4 says tags apply to bugs too, and are there "to aid filtering and categorisation". PRD §6.3.2 filters the execution list by tags ("an execution matches when it contains at least one test case carrying any of the selected tags"); §6.4.3 and §7.3 put a tag picker in the bug detail and the New Bug form. This is roadmap-full.md Phase 4 remainder, Slice 2; [ADR 0016](../../../docs/adr/0016-tag-management.md) already covers the rules.

## What Changes

- **Database:** migration `0012_bug_tag` adds `bug_tag` (bug ↔ tag), shaped like `test_case_tag`: composite tenant FKs, cascades, forced RLS.
- **API, bugs:** list and detail include `tagIds`. `POST` (manual filing, including filing from a run) and `PATCH` accept `tagIds`, each id a tag of the same project, otherwise 400. Activity entries name the tags on creation; an edit records the tags added and removed. Auto-created bugs start with no tags.
- **API, tags:** the list also reports `bugCount` (non-deleted bugs). Deleting a tag removes it from bugs too, and its activity entry records `{testCases, bugs}`.
- **API, executions:** the list includes each execution's `tagIds`: the tags currently carried by the test cases of its runs.
- **Web:**
  - Bug detail: a Tags row with badges and the picker for Contributors and Admins; badges only for Viewers.
  - New Bug / File bug form: a Tags field with the picker.
  - Bugs list: a Tags filter ("any of") with Manage tags…, so tags can be managed from bugs too.
  - Executions list: a Tags filter ("any of"), without Manage tags, since executions don't carry tags themselves.
  - Manage tags dialog: shows bug counts next to test case counts, and the delete confirmation states both.

Out of scope:
- Tags on executions themselves; PRD tags apply to test cases and bugs only.
- Tags at the time an execution ran. Executions match on their test cases' current tags (see design.md).
- Moving Manage tags to a settings page (Phase 11).
- Tags in the demo seed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `bug-tracking`: bugs carry tags (set on filing and edit, returned by list and detail), and tag changes are logged.
- `tag-management`: usage counts and deletion cover bugs.
- `test-execution-authoring`: the execution list reports the tags carried by each execution's test cases.
- `bugs-screen`: tags in the bug detail and filing form; a tag filter on the list.
- `executions-screen`: a tag filter on the execution list.
- `test-cases-screen`: the Manage tags dialog counts bugs and its delete confirmation mentions them.

## Impact

- **DB:** `db/migrations/0012_bug_tag.{up,down}.sql`.
- **API:**
  - `bugs/bug-rules.ts` and `bugs.controller.ts`, plus `bugs/bug-queries.ts` (`tag_ids` in `BUG_SELECT`)
  - `tags/tags.controller.ts` (counts, delete details)
  - `executions/execution-queries.ts` (`tag_ids` in the list columns)
  - e2e additions in the bugs, tags and executions specs
- **Web:**
  - `lib/bugs-api.ts`, `lib/executions-api.ts`, `lib/tags-api.ts` (types)
  - `lib/bug-list-view.ts` and `lib/execution-list-view.ts` filters
  - `components/bugs/bug-detail.tsx`, `bug-form-dialog.tsx`, `bug-list.tsx`
  - `components/executions/execution-list.tsx`
  - `components/tags/manage-tags-dialog.tsx`; `TagFilter`'s Manage action becomes optional
- **Docs:** roadmap-full.md Phase 4 Slice 2 status.
