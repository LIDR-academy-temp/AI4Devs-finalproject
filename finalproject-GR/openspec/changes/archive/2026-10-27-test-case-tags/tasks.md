# Tasks

## 1. Docs

- [x] 1.1 roadmap-full.md: Phase 4 Slice 1 → 🚧 pointing at OpenSpec change `test-case-tags`. Verify it reads like roadmap-mvp.md's in-progress slices

## 2. Database

- [x] 2.1 `db/migrations/0011_tag.up.sql` and `.down.sql` per design.md decision 1: `tag` (name and colour checks, `lower(name)` unique per project, composite FKs) and `test_case_tag` (PK, both composite FKs `ON DELETE CASCADE`, `tag_id` index), forced RLS, and grants. Verify:
  - it applies on top of 0001–0010 (`npm run db:migrate`)
  - `npm run db:check-rls` passes
  - up → down → up round-trips
  - the tenant-isolation e2e covers both tables (no cross-workspace reads; zero rows without context)

## 3. API: tags

- [x] 3.1 `src/tags/tag-rules.ts` (`TAG_COLORS`, `parseTagName`, `parseTagColor`, `nextColor`). Verify `tag-rules.spec.ts`:
  - trims names
  - rejects blank and 51-character names
  - rejects unknown colours
  - `nextColor(null)` is `gray`, `nextColor('violet')` wraps to `gray`
- [x] 3.2 `src/tags/tags.controller.ts` (list with counts, create, update, delete) registered in `app.module.ts`, with 409 on duplicate names, 404 on a foreign or unknown id, and activity entries per design.md decision 2. Verify `test/tags.e2e-spec.ts`:
  - Viewer lists, ordered by name, with counts excluding deleted test cases
  - Contributor creates; default colours rotate gray → red
  - "smoke" vs existing "Smoke" → 409
  - invalid name or colour → 400
  - rename/recolour logs from/to; a no-op update writes no entry
  - rename to an existing name → 409
  - Viewer create → 403; Contributor delete → 403
  - Admin delete removes the tag from three test cases and logs `testCases: 3`
  - another workspace's tag → 404 and absent from lists

## 4. API: test case tags and logging

- [x] 4.1 `test-cases.controller.ts` per design.md decision 3: `tagIds` in `TEST_CASE_SELECT` and the response; `PATCH` `tagIds` validation, diff and write; `test_case.created` / `.updated {changes}` / `.deleted` entries. Verify additions to `test/test-cases.e2e-spec.ts`:
  - setting tags then reading returns exactly them
  - list reports `tagIds` (empty array when none)
  - a tag of another project or an unknown id → 400 with tags unchanged
  - Draft → Ready logs `changes.status {from: Draft, to: Ready}`
  - adding "smoke" / removing "legacy" logs those names
  - an unchanged update logs nothing
  - create and delete each log one entry with the actor
  - existing test-case, folders and executions e2e specs still pass

## 5. Web: data, palette, components

- [x] 5.1 Add shadcn `popover` and `command`; `lib/tags-api.ts`; `TestCase.tagIds`; palette tokens in `globals.css` (light and dark) mapped in `@theme`; `components/tags/tag-badge.tsx`. Verify typecheck, and a `tag-badge` test that each palette colour maps to its class
- [x] 5.2 `lib/test-case-tree.ts`: `filterTree` gains `tagIds` (any-of, ANDed with name and status). Verify unit tests:
  - two tags match test cases carrying either one
  - combined with a status filter
  - ancestor folders are kept and force-expanded
  - an empty `tagIds` filters nothing
- [x] 5.3 `components/tags/tag-picker.tsx`. Verify component tests:
  - selecting an existing tag calls `onChange` with it added; selecting a carried tag removes it
  - typing a new name offers "Create" and creating adds the new id
  - no Create option when the name matches an existing tag ignoring case, or when the user can't edit

## 6. Web: screens

- [x] 6.1 Test case detail: a Tags row with badges, the picker for Contributors and Admins (saves `{ tagIds }`, notifies "Tags updated"), badges only for Viewers. Verify `test-case-detail.test.tsx`: Contributor adds a tag and `updateTestCase` receives the new `tagIds`; Viewer sees badges and no picker
- [x] 6.2 Tree Tags filter (`components/tags/tag-filter.tsx`) wired into `TestCaseTree`; drag paused while it's active. Verify `test-case-tree.test.tsx`:
  - picking "smoke" shows only carriers inside their folders
  - tag plus status combine
  - with a tag filter active, no row is draggable
- [x] 6.3 `components/tags/manage-tags-dialog.tsx` opened from the filter. Verify component tests:
  - lists tags with counts
  - Contributor renames (calls `updateTag`) and recolours, with no Delete shown
  - a 409 rename shows the reason and restores the old name
  - Admin delete shows "removed from 3 test cases" and calls `deleteTag` only after confirming
  - Viewer sees no edit controls

## 7. Tags on create (added 2026-10-27)

- [x] 7.1 API: `POST /test-cases` accepts `tagIds` (validated against the project, written in the create transaction, tag names in the `test_case.created` entry). Verify `test-cases.e2e-spec.ts`: creating with two tags reports exactly them; a foreign or unknown tag id → 400 and no test case is created; the creation entry names the tags
- [x] 7.2 Web: `CreateTestCaseDialog` gets a Tags field with the `TagPicker` (pick existing, create new), sending `tagIds`. Verify `create-test-case-dialog.test.tsx`: picking a tag and creating a new one sends both ids with the name

## 8. Integration check

- [x] 8.1 Run root `npm run lint` and `npm run typecheck`, the API unit and e2e tests (with `SECRETS_MASTER_KEY` set), and the web tests; all pass. In the browser:
  - create tags from the picker and in the New Test Case modal, filter the tree by them, recolour and rename in Manage tags, delete one as Admin
  - check the badges follow light and dark mode

## Workflow follow-up

- User tests manually before any commit; commit or push only when asked.
- On archive: roadmap-full.md Phase 4 Slice 1 → ✅ with Built / Key decisions / Deferred.
