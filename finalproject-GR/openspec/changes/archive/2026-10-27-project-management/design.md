# Design

## Context

See proposal.md, Why. The parts of the current code this design builds on:

- `provisionIdentity` runs on every authenticated request. It sets `request.auth.{userId, workspaceId, projectId}`. The user's workspace is their oldest membership, and the project is that workspace's oldest project, deleted or not. `GET /me` returns these, and the web app's `useSession` turns `/me` plus `GET /projects/:id` into `{ workspaceId, projectId, projectName, role }`.
- `resolveEffectiveProjectRole` reads the project under `app.user_id` only, using the `member_visible` policy from migration 0004. It does not look at `deleted_at`. `project.deleted_at`/`deleted_by` and `UNIQUE (workspace_id, slug)` have existed since migration 0001.
- There is no workspace-role check in the API apart from the Owner→Admin step inside `resolveEffectiveProjectRole`.
- `user` has a `self_access` RLS policy, so a user can read and update their own row under `withUserContext`.
- The web app keeps no project id in URLs. Every API helper takes `projectId` from the session, and query keys include it.

## Goals / Non-Goals

**Goals:**
- One place decides the active project (the server). It is the same for every tab and device.
- Deleting a project is safe at the access level: a project in the trash is unreachable through every existing project-scoped route, with no per-controller changes.
- The decision about active-project storage is recorded as ADR 0017.

**Non-Goals:**
- Reworking any route to carry the project (no `/p/[slug]/…`).
- Moving Manage tags into Project Settings. ADR 0016 plans this for Phase 11. This change only creates the screen it will move to.
- Hiding a deleted project's rows in the activity log or anywhere else. They are unreachable, because every route needs a role on the project.
- Multi-workspace selection. The active workspace is always the active project's workspace.

## Decisions

### 1. Store the last active project on `user` (ADR 0017)
Migration `0013_project_management` adds `user.last_project_id uuid REFERENCES project(id) ON DELETE SET NULL`. `user` is not tenant-scoped, so a plain FK is enough. The workspace comes from the project, so this one column also gives PRD §5's "last active workspace" once multiple workspaces exist.
- *Alternative: `workspace_membership.last_project_id` (one per workspace) plus `user.last_workspace_id`.* This is more correct once a user belongs to several workspaces, but it adds two columns now for a journey that doesn't exist yet. Revisit trigger in ADR 0017.
- *Alternative: a cookie or URL segment.* Rejected with the user. A cookie is per device, and a URL segment means reworking every route.

### 2. Resolve the active project inside `provisionIdentity`
The existing-user branch replaces its two lookups with one query under `app.user_id`. It picks the live projects (`deleted_at IS NULL`) in the user's workspaces that the user can access, meaning they are the workspace's Owner or have a `project_membership` row. These are ordered so that `id = last_project_id` comes first, then by workspace membership `created_at`, then by project `created_at`. It takes the first row. If none matches, it falls back to the oldest live project in the oldest-membership workspace, which the shell shows as access denied, as it does today. `request.auth.workspaceId` becomes that project's `workspace_id`. The query only needs the `member_visible` and `self_project_membership` policies from migration 0004. A stale `last_project_id`, for example a project now in the trash, is ignored rather than cleared. Reads stay read-only.
- *Why here, not in `GET /me`:* every request already resolves a workspace through this function. Keeping one resolver means `/me`, the new workspace routes and `request.auth.workspaceId` always agree.

`PUT /me/active-project { projectId }` calls `resolveEffectiveProjectRole`, which after decision 4 is null for a project in the trash. If it returns null, the request fails with 403. Otherwise the endpoint updates `user.last_project_id` under `withUserContext`. It is not activity-logged, because it is a preference, not a change to content.

`GET /me` adds `workspaceName` (read under `withTenantContext`) and `workspaceRole` (the user's `workspace_membership.role` for that workspace).

### 3. A workspace-owner guard
`WorkspaceOwnerGuard` with `@RequireWorkspaceOwner()` works out the target workspace. On routes with `:projectId`, that is the project's `workspace_id`, read under user context, so projects in the trash are included and restore works. On other routes it is `request.auth.workspaceId`. The guard then requires an `Owner` `workspace_membership` row and returns 403 otherwise. It is used on `POST /projects`, `DELETE /projects/:id`, `POST /projects/:id/restore`, `PATCH /workspace` and `GET /workspace/projects`. `PATCH /projects/:id` uses the existing `ProjectRoleGuard` with `Admin`.
- *Alternative: extend `ProjectRoleGuard` with a pseudo-role "Owner".* Rejected: Owner is a workspace role, and folding it into the project rank would blur ADR 0002's two-level model.

### 4. A project in the trash grants no role
`resolveEffectiveProjectRole` adds `AND deleted_at IS NULL` to its project lookup. Every existing project-scoped route then returns 403 for a project in the trash, through the guard that already protects it. Restore does not go through this function (decision 3), so an Owner can still bring the project back.

### 5. Slug derivation
A pure `deriveSlug(name)` does the following:
1. NFKD-normalises the name and strips combining marks, so "Café" becomes `cafe`.
2. Lowercases it.
3. Replaces each run of `[^a-z0-9]` with `-` and trims hyphens.
4. Truncates to 60 characters.
5. Uses `project` if the result is empty.

Names in non-Latin scripts therefore become `project`, `project-2`, and so on. The slug is only shown read-only, so this is acceptable. Creation picks the lowest free suffix among the workspace's existing slugs (`slug = base OR slug ~ '^base-[0-9]+$'`), counting projects in the trash, since the unique constraint does. A concurrent insert that hits `UNIQUE (workspace_id, slug)` retries once with a fresh read, then returns 409.

### 6. Last-project rule under concurrency
`DELETE /projects/:id` runs in one `withTenantContext` transaction:
1. It locks the workspace's live projects (`SELECT id FROM project WHERE workspace_id = … AND deleted_at IS NULL FOR UPDATE`).
2. It returns 409 if the target is the only one, and 404 if the target is not among them (already deleted).
3. It sets `deleted_at`/`deleted_by` and logs the deletion.

Two concurrent deletes of the last two projects are serialised by the row locks, so the second sees one live project and is refused.

### 7. Endpoints and payloads
| Route | Guard | Notes |
|---|---|---|
| `GET /projects` | auth only | live projects in `auth.workspaceId` with the caller's role (Owner: all, as `Admin`; else from `project_membership`), ordered by name |
| `POST /projects` | Owner | `{ name }` → `{ id, name, slug, role: 'Admin' }`, 201 |
| `PATCH /projects/:projectId` | Admin | `{ name }` → project |
| `DELETE /projects/:projectId` | Owner | 204; 409 last live project |
| `POST /projects/:projectId/restore` | Owner | 409 if not in trash; returns project |
| `GET /workspace` | auth only | `{ id, name, role }` |
| `PATCH /workspace` | Owner | `{ name }` |
| `GET /workspace/projects` | Owner | `{ projects: [{ id, name, slug, testCaseCount, executionCount }], deleted: [{ id, name, deletedAt, deletedBy: { id, displayName }, daysLeft }] }` |
| `PUT /me/active-project` | auth only | `{ projectId }` → 204 |

Counts are scalar subqueries over live `test_case` and `test_execution` rows (the same pattern as tag counts). `daysLeft = max(0, 30 − whole days since deleted_at)`. Until the Phase 6 purge job exists, projects past 30 days stay listed with 0 days. Name validation (trim, 1–100) is shared between project and workspace.

Activity entries use `entityType: 'project'` and the action codes `project.created`, `project.renamed` (`details: { from, to }`), `project.deleted` and `project.restored`. They use category `Projects` and `projectId` set to the project. The workspace rename uses `workspace.renamed` with category `Workspace`, `projectId` null and `entityType: 'workspace'`.

### 8. Web: session, switching and cache
- `useSession` adds `workspaceName`, `workspaceRole` and `projectSlug`. A new `useProjects()` query (`['projects']`) feeds the switcher.
- **Switching** (`useSwitchProject`): `PUT /me/active-project`, then `queryClient.resetQueries()` to drop and refetch everything, including `['me']`, then `router.push('/test-cases')`. Project-scoped keys already include `projectId`, so the reset only stops stale state such as an open detail from lingering. Create, delete and restore then refresh `['projects']`, `['workspace-projects']` and, when the active project changed, `['me']`.
- **New project** (switcher and Workspace Settings) runs `POST /projects` and then the switch. If the switch fails, the project still exists and the error toast says so. It reuses `FormDialog` from the form-modals change.
- **Deleting the active project:** after a 204 the client resets `['me']`. The server has already fallen back to another project (decision 2).
- **Switcher UI:** a `DropdownMenu` in `SidebarHeader`, the shadcn "team switcher" pattern. It shows the project list with a check on the active project, then for Owners a separator, New project and Workspace settings. It collapses to the icon in rail mode.
- **Gated pages:** `/settings` needs `role === 'Admin'` and `/workspace-settings` needs `workspaceRole === 'Owner'`. Otherwise they render the existing `AccessDenied` component. The server enforces the same rules.
- The projects table is plain semantic table markup with Tailwind classes. No shadcn `table` is added, because it would be the only user.

## Risks / Trade-offs

- [Every request now runs a slightly heavier resolution query] → It is still one indexed query instead of two. The project and membership tables are tiny per user. Measure only if it shows up.
- [A user switches projects in one tab while another tab is open] → The other tab keeps showing its cached project until it refetches `/me` (on window focus, which TanStack Query does by default). Its writes still go to the project id it holds and are authorised against that project, so nothing lands in the wrong project silently.
- [An Owner deletes a project that a Collaborator is working in] → The Collaborator's next project request gets 403 and the shell shows access denied. A reload resolves them to another project. This is acceptable without live updates, which come in Phase 6.
- [Projects in the trash past 30 days are never purged] → This is known and tracked under Phase 6. The overview shows them with 0 days left.
- [`deriveSlug` gives `project`, `project-2`, … for non-Latin names] → Slugs are informational only for now, and the name carries the meaning.

## Migration Plan

`0013_project_management.up.sql` adds the nullable column, so no backfill is needed: a null falls through to the existing oldest-project behaviour. `down.sql` drops the column. No RLS change is needed, since `user` already has `self_access`. `db:check-rls` is unaffected.
