# Tasks

## 1. Widen `user`'s RLS policy (migration 0003)

- [x] 1.1 Write a migration dropping and recreating `self_access` on `"user"` with the `clerk_user_id` branch added to `USING`, `WITH CHECK` unchanged (design.md) — verify it applies cleanly on top of `0001`/`0002`
- [x] 1.2 Verify as `railgun_app`: with only `app.clerk_user_id` set (no `app.user_id`), a query by `clerk_user_id` returns the matching row; with neither set, zero rows
- [x] 1.3 Write the down migration restoring the original single-condition policy — verify applying then rolling back leaves no orphaned policy

## 2. `withUserContext` and `provisionIdentity`

- [x] 2.1 Implement `withUserContext(prisma, userId, fn)` in `apps/api/src/common` — verify a unit test (mocked `tx`) asserts `set_config('app.user_id', ...)` runs before `fn`, inside one transaction
- [x] 2.2 Implement `provisionIdentity(prisma, clerkUserId, email, displayName)` per design.md — verify an integration test (real Postgres): the first call for a never-seen `clerkUserId` creates exactly one `user`, one `workspace`, and one `Owner` `workspace_membership` row, and returns `created: true`
- [x] 2.3 Verify idempotency against real Postgres: a second call for the same `clerkUserId` creates no additional `user`, `workspace`, or `workspace_membership` row, returns the same `workspaceId` as the first call, and `created: false`

## 3. Clerk auth guard

- [x] 3.1 Add `@clerk/backend`, implement the guard that verifies the bearer token and resolves the Clerk user id — verify a unit test with a mocked verification call accepts a valid token and rejects missing, invalid, and expired tokens with 401
- [x] 3.2 Wire the guard on every route except `GET /health` — verify an integration test: a protected route with no token returns 401, and `GET /health` still succeeds unauthenticated

## 4. `GET /me`

- [x] 4.1 Implement `GET /me`, calling `provisionIdentity` with the guard-resolved identity and Clerk profile data, returning `id`, `displayName`, `email`, `workspaceId` — verify an integration test with `verifyToken` and the Clerk Users-API profile fetch mocked at the boundary (design.md's corrected Risk resolution), but real Postgres underneath, returns the expected shape
- [x] 4.2 Verify end-to-end idempotency through the real endpoint with the same mocked-boundary approach: calling `GET /me` twice for the same Clerk user id returns the same `workspaceId` both times

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
- Once a real Clerk account exists: manually verify the real `verifyToken`-against-live-JWKS path with one genuine session token (design.md's Risk resolution) — not a blocking automated test for this change.
