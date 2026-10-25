# Tasks

## 1. Database roles & base migration

- [x] 1.1 Create the migration role and the `railgun_app` role (no `BYPASSRLS`, not the tables' owner) in the local setup script — verify `SELECT rolbypassrls FROM pg_roles WHERE rolname = 'railgun_app'` returns `false`
- [x] 1.2 Write the base migration (plain SQL) creating `workspace`, `user`, `workspace_membership`, `project`, `project_membership` with the columns, checks, and foreign keys from design.md — verify the migration applies cleanly to a fresh database
- [x] 1.3 Write the corresponding down migration — verify applying then rolling back leaves no orphaned tables, types, or policies

## 2. RLS policies

- [x] 2.1 Enable and force RLS, then add the tenant-scoped policy on `workspace` (keyed on its own `id`), `project`, and `project_membership` (keyed on `workspace_id`) — verify as `railgun_app`: with `app.workspace_id` = A, `SELECT` on `project` returns only A's rows; with no context set, it returns zero rows; inserting a row with `workspace_id` = B while context is A fails
- [x] 2.2 Add the `self_access` policy on `user` and both the `self_membership` and `workspace_scoped` policies on `workspace_membership` — verify a `workspace_membership` row is visible when either `app.user_id` matches its `user_id` or `app.workspace_id` matches its `workspace_id`, and invisible when neither does
- [x] 2.3 Grant `railgun_app` exactly `SELECT, INSERT, UPDATE, DELETE` on all five tables, nothing more — verify against `information_schema.role_table_grants`

## 3. withTenantContext helper

- [x] 3.1 Implement `withTenantContext(prisma, workspaceId, fn)` in `apps/api` exactly as ADR 0008 decided — verify a unit test (fake `workspaceId`, mocked `$transaction`) asserts `set_config('app.workspace_id', ...)` runs before `fn`, inside one transaction
- [x] 3.2 Add the lint rule / dependency-boundary check blocking direct import of the raw `PrismaClient` singleton from any service (ADR 0008) — verify it fails on a deliberately-added violating import in a throwaway fixture, then remove the fixture

## 4. RLS-coverage CI check

- [x] 4.1 Write the script that joins `information_schema.columns` (for `workspace_id`) against `pg_class`/`pg_policies` and exits non-zero if any such table lacks a forced policy — verify it passes against this change's schema and fails against a throwaway migration that adds a `workspace_id` column with no policy
- [x] 4.2 Wire the script into the CI workflow created in the `monorepo-scaffold` change — verify the workflow runs it and fails when 4.1's throwaway fixture is present, then remove the fixture

## 5. Cross-tenant test harness

- [x] 5.1 Build the reusable test helper (creates workspaces A and B, inserts via `withTenantContext`) for use by this and every future change's cross-tenant tests — verify it needs no per-test setup beyond calling it
- [x] 5.2 Write the three tests required by `specs/tenant-isolation`: cross-tenant read returns nothing, missing context returns zero rows, mismatched-`workspace_id` write is rejected — verify all three pass against a real Postgres instance (container), not a mock
- [x] 5.3 Test that `project_membership`'s composite foreign key rejects a membership row whose `workspace_id` doesn't match its project's actual `workspace_id` — verify the insert fails

## 6. Seed data

- [x] 6.1 Write a local-dev seed script creating two workspaces, each with one Owner `user` and one `project`, for manual testing and as a fixture for later changes — verify running it twice does not create duplicate rows

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
