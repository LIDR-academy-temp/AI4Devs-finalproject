# Proposal

## Why

Nothing in the product exists yet for a project to actually contain — `project` and `project_membership` are structural, not content. PRD §2.5 makes the test case the fundamental unit of the platform. This change builds the first real content entity, continuing roadmap-mvp.md Phase 4 (flat layout: no folders, no tags, both explicitly cut for the MVP). Every later phase (environments, executions, bugs) assumes test cases already exist to reference.

## What Changes

- A `test_case` table scoped to a project: `id`, `project_id`, `workspace_id` (denormalized, per ADR 0003), `name`, `gherkin_script` (nullable), `status` (`Draft` | `Ready` | `Deprecated`, defaulting to `Draft`), `created_at`, `deleted_at`, `deleted_by`. Soft-delete columns are included now even though the Trash screen is a later phase — adding them after rows exist is exactly the retrofit roadmap-mvp.md's own rule avoids.
- `source_type` (Gherkin vs. Manual, PRD §2.5) is **not a stored column** — it's derived from whether `gherkin_script` is set, so it can never drift from the actual content.
- Standard tenant-scoped RLS on `test_case` (`workspace_id`-keyed, identical pattern to `project`) — no new RLS shape needed, unlike the last three changes.
- Endpoints, all nested under the project and gated by the `ProjectRoleGuard`/`@RequireProjectRole` mechanism from `project-authorization` (which reads `:projectId` directly from the route — see design.md for why every route keeps that param, rather than a flat `/test-cases/:id`):
  - `POST /projects/:projectId/test-cases` and `PATCH /projects/:projectId/test-cases/:testCaseId` — at least `Contributor`.
  - `GET /projects/:projectId/test-cases` (list) and `GET /projects/:projectId/test-cases/:testCaseId` (detail) — at least `Viewer`.
  - `PATCH` covers `name`, `gherkin_script`, and `status` together — no separate endpoint per field.
- Resolves open-questions.md **G2** ("How does a test case change status, and who may?"): status is explicitly settable by whoever can edit the test case (`Contributor`+); no separate workflow gates it, since no run-history or execution concept exists yet to justify one.

**Not included** (explicitly out of scope for this change):
- Delete — Admin-only per PRD §6.2.5, plus the "cannot delete while part of an active execution" rule and real trash/soft-delete semantics beyond the bare columns. A separate slice: its authorization tier and business rules differ materially from create/read/update.
- Folders, tags — cut for the MVP (roadmap-mvp.md Phase 4).
- Health banners (Orphan, Never Run, Dormant, Degrading, Improving, Trend Reset) — all depend on run history, which doesn't exist until executions do.
- Drag-and-drop reordering.
- "Generate from Sources" — already disabled product-wide (PRD §9).

## Capabilities

### New Capabilities
- `test-case-authoring`: a project member can create, list, view, and update test cases within a project they have at least Viewer (read) or Contributor (write) access to; a test case's source type is always consistent with its script content, and its status is explicitly settable.

### Modified Capabilities
_None._ `tenant-isolation`, `activity-log`, `identity-provisioning`, and `project-authorization` are unaffected.

## Impact

- **Affected code:** new migration (`test_case` table, RLS policy), the four new endpoints, and their DTOs/validation.
- **Dependencies:** none new — reuses `withTenantContext`, `ProjectRoleGuard`, and the existing migration/role conventions.
- **Systems:** the first entity later phases (environments, executions, bugs) will reference; its `id` becomes a foreign point of reference for all of them.
