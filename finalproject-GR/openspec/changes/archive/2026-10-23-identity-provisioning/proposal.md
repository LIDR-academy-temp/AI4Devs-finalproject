# Proposal

## Why

Every screen and endpoint from here on needs to know who's asking and which workspace they're in. ADR 0002 decided identity lives in Clerk while workspace/membership data lives in our own Postgres, provisioned atomically "on first authenticated request." ADR 0009 decided how the API verifies that request (bearer token against Clerk's JWKS). Neither has been built yet — `tenant-base-schema` built the tables and the RLS policies these decisions require, but deliberately left the application-code half (the auth guard, the provisioning transaction, `withUserContext`) for whichever change actually needed a caller. This is that change, continuing roadmap-mvp.md Phase 3.

## What Changes

- A NestJS guard verifies the Clerk session JWT from the `Authorization` header against Clerk's JWKS (cached), resolving the Clerk user id and email-verified status. Runs on every endpoint except `GET /health`. Rejects with 401 if the token is missing, invalid, or expired.
- Atomic sign-up provisioning: on first authenticated request from a given Clerk user id, in one transaction — mirror the identity into `"user"`, create a `workspace`, create its `workspace_membership` row with role `Owner`. Idempotent: a repeat request for the same Clerk user id creates nothing new.
- `withUserContext(prisma, userId, fn)`: the application-code counterpart to the user-keyed RLS policies `tenant-base-schema` built schema-only. This change is its first real caller, and exercises the bootstrapping pattern that design doc documented (generate the user's id client-side, set `app.user_id` to it, then insert, so `self_access`'s `WITH CHECK` passes).
- `GET /me`: returns the resolved user's id, display name, email, and their (just-provisioned-or-found) workspace id. Protected by the new guard; exercises the whole mechanism end-to-end the way `GET /health` did for the scaffold change.

**Not included** (explicitly out of scope for this change):
- The authorization policy module evaluating workspace-role × project-role (ADR 0002's guard matrix) — a separate, second slice of this same phase, since it's about access-control rules, not identity.
- Invitations — still seeded directly for the demo (roadmap-mvp.md Phase 3).
- Frontend sign-up/sign-in pages — this is the backend guard and provisioning logic only, verified by integration tests against a real test-mode Clerk token, not through any UI.
- Acting on the email-verified flag beyond reading it — nothing yet needs it, since invitations (the first real consumer) aren't built.

## Capabilities

### New Capabilities
- `identity-provisioning`: a request carrying a valid Clerk session resolves to exactly one `user` row, one `workspace`, and one `Owner` `workspace_membership` row — created on the first such request for a given identity, found (not recreated) on every request after.

### Modified Capabilities
_None — `identity-provisioning` is new; `api-health-check`, `tenant-isolation`, and `activity-log` are unaffected._

## Impact

- **Affected code:** a new auth guard in `apps/api`, the provisioning transaction, `withUserContext`, and the `GET /me` endpoint.
- **Dependencies:** a Clerk application (test-mode credentials) is required to actually exercise this end-to-end — see design.md's Risks. No new npm dependencies beyond a JWKS/JWT verification library.
- **Systems:** every later endpoint in this phase and beyond runs behind the same guard; the next slice (authorization) builds directly on the user/workspace this change resolves.
