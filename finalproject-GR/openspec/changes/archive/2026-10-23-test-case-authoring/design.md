# Design

## Context

See proposal.md for motivation. Builds on `tenant-base-schema` (RLS pattern, `withTenantContext`) and `project-authorization` (`ProjectRoleGuard`, `@RequireProjectRole`, `resolveEffectiveProjectRole`).

## Goals / Non-Goals

**Goals:**
- `test_case` exists, tenant-isolated the standard way, with no new RLS shape.
- Every route reuses `ProjectRoleGuard` unchanged.

**Non-Goals:**
- No delete, no folders, no tags, no health banners — see proposal.md.

## Decisions

### Every route nests under `/projects/:projectId/...` — avoiding a fourth RLS widening

The three changes before this one each hit the same problem once: some lookup needed to happen before any workspace context was known, and each time the fix was a new `FOR SELECT`-only RLS policy keyed on `app.user_id` (`workspace_membership`, `user`, then both `project` and `project_membership`). A flat `GET /test-cases/:id` / `PATCH /test-cases/:id` would hit it a fourth time — `ProjectRoleGuard` needs a `projectId` to check role against, and a bare test case id doesn't carry one; resolving "which project does this test case belong to" would need yet another member-visible policy, this time on `test_case`.

Nesting every route under `/projects/:projectId/test-cases/...` (including the single-item ones: `GET/PATCH /projects/:projectId/test-cases/:testCaseId`) avoids this entirely — `ProjectRoleGuard` already reads `request.params.projectId` directly, unchanged, no new policy needed. This costs nothing: the caller already knows which project a test case belongs to when navigating to it (it's always reached from a project's own test case list), so the nesting is not a real burden, and it's the more conventional REST shape for a resource that only ever exists inside a parent anyway. `test_case` ends up with the same single `tenant_isolation` policy every other content table has — proposal.md's "no new RLS shape needed" claim is true because of this choice, not despite it.

### Table shape

`test_case`: `id uuid PK default gen_random_uuid()`, `project_id uuid not null`, `workspace_id uuid not null` (denormalized, per ADR 0003 — same reasoning as `project_membership`), `name text not null`, `gherkin_script text` (nullable), `status text not null default 'Draft' check (status in ('Draft','Ready','Deprecated'))`, `created_at timestamptz not null default now()`, `deleted_at timestamptz`, `deleted_by uuid references "user"(id)`, `foreign key (project_id, workspace_id) references project(id, workspace_id) on delete cascade` (the same composite-FK pattern `project_membership` uses, so `workspace_id` can't drift from the owning project's real workspace).

Standard tenant policy, identical shape to `project`:
```sql
ALTER TABLE test_case ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON test_case
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);
```

### `source_type` is computed in the response, not stored or generated in the database

Deriving it as a Postgres `GENERATED` column was considered and rejected: it would need its own migration maintenance for no real benefit, since the only consumer is the API response shape. The controller computes it when assembling a test case for a response: `gherkin_script ? 'Gherkin' : 'Manual'`. Every read path goes through the same assembly function, so this can't drift between endpoints.

### No new validation library

Validated inline in the controller (name is a non-empty string; status, when provided, is one of the three allowed values) rather than introducing `class-validator`/`class-transformer` — consistent with proposal.md's "no new dependencies." Revisit if DTO validation needs grow enough across future changes to justify the dependency; this one change doesn't.

### No separate service layer

Consistent with every controller so far (`MeController`, `ProjectsController`): route handlers call `withTenantContext` directly rather than through an intermediate service class. `TestCasesController` follows the same shape.

## Risks / Trade-offs

- **[Risk]** Nesting every route under `/projects/:projectId` means a caller who only has a test case id (not the project id) can't address it directly. → **Mitigation:** accepted — nothing in the PRD's own screens needs that; the Test Cases screen always navigates from a project context already.
- **[Risk]** `source_type` being computed rather than stored means it can't be filtered on directly in a raw SQL `WHERE` clause (callers would filter on `gherkin_script IS NOT NULL` instead). → **Mitigation:** no filtering-by-source-type requirement exists yet in this change's scope; revisit if one appears.

## Migration Plan

Additive: one new migration adding `test_case`, its RLS policy, and `railgun_app`'s grant. Rollback drops the table (and its policy/grant with it).
