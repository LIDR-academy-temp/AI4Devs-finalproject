# Tasks

## 1. Move identity resolution into the guard

- [x] 1.1 Extend `ClerkAuthGuard` to call `provisionIdentity` after token verification, populating `request.auth.userId` and `request.auth.workspaceId` — verify a unit test (mocked `verifyToken` and `provisionIdentity`) asserts both are set before the handler runs
- [x] 1.2 Refactor `GET /me` to read `request.auth` instead of calling `provisionIdentity` itself — verify the existing `GET /me` e2e tests from `identity-provisioning` still pass unchanged (same response shape, same idempotency)
- [x] 1.3 Fix `provisionIdentity`'s existing-user branch to resolve any workspace membership, not specifically `Owner` (design.md's correction) — verify an integration test: a user with only a `Collaborator` membership resolves without error, returning that membership's `workspace_id`

## 2. RLS widening (migration 0004)

- [x] 2.1 Write a migration adding `member_visible` (`FOR SELECT`) on `project` and `self_project_membership` (`FOR SELECT`) on `project_membership`, per design.md — verify it applies cleanly on top of `0001`–`0003`
- [x] 2.2 Verify as `railgun_app` with only `app.user_id` set (no `app.workspace_id`): `SELECT workspace_id FROM project WHERE id = X` returns the row when the caller belongs to that project's workspace, and zero rows when they don't; `SELECT ... FROM project_membership WHERE user_id = X` returns the caller's own rows regardless of workspace context
- [x] 2.3 Write the down migration — verify applying then rolling back leaves no orphaned policy

## 3. `resolveEffectiveProjectRole` and the guard

- [x] 3.1 Implement `resolveEffectiveProjectRole(prisma, userId, projectId)` per design.md — verify integration tests against real Postgres: an Owner with no explicit `project_membership` resolves to `Admin`; a Collaborator with an explicit `Contributor` row resolves to `Contributor`; a Collaborator with no row resolves to `null`
- [x] 3.2 Implement `@RequireProjectRole(minimumRole)` and `ProjectRoleGuard` — verify a unit test (mocked `resolveEffectiveProjectRole`) proceeds when the resolved role meets the minimum, and throws `ForbiddenException` (403) when it's below the minimum or `null`

## 4. `GET /projects/:projectId`

- [x] 4.1 Implement the endpoint (id, name, slug), gated at the `Viewer` tier — verify an e2e test against real Postgres: an Owner with no explicit membership gets 200; a Collaborator with an explicit `Viewer`-or-above role gets 200; a Collaborator with zero `project_membership` rows for that project gets 403

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
