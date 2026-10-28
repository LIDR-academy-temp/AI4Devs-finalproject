# Tasks

## 1. Migration: environment, environment_credential tables, RLS, grants

- [x] 1.1 Write `db/migrations/0007_environment_credentials.up.sql` creating `environment` (`id`, `project_id`, `workspace_id`, `name`, `base_url`, `default_browser` CHECK IN `('Chromium', 'Firefox', 'WebKit')`, `created_at`, `UNIQUE (id, workspace_id)`, `FOREIGN KEY (project_id, workspace_id) REFERENCES project(id, workspace_id) ON DELETE CASCADE`) and `environment_credential` (`id`, `environment_id`, `workspace_id`, `alias`, `email`, `password_ciphertext` text, `created_at`, `UNIQUE (environment_id, alias)`, `FOREIGN KEY (environment_id, workspace_id) REFERENCES environment(id, workspace_id) ON DELETE CASCADE`) — verify the migration applies cleanly on top of `0001`–`0006`
- [x] 1.2 Enable and force RLS on both tables, add the standard `tenant_isolation` policy (same shape as `test_case`/`workspace_dek`) — verify as `railgun_app`: workspace A's context sees only A's environments/credentials; no context set returns zero rows from either table
- [x] 1.3 Grant `railgun_app` `SELECT, INSERT, UPDATE, DELETE` on both tables (full CRUD, no soft delete — proposal.md) — verify via `information_schema.role_table_grants` that exactly those four privileges are present on each table
- [x] 1.4 Write the down migration — verify applying then rolling back leaves no orphaned tables or policies, and `npm run db:check-rls` still passes afterward

## 2. Environment CRUD

- [x] 2.1 Implement `POST /projects/:projectId/environments` (`Admin`+) and `GET /projects/:projectId/environments` / `GET /projects/:projectId/environments/:environmentId` (`Viewer`+), following the `test-cases.controller.ts` shape (`ProjectRoleGuard` + `resolveProjectWorkspaceId` + `withTenantContext`) — response includes each environment's credentials with `alias`/`email` only, never a password field — verify e2e test: creating an environment with one credential, then listing and fetching its detail, shows the credential's alias and email and no password value anywhere in the response
- [x] 2.2 Implement `PATCH /projects/:projectId/environments/:environmentId` (`Admin`+): updates `name`/`baseUrl`/`defaultBrowser` (omitted fields unchanged, matching `test_case`'s `PATCH` convention) and reconciles a `credentials` array in the same transaction — existing credentials matched by id are updated (an omitted `password` leaves the stored value unchanged; an empty-string `password` is rejected), credentials with no id are inserted (pre-generate the credential id in the application so it is available both for `secrets-encryption.encrypt(..., credentialId, password)` and the `INSERT`), and existing credentials absent from the array are deleted — verify e2e test: adding a new credential, then updating an existing one's email while omitting `password`, confirms a later reveal (task 3.1) still returns the original password unchanged
- [x] 2.3 Implement `DELETE /projects/:projectId/environments/:environmentId` (`Admin`+): a hard delete, cascading to credentials (no `deleted_at`/`deleted_by` — proposal.md) — verify e2e test: deleting an environment with credentials removes both; the environment no longer appears in the list, and querying `environment_credential` directly for that environment id returns zero rows
- [x] 2.4 Reject a duplicate alias within the same environment with a `400` (catch the unique-constraint violation, do not surface a raw DB error) — verify unit/e2e test covering both create-with-duplicate-alias and patch-introducing-a-duplicate-alias
- [x] 2.5 Role-gate tests: `Contributor` and `Viewer` each receive `403` on `POST`/`PATCH`/`DELETE`; `Viewer` receives `200` on both `GET` routes — verify e2e test using the same role-setup helpers as `test-cases.e2e-spec.ts` (`setUpContributor`/`setUpViewer`/`setUpAdmin`)
- [x] 2.6 Cross-tenant test: workspace A cannot list, fetch, update, or delete workspace B's environments or credentials — verify e2e test extending the `cross-tenant-harness` pattern from `tenant-isolation.e2e-spec.ts`

## 3. Reveal endpoint

- [x] 3.1 Implement `POST /projects/:projectId/environments/:environmentId/credentials/:credentialId/reveal` (`Contributor`+): inside one `withTenantContext` transaction, `decrypt` the credential's password via `secrets-encryption` and call `ActivityLogger.log` (`category: 'Environments'`, `actionCode: 'environment_credential.revealed'`, `entityType: 'environment_credential'`, `entityId` the credential id, `entityName` the credential's alias, `details: { environmentId, environmentName }`); set `Cache-Control: no-store` on the response — verify e2e test: the response contains the original plaintext password, carries that header, and exactly one new `activity_entries` row exists afterward with the expected fields
- [x] 3.2 Role-gate test: `Viewer` receives `403` on the reveal route and no password is returned — verify e2e test
- [x] 3.3 Implement an in-process fixed-window rate limiter (10 reveals per user per 60-second window — design.md) as a guard applied only to the reveal route — verify unit test: an 11th call within the window throws `429`; after the window elapses, a new call from the same user succeeds
- [x] 3.4 Verify a rate-limited rejection writes no activity-log entry — e2e test: trigger the limiter, then confirm the `activity_entries` row count for that credential is unchanged from before the rejected attempts
- [x] 3.5 Verify a rolled-back reveal writes no activity-log entry — e2e test modeled on `secrets-encryption`'s binding-failure tests: corrupt a credential's stored ciphertext directly, confirm the reveal fails and no new `activity_entries` row exists

## 4. Lint and typecheck

- [x] 4.1 Run `npm run lint -w apps/api` and `npm run typecheck -w apps/api` and fix any issues raised by the new controller/guard/test files — verify both commands exit cleanly

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
