# Design

## Context

See proposal.md - Why. Current state:

- **DB:** `test_case` has `UNIQUE (id, workspace_id)` (0008), so a join table can use the composite-FK tenant pattern. Every tenant table has forced RLS with the `tenant_isolation` policy; `db:check-rls` fails a `workspace_id` table without it. Last migration: `0010_folder`.
- **API, test cases** (`test-cases.controller.ts`):
  - `TEST_CASE_SELECT` feeds both list and detail.
  - `PATCH` validates name, script and status, then does one `UPDATE … COALESCE`.
  - Create, update and delete log nothing; only `move` logs (`logTreeActivity` in `folders/folder-queries.ts`, category "Test Cases", entity `folder | test_case`, actor = `ExecutionActor` from `loadActorDisplayName`).
- **API, patterns:**
  - `environments.controller.ts` maps Postgres unique violations (`23505`) to an HTTP error.
  - Pure rule modules carry unit specs (`folders/tree-rules.ts`).
  - Routes nest under `/projects/:projectId` behind `ProjectRoleGuard`.
- **Web:**
  - `test-case-detail.tsx` edits status through a `Select` and `updateTestCase`, then calls `notifySuccess`.
  - `test-case-tree.tsx` holds the name and status filters and passes them to the pure `filterTree`; `filtering` disables drag.
  - Semantic colour tokens (`--pass`, `--sev-*`…) live in `globals.css` for light and dark and are mapped into Tailwind.
  - shadcn has no `popover` or `command` yet.

## Goals / Non-Goals

**Goals:**
- One tag model that Slice 2 extends with `bug_tag` and filters without changing it.
- Test case activity history from now on: create, update (with a diff), delete.

**Non-Goals:**
- Bugs and the Executions/Bugs list filters (Slice 2).
- Backfilling activity for past test case edits (impossible; the log is append-only and the history doesn't exist).

## Decisions

**1. Schema (`0011_tag`).**
- `tag`:
  - Columns: `id`, `project_id`, `workspace_id`, `name text NOT NULL CHECK (btrim(name) <> '' AND length(name) <= 50)`, `color text NOT NULL CHECK (color IN (…8 tokens…))`, `created_at`, `updated_at`.
  - `UNIQUE (id, workspace_id)`; FK `(project_id, workspace_id) → project ON DELETE CASCADE`.
  - Unique index `ON tag (project_id, lower(name))`.
  - Forced RLS; grant `SELECT, INSERT, UPDATE, DELETE`.
- `test_case_tag`:
  - Columns: `test_case_id`, `tag_id`, `workspace_id`, `created_at`, with `PRIMARY KEY (test_case_id, tag_id)`.
  - FKs `(test_case_id, workspace_id) → test_case` and `(tag_id, workspace_id) → tag`, both `ON DELETE CASCADE`. Join rows aren't history; the activity log is.
  - Index on `tag_id`; forced RLS; grant `SELECT, INSERT, DELETE`.
- No soft delete on either (ADR 0016 decision 5).

**2. Tags API (`src/tags/`).**
- `tag-rules.ts` (pure, unit-tested):
  - `TAG_COLORS` (ordered palette)
  - `parseTagName` (trim, 1–50 characters, else 400)
  - `parseTagColor`
  - `nextColor(lastColor | null)`, which returns the palette entry after `lastColor`, wrapping around
- Routes:
  - `GET /projects/:projectId/tags` (Viewer): `SELECT t.*, COUNT(tc.id) FILTER (WHERE tc.deleted_at IS NULL)` via a left join through `test_case_tag`, `ORDER BY lower(name), id`.
  - `POST` (Contributor): the default colour comes from `nextColor` applied to the colour of the project's newest tag (`ORDER BY created_at DESC, id DESC LIMIT 1`). Two concurrent creates may pick the same colour, which is harmless.
  - `PATCH /:tagId` (Contributor).
  - `DELETE /:tagId` (Admin): count the carriers first, then `DELETE FROM tag` (join rows cascade).
- Unique violation `23505` → 409 "a tag with this name already exists". An unknown or foreign tag id → 404.
- Activity (category "Test Cases", entity `tag`):
  - `tag.created {color}`
  - `tag.updated {changes: {name?: {from,to}, color?: {from,to}}}`; no entry when nothing changed
  - `tag.deleted {testCases: n}`
- Response shape: `{ id, name, color, testCaseCount }`.

**3. Test case tags and logging (`test-cases.controller.ts`).**
- `TEST_CASE_SELECT` gains `COALESCE((SELECT array_agg(tt.tag_id ORDER BY tt.tag_id) FROM test_case_tag tt WHERE tt.test_case_id = tc.id), '{}') AS tag_ids`, and the response gains `tagIds`.
- `PATCH` accepts `tagIds`: an array of uuid strings, deduplicated, else 400.
- In the transaction:
  1. `SELECT … FOR UPDATE` the current row (name, script, status, and current tag ids with names). 404 if it's missing.
  2. If `tagIds` is given, verify every id is a tag of this project in one query (400 on any miss).
  3. Diff against the current set: delete the removed rows, insert the added ones.
  4. Run the existing `UPDATE`.
  5. Build `changes` from the before/after values: `status: {from,to}` and `name: {from,to}` when changed; `gherkinScript: true` when changed (scripts can be long); `tags: {added: [names], removed: [names]}`.
  6. Log `test_case.updated {changes}` only if `changes` isn't empty.
- `POST` also accepts `tagIds` (same parsing and project check, 400 before anything is inserted); the join rows are written in the create transaction. Create logs `test_case.created {folderId, tags: [names]}`; delete logs `test_case.deleted`. Both reuse `logTreeActivity`, with the actor built like the folders controller does.

*Alternative:* separate `POST/DELETE /test-cases/:id/tags/:tagId` routes. Rejected: the picker toggles one tag at a time, but sending the full set keeps one write path, one diff and one log entry, and makes a lost race resolve to "last full set wins" instead of interleaved toggles.

**4. Web.**
- Add shadcn `popover` and `command` (installs `cmdk`).
- `lib/tags-api.ts`: `listTags`, `createTag`, `updateTag`, `deleteTag`, `TAG_COLORS`, `tagKeys.list(projectId)`. `TestCase` gains `tagIds`.
- **Palette:** `--tag-<color>` / `--tag-<color>-foreground` pairs in `globals.css` for `:root` and `.dark`, mapped in `@theme` like the semantic tokens. `components/tags/tag-badge.tsx` maps the colour to classes.
- `components/tags/tag-picker.tsx` is a Popover + Command:
  - search, a check next to carried tags, and "Create “…”" when the trimmed input matches no tag (ignoring case) and the user can edit
  - selecting toggles the tag and calls `onChange(nextTagIds)`
  - creating calls `createTag`, then `onChange([...ids, created.id])`
- **New Test Case modal** (added 2026-10-27): the same `TagPicker` below the folder picker, holding the chosen ids in local state (created tags are created at once, as in the detail) and sending them as `tagIds` with the create request.
- **Test case detail:** a "Tags" row with badges, plus the picker for Contributors and Admins. Changes go through the existing update mutation with `{ tagIds }` and notify "Tags updated". The tags and test-cases queries are invalidated.
- **Tree:**
  - `filterTree` gains `tagIds?: string[]` (match when a test case carries any of them; ANDed with name and status), and `filtering` includes it.
  - `components/tags/tag-filter.tsx` is a Popover with a checkbox per tag, "Clear", and "Manage tags…".
- `components/tags/manage-tags-dialog.tsx` (an interim home: it moves to a project settings page later, roadmap-full.md Phase 11) is a plain `Dialog` (a management list, not a create form, so not `FormDialog`):
  - each row has a colour swatch button that opens the eight-swatch palette, the name as an input that saves on blur or Enter, the test case count, and Delete (Admin)
  - Delete opens a confirm dialog: "Delete “x”? It will be removed from N test cases."
  - a refused rename shows `ActionError` on that row and resets the input
  - Viewers see read-only rows

## Risks / Trade-offs

- [Full-set `tagIds` overwrites a concurrent edit by another user] → Accepted for now; G5 (concurrent edits) is still open project-wide. The activity log shows both changes.
- [`cmdk` is a new dependency] → It's the standard shadcn combobox base, small, and React 19 compatible. The tree filter could use a plain dropdown, but the picker needs search and create.
- [Logging changes the update path that every test case edit uses] → The existing test-case e2e specs must still pass, and new e2e specs assert the entries.

## Migration Plan

`npm run db:migrate` applies `0011`; the down migration drops both tables. Existing data is unaffected. The demo seed doesn't add tags (could be a later follow-up).
