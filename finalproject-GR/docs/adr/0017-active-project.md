# ADR 0017: Active Project

**Status:** Accepted
**Date:** 2026-10-27
**Amends:** [ADR 0002](0002-authentication-and-workspace-membership.md) (where a user's working context comes from)

## Context

[PRD.md](../../PRD.md) §5 says that after signing in "the user lands on the last active project of the last active workspace", and that selecting a project in the project switcher "changes the active context for the entire application". Until roadmap-full.md Phase 4's Projects slice, every workspace had exactly one project. The API resolved it as "the oldest project of the user's oldest workspace" on every request. The web app keeps no project in its URLs: every screen takes the project id from `GET /me`.

Creating several projects per workspace needs a place to remember which one the user is working in.

## Decision

1. **The server remembers the last active project**, in `user.last_project_id`. The foreign key uses `ON DELETE SET NULL`. The workspace comes from the project, so the same column also answers "last active workspace" once a user can belong to several.
2. **The active project is resolved on every authenticated request**, in this order:
   1. the last active project, while it is live (not in the trash) and grants the user a role;
   2. otherwise the oldest live project the user can access;
   3. otherwise the workspace's oldest live project, which the web app shows as access denied.

   A stale value is ignored, not cleared.
3. **Switching** (`PUT /me/active-project`) is allowed only to a live project that grants the caller a role. It is a preference, so it is not activity-logged.
4. **URLs stay project-free** (`/test-cases`, `/bugs`, …). The web app resets its cached data when the active project changes.

## Alternatives Considered

- **A cookie or browser storage.** This is the simplest option, but it is per device: signing in on another machine would land on the wrong project, contrary to PRD §5.
- **The project in the URL** (`/p/<slug>/test-cases`). This gives shareable per-project links, but every route, link and test would need reworking. A last-active lookup would still be needed for the landing page.
- **One last project per workspace** (`workspace_membership.last_project_id`) plus `user.last_workspace_id`. This is more precise for a user in several workspaces. It adds two columns for a journey that doesn't exist yet, because only invitations (Phase 3 remainder) can put a user in a second workspace.

## Consequences

- Every tab and device of a user shares one active project. A tab that is open while the user switches in another one keeps its cached project until it refetches. Its writes are still authorised against the project they name.
- A project moved to the trash simply stops being resolved. Its users fall back to another project without any cleanup write.

## Revisit Triggers

- A user can belong to more than one workspace (invitations). Then consider remembering the last project per workspace.
- Per-project deep links become a requirement (sharing a link to a test case in a specific project).
