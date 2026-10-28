# ADR 0002: Authentication and Workspace Membership

**Status:** Accepted, amended by [ADR 0009](0009-api-authentication-transport.md) (API authentication transport)
**Date:** 2026-09-23
**Amends:** [ADR 0001](0001-tech-stack.md) (Authentication layer)

## Context

ADR 0001 chose Clerk largely because its "organization" primitive seemed to map onto the Workspace concept and to ship invite flows. Since then, [PRD.md](../../PRD.md) v1.1 fixed several rules that test that assumption:

- Two-level RBAC: workspace role (Owner, Collaborator) as a ceiling, plus project role (Admin, Contributor, Viewer) (§3).
- Invitations are **to a project**, by email, for both existing and new users. Nobody is added without explicitly accepting; invitations expire after 7 days and can be revoked or resent. Accepting also makes the person a workspace Collaborator (§3.3).
- A user can belong to several workspaces and switches between them; pending invitations appear in the workspace switcher (§5).
- Password reset, and email verification required before a user can see or accept invitations (§4.5, §4.6).
- Sign-up creates the user and their first workspace together, except when signing up through an invitation link (§4.2).
- Ownership transfer only to an existing member; the previous Owner becomes a Collaborator and keeps Project Admin on existing projects (§6.9). Removed members' content is kept under "Former member" (§3.3).

**What was checked in Clerk's documentation** (Sept 2026): organization invitations accept custom metadata, can be revoked, have a configurable expiry (default 30 days), and users can belong to multiple organizations with a prebuilt switcher. **Not confirmed from the docs:** whether an already-registered user can list and accept or decline pending invitations in our own UI, whether a resend action exists, and how ownership transfer works.

The decisive problem is structural: a Clerk organization invitation adds someone to an *organization*. Our invitations target a *project*, and an existing workspace member invited to a second project cannot receive an organization invitation because they are already a member. A custom project-invitation flow is therefore needed regardless of the provider.

## Decision

**Clerk is used for identity only. Workspaces, memberships, roles and invitations live in our own PostgreSQL database.** Clerk Organizations are not used.

| Concern | Owner |
|---|---|
| Sign-up, sign-in, sessions | Clerk |
| Password reset, email verification | Clerk |
| User profile (display name, password change) | Clerk, mirrored into our `users` table |
| Workspaces, workspace membership and role | Our database |
| Project membership and role | Our database |
| Invitations (pending, accepted, declined, revoked, expired) | Our database, sent by our own email service |
| Ownership transfer, "Former member" attribution | Our database |
| Authorization decisions (workspace ceiling × project role) | Our API, in one policy module |

Design points that follow from the decision:

- **Identity mapping:** our `users` table holds a unique Clerk user id. Membership tables reference our user id, never Clerk's, so the provider can be replaced by remapping one column.
- **Atomic sign-up:** the sign-up form collects the workspace name. Provisioning of the user, workspace and Owner membership happens in one idempotent database transaction on first authenticated request (or on Clerk's user-created event, whichever is implemented), so a user can never exist without a workspace, except an invited user who deliberately has none.
- **Invitations:** stored with email, project, role, a hashed token, expiry (7 days), status, and inviter. Accepting is a single transaction that creates the project membership and, if missing, the workspace Collaborator membership.
- **Verification gate:** the API checks the email-verified status from Clerk before listing or accepting invitations. Invitations sent to an unverified account stay pending.
- **Authorization:** a single policy module (NestJS guards) evaluates workspace role and project role. Owners are implicitly Project Admin on every project. Project roles are application logic, not identity-provider data.

## Rationale

- **One source of truth for access.** With Clerk Organizations, membership would live in two places (Clerk and Postgres, the latter needed anyway for project roles) and stay consistent only through webhook synchronisation, creating windows where a user has access in one system but not the other.
- **The PRD's invitation semantics are ours.** Acceptance, decline, 7-day expiry, resend, project-scoped roles and invitations to existing members all need to be implemented against our own tables in any case. Using Clerk for part of the flow would leave two invitation systems.
- **Provider lock-in is minimised.** Only credentials and sessions depend on Clerk. Its per-organization pricing model does not apply.
- **Clerk still removes the most security-sensitive code:** password storage, reset flow, email verification, session handling, and protection against account enumeration.

## Alternatives Considered

- **Clerk identity plus Clerk Organizations for workspaces.** Saves building the switcher UI and gives multi-organization support out of the box. Rejected: dual source of truth for membership, a separate flow still needed for project invitations to existing members, unconfirmed in-app accept/decline and resend, and organization-based pricing.
- **Self-hosted auth library (Better Auth, Auth.js) with everything in Postgres.** No vendor cost, no third party on the sign-in path, full control over data location. Rejected for now because the team would own password reset, verification, session hardening and rate limiting. Revisit if Clerk's cost, availability or data-residency terms become a problem. The identity-only design keeps this migration small.
- **Auth0, Supabase Auth.** Not re-evaluated in this round; see ADR 0001.

## Consequences

- We build the workspace switcher, pending-invitations UI, invitation management on the Project Members page, and the email templates ourselves.
- **A transactional email service becomes a required component** (invitations, reminders). It is not chosen yet.
- Clerk remains on the sign-in critical path and its cost scales with active users. It is flagged for re-evaluation if pricing or control requirements change, as in ADR 0001.
- Membership and role changes take effect immediately, since they never depend on an external sync.

## Open Items

- Choice of transactional email provider.
- Whether Clerk's application-level invitations (sign-up tickets) can supply a pre-verified email for new users arriving through an invitation link, or whether the emailed token alone is treated as proof of address ownership.
- ~~How the browser authenticates to the API given the frontend and API are on different hosts (bearer token versus cookie), including WebSocket handshake authentication.~~ Settled in [ADR 0009](0009-api-authentication-transport.md): bearer token (Clerk session JWT verified against Clerk's JWKS), reused by the SSE client later.
- Confirm in Clerk's documentation whether ownership-related and profile events needed for mirroring `users` are delivered by webhook.

## Sources

- Clerk documentation: organization invitations (`clerk.com/docs/guides/organizations/add-members/invitations`) and organizations overview (`clerk.com/docs/organizations/overview`).
