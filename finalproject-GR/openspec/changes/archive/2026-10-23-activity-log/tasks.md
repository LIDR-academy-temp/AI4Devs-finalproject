# Tasks

## 1. Migration: table, RLS, grants

- [x] 1.1 Add a migration creating `activity_entries` with all columns from design.md plus the `CHECK ((actor_user_id IS NULL) = (actor_display_name IS NULL))` constraint — verify it applies cleanly on top of `0001_base_schema`
- [x] 1.2 Enable and force RLS, add the `tenant_isolation` policy keyed on `workspace_id` — verify `npm run db:check-rls` still passes, and as `railgun_app` with two workspaces seeded, a read under workspace A's context returns only A's entries
- [x] 1.3 Grant `railgun_app` only `SELECT, INSERT` on `activity_entries` — verify via `information_schema.role_table_grants` that `UPDATE`/`DELETE`/`TRUNCATE` are absent
- [x] 1.4 Write the corresponding down migration — verify applying then rolling back leaves no orphaned tables, policies, or constraints

## 2. Immutability trigger & break-glass role

- [x] 2.1 Create the `railgun_breakglass` role (`NOLOGIN`) and the `reject_activity_entries_mutation()` trigger function plus trigger — verify as `railgun_app` that both `UPDATE` and `DELETE` on an existing entry fail
- [x] 2.2 Verify the break-glass exception without ever granting the role `LOGIN`: as a superuser, `SET ROLE railgun_breakglass`, then confirm `UPDATE` succeeds where it failed for `railgun_app`, then `RESET ROLE` — also assert the role name the trigger checks (`railgun_breakglass`) matches the role actually created

## 3. ActivityLogger.log

- [x] 3.1 Implement the `ActivityLogEntry` interface and `log(tx, entry)` in `apps/api/src/common` — verify a unit test (mocked `tx.$executeRaw`) asserts the insert carries every field of the given entry and opens no transaction of its own
- [x] 3.2 Integration test for commit/rollback atomicity against real Postgres: a transaction that calls `log()` then rolls back leaves zero entries; one that commits leaves exactly one — verify both pass
- [x] 3.3 Integration test that an entry survives deletion of the row it describes (e.g. a throwaway `project` row) — verify the entry still exists afterward, unchanged, with its original name snapshot

## 4. Keyset pagination

- [x] 4.1 Write the keyset-paginated read query (ordered by `workspace_id, project_id, created_at desc, id`, no offset) — verify a test seeds several entries with controlled `created_at` values and confirms paging past a cursor returns only strictly older entries, in descending order

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
