# Tasks

## 1. Migration: table, RLS, grant

- [x] 1.1 Write a migration creating `test_case` with every column and constraint from design.md (including the composite FK to `project` and the `status` CHECK) — verify it applies cleanly on top of `0001`–`0004`
- [x] 1.2 Enable and force RLS, add the `tenant_isolation` policy (same shape as `project`) — verify as `railgun_app`: workspace A's context sees only A's test cases; no context set returns zero rows
- [x] 1.3 Grant `railgun_app` `SELECT, INSERT, UPDATE` on `test_case` — no `DELETE` yet, since delete is out of scope for this change — verify via `information_schema.role_table_grants` that only those three are present
- [x] 1.4 Write the down migration — verify applying then rolling back leaves no orphaned table or policy, and `npm run db:check-rls` still passes afterward

## 2. Create and list

- [x] 2.1 Implement `POST /projects/:projectId/test-cases` (`Contributor`+) — verify e2e against real Postgres: creating with a script returns 201 with status `Draft` and the script persisted; creating with only a name returns 201 with no script
- [x] 2.2 Implement `GET /projects/:projectId/test-cases` (`Viewer`+), including computed `sourceType` on each item — verify e2e: a Viewer lists and sees every non-deleted test case in the project
- [x] 2.3 Verify role denial on both endpoints: a `Viewer` attempting to create gets 403; a caller with no effective access to the project gets 403 on the list

## 3. Detail and update

- [x] 3.1 Implement `GET /projects/:projectId/test-cases/:testCaseId` (`Viewer`+) — verify e2e: a test case with a script reports `sourceType: 'Gherkin'`; one with no script reports `'Manual'`
- [x] 3.2 Implement `PATCH /projects/:projectId/test-cases/:testCaseId` (`Contributor`+) covering `name`, `gherkin_script`, and `status` together — verify e2e: updating name and script together persists both; setting `status` to `Ready` persists it with no additional step
- [x] 3.3 Verify role denial: a `Viewer` attempting to update gets 403; a caller with no effective access gets 403 on both detail and update

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
