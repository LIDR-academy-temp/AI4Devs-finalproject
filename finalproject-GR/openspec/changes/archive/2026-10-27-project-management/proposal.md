# Proposal

## Why

Every workspace has exactly one project today, "My First Project", created at sign-up by `provisionIdentity`. Nobody can create, rename or delete a project. `GET /me` always returns the oldest project, and the sidebar shows its name as static text. PRD §2.2 makes the project the main unit of organisation. PRD §5, §6.7, §6.9 and §7.5 describe a project switcher, Project Settings › General, Workspace Settings › Projects and the New Project flow. This is the last remaining slice of roadmap-full.md Phase 4 ("Later slices: Projects"). Tags, the other part of that phase, were finished on 2026-10-27.

Decided with the user on 2026-10-27:
- **Scope:** projects core only. Workspace Settings › Members and Transfer Ownership are deferred.
- **Active project:** the user's last active project is stored on the server (ADR 0017, written in this change).
- **Deleting:** the last live project in a workspace cannot be deleted.

## What Changes

- **Database:** migration `0013_project_management` adds `user.last_project_id`. Its foreign key uses `ON DELETE SET NULL` and points at the user's last active project. The project table already has `deleted_at`/`deleted_by` (ADR 0007), so no project columns are added.
- **Active project resolution:** `provisionIdentity` resolves the active project in this order:
  1. the user's last active project, if it is live and they can access it;
  2. otherwise the oldest live project they can access;
  3. otherwise the oldest live project.

  `request.auth.workspaceId` follows from the resolved project. `GET /me` also returns `workspaceName` and `workspaceRole`. `PUT /me/active-project` switches the active project and refuses one the caller cannot access.
- **API, projects:**
  - `GET /projects` lists the live projects the caller can access in the active workspace, with their role in each. This feeds the switcher.
  - `POST /projects` is Owner only. It creates a project from a name. The slug is derived once from the name and made unique in the workspace.
  - `PATCH /projects/:projectId` renames a project (Admin+).
  - `DELETE /projects/:projectId` is Owner only. It moves the project to the trash, and returns 409 if it is the workspace's last live project.
  - `POST /projects/:projectId/restore` is Owner only.
  - A deleted project grants nobody any role, so all of its project routes return 403 until it is restored.
  - Every change is activity-logged (category `Projects`).
- **API, workspace:**
  - `GET /workspace` returns the active workspace's name and the caller's workspace role.
  - `PATCH /workspace` renames it (Owner only, logged under category `Workspace`).
  - `GET /workspace/projects` (Owner only) lists live projects with test case and execution counts, plus deleted projects with who deleted them, when, and the days left before removal.
- **Web:**
  - A **project switcher** in the sidebar header replaces the static name. It lists the projects the user can access. For Owners it also offers "New project" and "Workspace settings". Switching resets project-scoped data and opens Test Cases.
  - A **Project Settings** screen (`/settings`, nav item for Admins) with a General section: an editable name and the read-only slug.
  - A **Workspace Settings** screen (`/workspace-settings`, Owners only). It has an inline workspace-name edit and a Projects table showing name, test case count and execution count. Each row has a Settings link that switches to that project, and a Delete action with a confirmation. A "New project" button and a "Recently deleted" list with Restore are also on the page.
  - A **New Project** dialog (name only). The new project becomes the active one.

Out of scope:
- Workspace Members, Transfer Ownership and Project Members (Phase 3 remainder).
- Multiple workspaces and the workspace switcher. No flow adds a user to a second workspace before invitations exist.
- Environments and Execution Defaults on Project Settings.
- Environments in the New Project flow. A later slice may have New Project offer to add an environment, as an optional step (PRD §7.5 step 4: "during creation or later via Project Settings"). For now New Project asks only for a name.
- The 30-day purge job (Phase 6).
- Putting the project in the URL.

## Capabilities

### New Capabilities

- `project-management`: a workspace's projects. Covers creating (with slug derivation), listing accessible projects, renaming, moving to and restoring from the trash, the last-project rule, and activity logging.
- `workspace-administration`: the active workspace's name and the caller's workspace role, renaming the workspace, and the Owner's projects overview with counts and recently deleted projects.
- `project-settings-screen`: the Project Settings screen's General section.
- `workspace-settings-screen`: the Workspace Settings screen: workspace name, the projects table, New Project, delete and restore.

### Modified Capabilities

- `identity-provisioning`: `GET /me` returns the user's active project (last active, with fallbacks) plus the workspace name and role, and the active project can be switched.
- `project-authorization`: a project in the trash grants no effective role to anyone.
- `web-app-shell`: the shell header becomes a project switcher, sign-in lands on the last active project, and the navigation gains Project Settings for Admins.

## Impact

- **DB:** `db/migrations/0013_project_management.{up,down}.sql`.
- **API:**
  - `src/common/provision-identity.ts` (active project resolution) and `src/common/project-role.ts` (deleted projects).
  - A new workspace-owner guard and decorator in `src/common/`.
  - `src/projects/` (list, create, rename, delete, restore, slug helper).
  - New `src/workspace/`.
  - `src/me/me.controller.ts` (new fields, `PUT /me/active-project`).
  - `src/common/seed-target.ts` keeps targeting the oldest live project.
  - e2e specs: `projects`, `me`, `project-role`, and a new `workspace` spec.
- **Web:**
  - `lib/use-session.ts` gains workspace role and name.
  - New `lib/projects-api.ts` and `lib/workspace-api.ts`.
  - `components/shell.tsx` (switcher, nav item).
  - New `components/projects/` and `components/workspace/`.
  - New routes `app/(app)/settings` and `app/(app)/workspace-settings`.
- **Docs:** new ADR 0017 (server-persisted active project). Update the open-questions resolved table if it applies, and the roadmap-full.md Phase 4 status.
