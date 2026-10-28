# Design

## Context

See proposal.md - Why. State after Slice 1 (`test-case-tags`):

- **DB:**
  - `tag` and `test_case_tag` exist (migration 0011), using the composite `(id, workspace_id)` tenant-FK pattern.
  - `bug` has **no** `UNIQUE (id, workspace_id)` yet (0009 added one only to `test_run`), so a join table can't reference it with the composite FK until it does.
- **API:**
  - `test-cases.controller.ts` holds the tag helpers `parseTagIds` (uuid list, deduplicated) and `projectTags` (the given ids with their names, 400 unless all belong to the project), plus the diff/write/log logic for `tagIds` on update.
  - `bugs.controller.ts`: create (manual, optionally from a run) logs `bug.created` with `{testRunId}`. Update logs `bug.updated {changes}` built as from/to per field; it logs even when nothing changed, and that stays as is.
  - `BUG_SELECT` feeds list and detail.
  - The executions list uses `EXECUTION_COLUMNS` subqueries.
  - The tags controller's `TAG_SELECT` counts test cases; delete logs `{testCases}`.
- **Web:**
  - `TagPicker`, `TagBadge` and `TagFilter` (whose `onManage` is required) live in `components/tags/`; `TestCaseTags` is the detail row.
  - `bug-list-view.ts` and `execution-list-view.ts` hold pure filter functions with unit tests.
  - The Bugs and Executions lists render Select-based filter bars.

## Goals / Non-Goals

**Goals:**
- Reuse Slice 1's helpers and components instead of duplicating them.
- An execution's tag filter matches on its test cases' **current** tags, computed server-side so the client filter stays pure.

**Non-Goals:**
- Historical (snapshot-time) tags on runs.
- Tags on auto-created bugs (they're created inside the outcome transaction with no user input).

## Decisions

**1. Migration `0012_bug_tag`.**
- `ALTER TABLE bug ADD CONSTRAINT bug_id_workspace_id_key UNIQUE (id, workspace_id)`. It already holds, since `id` is the primary key.
- `bug_tag`:
  - Columns: `bug_id`, `tag_id`, `workspace_id`, `created_at`, with `PRIMARY KEY (bug_id, tag_id)`.
  - FKs `(bug_id, workspace_id) → bug` and `(tag_id, workspace_id) → tag`, both `ON DELETE CASCADE`.
  - Index on `tag_id`; forced RLS `tenant_isolation`; grant `SELECT, INSERT, DELETE`.
- The down migration drops `bug_tag`, then the constraint.

**2. Shared tag helpers (`src/tags/tag-queries.ts`).** Move `parseTagIds` and `projectTags` out of the test-cases controller, and add one function both controllers call:
```ts
setItemTags(tx, { table: 'test_case_tag' | 'bug_tag', column: 'test_case_id' | 'bug_id', itemId, workspaceId, projectId, tagIds })
  → { added: string[]; removed: string[] }   // tag names, for the activity entry
```
It validates the ids (`projectTags`), diffs them against the carried rows, deletes the removed ones and inserts the added ones. The table and column come from a closed union, not from input, so `Prisma.raw` on them is safe. The test-cases controller is refactored onto it, and its e2e specs must still pass unchanged.

**3. Bugs API.**
- `parseBugCreate` and `parseBugUpdate` gain `tagIds` (via `parseTagIds`).
- `BUG_SELECT` adds `COALESCE((SELECT array_agg(bt.tag_id ORDER BY bt.tag_id) FROM bug_tag bt WHERE bt.bug_id = b.id), '{}') AS tag_ids`, and the response gains `tagIds`.
- **Create:** validate the tags before the `INSERT` (400 means no bug is written); insert the joins; log `bug.created` with details `{testRunId?, tags: [names]}`, where `tags` is present only when non-empty.
- **Update:** when `tagIds` is given, call `setItemTags`, and if anything was added or removed, add `changes.tags = {added, removed}` to the existing changes object.
- Auto-create is unchanged.

**4. Tags API.**
- `TAG_SELECT` adds a second count, `bug_count`, from non-deleted bugs. Two `LEFT JOIN … COUNT(DISTINCT …)` would fan out, so both counts become scalar subqueries per tag.
- The response gains `bugCount`.
- Delete logs `{testCases, bugs}`.

**5. Executions list.** `EXECUTION_COLUMNS` gains:
```sql
COALESCE((SELECT array_agg(DISTINCT tt.tag_id) FROM test_run r
          JOIN test_case_tag tt ON tt.test_case_id = r.test_case_id
          WHERE r.execution_id = e.id), '{}') AS tag_ids
```
Deleted test cases' tags still count, since their join rows remain until purge. That's acceptable: the run still belongs to the execution. Detail responses carry the field too; it's harmless.

**6. Web.**
- **Types:** `Bug.tagIds`, `Execution.tagIds`, `Tag.bugCount`; the bug create and update inputs gain `tagIds`.
- **Pure filters:** `filterBugs` and `filterExecutions` gain `tagIds` ("any of"), with unit tests.
- `TagFilter`'s `onManage` becomes optional; without it, no Manage button is shown.
- **Bugs list:** a `TagFilter` with `onManage`, opening `ManageTagsDialog` (canEdit/canDelete from the bug permissions). **Executions list:** a `TagFilter` without it.
- **Bug detail:** generalize `TestCaseTags` into `TagsField` (props: `projectId`, `tagIds`, `canEdit`, `onChange`, `disabled`). It's used by the test case detail and the bug detail; the bug detail saves `{tagIds}` through its existing update mutation.
- `BugFormDialog`: a Tags field with the picker, as in the New Test Case modal, sending `tagIds` when non-empty. File bug from a run uses the same form.
- `ManageTagsDialog`: rows show "N test cases · M bugs", and delete says "It will be removed from N test cases and M bugs."

## Risks / Trade-offs

- [Refactoring the test case tag path] → It's covered by Slice 1's e2e tests, which must pass unchanged.
- [`array_agg(DISTINCT …)` per execution on every list call] → Small (runs per execution, indexed `test_case_tag (test_case_id, …)` PK). Revisit if execution lists grow large or get paginated.
- [Executions filter on current tags may surprise someone looking at an old execution] → Matches PRD wording ("contains at least one test case carrying"). Recorded in the spec scenario.

## Migration Plan

`0012` applies on top of `0011`. For the dev database: `apply-sql.js` with the migrator role, as in Slice 1. The down migration reverses it. Existing bugs start with no tags.
