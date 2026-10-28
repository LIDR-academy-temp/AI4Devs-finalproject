# Proposal

## Why

`identity-provisioning` resolved *who* is asking; nothing yet decides *what they're allowed to do*. ADR 0002 and PRD §3 define that: workspace role is a ceiling (Owner is implicitly Project Admin everywhere in their workspace; Collaborator has no implicit access at all), and project role (Admin/Contributor/Viewer) governs day-to-day access, as application logic rather than anything RLS can express. This change builds that policy module, continuing roadmap-mvp.md Phase 3's second slice.

## What Changes

- **Prerequisite refactor:** `identity-provisioning` only resolved the caller's internal user id inside `GET /me`'s own handler, via its own `provisionIdentity` call — no other endpoint has it. Role checks need it everywhere. `ClerkAuthGuard` is extended (or a second guard runs immediately after it) to resolve/provision identity for every authenticated request, so `request.auth` already carries the internal `userId`. `GET /me` is refactored to read it rather than resolving it itself — its observable behavior (response shape, provisioning-on-first-contact, idempotency) is unchanged; this is purely where the resolution happens.
- A `@RequireProjectRole(minimumRole)` decorator and a `ProjectRoleGuard`: resolves the target project from the route, finds that project's `workspace_id`, checks `workspace_membership` for an Owner row for that workspace (→ effective Admin for every project in it — never a stored `project_membership` row, since that would go stale), otherwise checks `project_membership` for an explicit role on that project, otherwise denies access.
- A workspace-visible user (passed RLS — they're in the right workspace) with no `project_membership` row for *this* project gets **403**, not 404. RLS already proved the project exists and is in their workspace; this is a permission gate on top of that, not an existence check — ADR 0003's "another workspace → 404" case is different and unaffected.
- One endpoint to exercise and prove the guard: `GET /projects/:projectId` (id, name, slug), gated at the Viewer tier — the lowest bar, so the same endpoint proves both "Owner with no explicit membership row still gets in" and "Collaborator with zero `project_membership` gets 403."

**Not included** (explicitly out of scope for this change):
- Any project mutation endpoint (create/update/delete) — nothing to gate yet beyond this one read.
- The full project CRUD surface.
- Invitations — still not built; Collaborator-with-explicit-role test fixtures are seeded directly, same as every prior change.

## Capabilities

### New Capabilities
- `project-authorization`: a request for a specific project resolves to an effective project role (Admin, Contributor, Viewer, or none) combining workspace-level Owner status and any explicit project membership, and endpoints can require a minimum role to proceed.

### Modified Capabilities
_None._ `identity-provisioning`'s observable behavior (what `GET /me` returns, when provisioning happens) is unchanged by moving *where* resolution occurs — that's an implementation detail, not a spec-level change. `api-health-check`, `tenant-isolation`, and `activity-log` are unaffected.

## Impact

- **Affected code:** `ClerkAuthGuard` (extended or paired with a new guard), `GET /me` (refactored, not behaviorally changed), the new `ProjectRoleGuard` and `@RequireProjectRole` decorator, and the new `GET /projects/:projectId` endpoint.
- **Dependencies:** none new — built entirely on tables and mechanisms already in place (`workspace_membership`, `project_membership`, `withTenantContext`).
- **Systems:** every future endpoint that touches a specific project uses this same guard; this change is what makes that pattern real rather than hypothetical.
