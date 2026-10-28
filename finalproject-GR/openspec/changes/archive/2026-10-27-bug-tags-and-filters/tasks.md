# Tasks

## 1. Docs

- [x] 1.1 roadmap-full.md: Phase 4 Slice 2 → 🚧 pointing at OpenSpec change `bug-tags-and-filters`. Verify it reads like Slice 1's in-progress line

## 2. Database

- [x] 2.1 `db/migrations/0012_bug_tag.{up,down}.sql` per design.md decision 1 (the `bug (id, workspace_id)` unique, then `bug_tag`). Verify:
  - it applies to the dev database (migrator role) on top of 0011
  - up → down → up round-trips
  - `npm run db:check-rls` passes
  - a tenant-isolation e2e case covers `bug_tag`

## 3. API

- [x] 3.1 `src/tags/tag-queries.ts` (`parseTagIds`, `projectTags`, `setItemTags`) and refactor `test-cases.controller.ts` onto it. Verify the existing test case and tags e2e specs pass unchanged
- [x] 3.2 Bugs: `tagIds` in `parseBugCreate` / `parseBugUpdate`, `BUG_SELECT` and the response; create validates before insert and logs tag names; update logs `changes.tags`. Verify `bug-rules.spec.ts` (malformed `tagIds` → 400) and additions to `test/bugs.e2e-spec.ts`:
  - filing with two tags returns exactly them
  - a foreign or unknown tag → 400 and no bug
  - setting tags on update, then reading, returns them
  - list reports `tagIds` (empty when none)
  - the add/remove entry names the tags
  - an auto-created bug has no tags
- [x] 3.3 Tags: `bugCount` via scalar subqueries; delete removes from bugs and logs `{testCases, bugs}`. Verify additions to `test/tags.e2e-spec.ts`:
  - counts exclude deleted bugs
  - deleting a tag on two test cases and one bug leaves no `bug_tag` rows and logs `{testCases: 2, bugs: 1}`
- [x] 3.4 Executions list `tag_ids` per design.md decision 5. Verify `test/executions.e2e-spec.ts`: an execution whose test cases carry "smoke" and "smoke"+"checkout" lists both tag ids once; an execution with untagged test cases lists `[]`

## 4. Web: data and pure filters

- [x] 4.1 Types (`Bug.tagIds`, `Execution.tagIds`, `Tag.bugCount`, bug inputs); `filterBugs` and `filterExecutions` gain `tagIds`. Verify unit tests in `bug-list-view.test.ts` and `execution-list-view.test.ts`: any-of matching, combined with other filters, empty list filters nothing

## 5. Web: components and screens

- [x] 5.1 Generalize `TestCaseTags` into `TagsField` and use it in the test case detail (existing tests pass) and the bug detail (Contributor saves `{tagIds}`, Viewer sees badges only). Verify bug detail component tests for both roles
- [x] 5.2 `BugFormDialog` Tags field sending `tagIds`. Verify a test where picking a tag and creating one sends both ids with the bug; the existing bug form tests still pass
- [x] 5.3 `TagFilter` `onManage` optional; Bugs list Tags filter with Manage tags; Executions list Tags filter without it. Verify:
  - `bugs-screen.test.tsx`: picking a tag narrows the list; Manage tags opens the dialog
  - `execution-list.test.tsx`: picking a tag narrows the list; no Manage button
- [x] 5.4 `ManageTagsDialog` shows bug counts and the delete message names both counts. Verify `manage-tags-dialog.test.tsx` is updated

## 6. Integration check

- [x] 6.1 Run root `npm run lint` and `npm run typecheck`, the API unit and e2e tests (with `SECRETS_MASTER_KEY`), and the web tests; all pass. In the browser:
  - tag a bug from its detail and from New Bug / File bug
  - filter Bugs and Executions by a tag
  - delete a tag used by both a test case and a bug, and confirm the message and the result

## Workflow follow-up

- User tests manually before any commit; commit or push only when asked.
- On archive: roadmap-full.md Phase 4 Slice 2 → ✅ with Built / Key decisions / Deferred.
