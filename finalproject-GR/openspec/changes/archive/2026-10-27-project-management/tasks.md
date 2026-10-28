# Tasks

## 1. Docs

- [x] 1.1 Write `docs/adr/0017-active-project.md` (server-persisted last active project on `user`, following design.md decision 1). It needs alternatives (per-workspace column, cookie, URL segment) and a revisit trigger (a user in several workspaces). Add a pointer to it in ADR 0001's header, plus a row in open-questions.md's resolved table if it settles an open item. Verify it follows ADR 0016's format.
- [x] 1.2 In roadmap-full.md, set Phase 4's "Later slices: Projects" to 🚧, pointing at the OpenSpec change `project-management` and listing what is deferred (Workspace Members, Transfer Ownership, multi-workspace, and New Project offering to add an environment as an optional step). Verify it reads like the Slice 1/2 entries.

## 2. Database

- [x] 2.1 Write `db/migrations/0013_project_management.up.sql` and `.down.sql`, which add and drop `user.last_project_id uuid REFERENCES project(id) ON DELETE SET NULL`. Verify that:
  - `npm run db:migrate` applies it on top of 0001–0012
  - up → down → up round-trips
  - `npm run db:check-rls` still passes

## 3. API: access foundations

- [x] 3.1 In `src/common/project-role.ts`, make a project in the trash resolve to no role (design.md decision 4). Verify with additions to `test/project-role.e2e-spec.ts`:
  - an Owner gets 403 on a deleted project's test cases
  - after the restore, a Collaborator's `Contributor` access returns
- [x] 3.2 In `src/common/provision-identity.ts`, add active-project resolution (design.md decision 2): last active, then oldest accessible live project, then oldest live project. `workspaceId` comes from the resolved project. Verify with `test/provision-identity.e2e-spec.ts`:
  - with no `last_project_id`, the oldest project is used, as before
  - a set `last_project_id` wins
  - a `last_project_id` pointing at a project in the trash falls back
  - a Collaborator with a membership only on the second project resolves to it
  - a first-contact sign-up is unchanged
- [x] 3.3 Make `src/common/seed-target.ts` skip projects in the trash. Verify `test/demo-seed.e2e-spec.ts` still passes.
- [x] 3.4 Add `src/common/workspace-owner.guard.ts` and the `@RequireWorkspaceOwner()` decorator (design.md decision 3). The guard takes the target workspace from `:projectId` (projects in the trash included) or from `auth.workspaceId`. Verify with `workspace-owner.guard.spec.ts`:
  - an Owner passes
  - a Collaborator gets 403
  - a project in the trash still resolves its workspace

## 4. API: me

- [x] 4.1 Make `GET /me` return `workspaceName` and `workspaceRole`, and add `PUT /me/active-project` (design.md decisions 2 and 7). Verify with `test/me.e2e-spec.ts`:
  - the profile includes the workspace name and role
  - switching to an accessible project changes `/me`'s `projectId`
  - switching to a project with no membership, a project in the trash, or an unknown project returns 403 and leaves the active project unchanged

## 5. API: projects

- [x] 5.1 Write `src/projects/project-rules.ts` with `deriveSlug` and the shared `parseName` (trim, 1–100). Verify with `project-rules.spec.ts`:
  - "Mobile App (iOS)" → `mobile-app-ios`
  - "Café" → `cafe`
  - "***" → `project`
  - long names truncate to 60 with no trailing hyphen
  - blank names and 101-character names are rejected
- [x] 5.2 Add `GET /projects`, `POST /projects`, `PATCH /projects/:projectId`, `DELETE /projects/:projectId` and `POST /projects/:projectId/restore` in `src/projects/projects.controller.ts`. Follow design.md decisions 5–7: slug suffixes, the locked last-project check, and the activity entries. Verify with `test/projects.e2e-spec.ts`:
  - `GET /projects`: an Owner sees all live projects as `Admin`, sorted by name; a Collaborator sees only their memberships; projects in the trash are excluded
  - `POST`: an Owner creates "Mobile App" (`mobile-app`), and a second one gets `mobile-app-2`. This also holds when the first `mobile-app` is in the trash
  - `POST`: a Collaborator gets 403; a blank name gets 400
  - `PATCH`: an Admin renames and `project.renamed {from,to}` is logged; the slug is unchanged; a Contributor gets 403
  - `DELETE`: an Owner deletes one of two projects and gets 204 and `project.deleted`. Deleting the only live project returns 409. A Collaborator with an Admin membership gets 403
  - Restore: an Owner restores, gets `project.restored`, and the test cases are reachable again. Restoring a live project returns 409
  - another workspace's project returns 403 or 404 on every route

## 6. API: workspace

- [x] 6.1 Add `src/workspace/workspace.controller.ts` (`GET /workspace`, `PATCH /workspace`, `GET /workspace/projects`) and register it in `app.module.ts` (design.md decision 7). Verify with `test/workspace.e2e-spec.ts`:
  - a Collaborator reads the name and the role `Collaborator`
  - an Owner renames and `workspace.renamed {from,to}` is logged; a Collaborator gets 403; a blank name gets 400
  - the overview counts only live test cases and executions
  - a project deleted two days ago (backdated `deleted_at`) shows its deleter and `daysLeft: 28`
  - a Collaborator gets 403 on the overview

## 7. Web: session, API clients, switcher

- [x] 7.1 Add `lib/projects-api.ts` and `lib/workspace-api.ts` (typed helpers for section 5 and 6 routes plus `switchActiveProject`). Extend `lib/use-session.ts` with `workspaceName`, `workspaceRole` and `projectSlug`. Verify `use-session.test.ts` covers the new fields.
- [x] 7.2 Add `lib/use-switch-project.ts` (PUT, `resetQueries`, push `/test-cases`) and `components/projects/project-switcher.tsx` in the shell header. It shows the list with the active project checked, and New project and Workspace settings for Owners only. Verify with `project-switcher.test.tsx`:
  - choosing another project calls the switch and navigates
  - a Collaborator sees no Owner entries
  - an Owner sees both
- [x] 7.3 Add `components/projects/new-project-dialog.tsx`, built on `FormDialog`, with inline name errors. It creates the project, then switches to it. Verify with `new-project-dialog.test.tsx`:
  - a blank name shows an error and sends no request
  - on success the create call is followed by the switch call
- [x] 7.4 In `components/shell.tsx`, add the Project Settings nav item (Admins only, with its own icon) and render the switcher in place of the static name. Verify `shell.test.tsx`:
  - an Admin sees Project Settings
  - a Viewer and a Contributor do not
  - the switcher shows the project name

## 8. Web: settings screens

- [x] 8.1 Add `app/(app)/settings/page.tsx` and `components/projects/project-settings-screen.tsx`, with a General section: a name field that saves on confirm with inline errors, and the read-only slug. Non-Admins get `AccessDenied`. Verify with `project-settings-screen.test.tsx`:
  - an Admin renames and `['projects']` and `['me']` are refreshed
  - a server 400 shows inline
  - a Contributor sees access denied
- [x] 8.2 Add `app/(app)/workspace-settings/page.tsx` and `components/workspace/workspace-settings-screen.tsx`:
  - the inline workspace name
  - a projects table with counts, a Settings action (switch, then `/settings`) and a Delete action with confirmation, disabled with an explanation on the last live project
  - New project
  - a Recently deleted list with the deleter, date, days left and Restore
  - non-Owners get `AccessDenied`

  Verify with `workspace-settings-screen.test.tsx`:
  - the rename saves
  - the table shows the counts
  - Delete asks for confirmation, then removes the row and lists it under Recently deleted
  - the only project's Delete is disabled
  - Restore moves the project back
  - a Collaborator sees access denied

## 9. Integration checks

- [x] 9.1 Run `npm run lint`, `npm run typecheck`, `npm test -w apps/api` and `npm run test -w apps/web` from `finalproject-GR/`. All must pass.
- [x] 9.2 Manual run (`npm run dev`), signed in as an Owner. Verify:
  - create "Mobile App" from the switcher; it becomes active and its Test Cases list is empty
  - switch back; the original data shows
  - rename in Project Settings; the switcher updates
  - sign out and in; you land on the last active project
  - in Workspace Settings, rename the workspace, delete "Mobile App" (it shows under Recently deleted and leaves the switcher), then restore it
  - deleting the last remaining project is unavailable

## Workflow follow-up

- Archive the change after the user has tested it hands-on. Don't commit until the user asks.
