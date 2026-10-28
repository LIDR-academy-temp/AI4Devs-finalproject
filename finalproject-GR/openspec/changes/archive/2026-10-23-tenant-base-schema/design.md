# Design

## Context

See proposal.md for motivation. This is the first migration in the project — no tables, roles, or policies exist yet. Constraints: ADR 0002 (identity stays in Clerk; workspace/membership/role data lives entirely in our Postgres), ADR 0003 (shared schema, `workspace_id` on every tenant table, RLS as the backstop, a narrow user-keyed path for tables that must be queryable *before* a workspace is known), ADR 0008 (the `withTenantContext` transaction helper is the only sanctioned way to query a tenant table).

## Goals / Non-Goals

**Goals:**
- The five base tables exist with the relations and constraints PRD §2.1/§2.2/§3.1-§3.2 imply, and are provably tenant-isolated from their first row.
- `withTenantContext` is implemented and is the only path the API uses to touch these tables.
- RLS coverage and cross-tenant isolation are both verified by automated checks, not left as a promise.

**Non-Goals:**
- No Clerk integration, no sign-up/sign-in endpoint, no authorization policy module (workspace-role × project-role) — roadmap-mvp.md Phase 3.
- No invitation flow — membership rows are seeded directly (by a later change's seed script) until Phase 3 builds real invitations.
- `withUserContext`, the application-code counterpart to the user-keyed RLS policies below, is **not implemented in this change** — see Decisions.

## Decisions

### Table shapes

- **`workspace`**: `id uuid PK`, `name text not null`, `created_at timestamptz not null default now()`. No `owner_user_id` column — ownership is derived from `workspace_membership.role = 'Owner'` (exactly one per workspace, maintained as an application-level invariant during the sign-up and ownership-transfer transactions in Phase 3, the same way the execution lifecycle is an application-level state machine rather than a DB constraint).
- **`user`**: `id uuid PK`, `clerk_user_id text not null unique`, `display_name text not null`, `email text not null`, `created_at timestamptz not null default now()`. Holds the Clerk link and nothing about auth itself (ADR 0002).
- **`workspace_membership`**: `id uuid PK`, `workspace_id uuid not null references workspace(id) on delete cascade`, `user_id uuid not null references "user"(id) on delete cascade`, `role text not null check (role in ('Owner','Collaborator'))`, `created_at timestamptz not null default now()`, `unique (workspace_id, user_id)`.
- **`project`**: `id uuid PK`, `workspace_id uuid not null references workspace(id) on delete cascade`, `name text not null`, `slug text not null` (set once, read-only after creation per PRD §6.7), `deleted_at timestamptz`, `deleted_by uuid references "user"(id)`, `created_at timestamptz not null default now()`, `unique (workspace_id, slug)`, `unique (id, workspace_id)` (supports the composite FK below). `deleted_at`/`deleted_by` are included now even though the Trash UI and purge job (ADR 0007) are a later change — adding them after rows exist is exactly the retrofit this project avoids (per roadmap-mvp.md's "what stays non-negotiable" rule).
- **`project_membership`**: `id uuid PK`, `project_id uuid not null`, `workspace_id uuid not null` (denormalized per ADR 0003 point 1, so its RLS policy is a single equality check), `user_id uuid not null references "user"(id) on delete cascade`, `role text not null check (role in ('Admin','Contributor','Viewer'))`, `created_at timestamptz not null default now()`, `unique (project_id, user_id)`, `foreign key (project_id, workspace_id) references project(id, workspace_id) on delete cascade` — this composite FK makes it impossible for a membership row's `workspace_id` to drift from its project's real workspace. An Owner's implicit Project Admin right (ADR 0002) is **not** materialized as a row here — it's an authorization-time rule the Phase 3 policy module applies, not stored data, so it can't go stale.

### RLS policies

Standard tenant policy, applied to `workspace` (keyed on its own `id`), `project`, and `project_membership` (both keyed on `workspace_id`):
```sql
ALTER TABLE project ENABLE ROW LEVEL SECURITY;
ALTER TABLE project FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON project
  USING      (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid)
  WITH CHECK (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);
```

`user` and `workspace_membership` are the ADR 0003 point 4 "narrow, user-scoped path" tables — they must be queryable before any workspace is selected (e.g. populating the workspace switcher). Each gets a self-access policy keyed on a separate setting, `app.user_id`:
```sql
CREATE POLICY self_access ON "user"
  USING (id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY self_membership ON workspace_membership
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
```

**Refinement beyond ADR 0003's literal wording:** a self-only policy on `workspace_membership` can't serve "who else is in my workspace" (Workspace/Project Members screens, Phase 4+) — under RLS, an Admin querying `workspace_membership WHERE workspace_id = X` would see only their own row. Postgres combines multiple permissive policies on the same table with `OR`, so `workspace_membership` gets a **second**, standard tenant-scoped policy alongside the self-access one:
```sql
CREATE POLICY workspace_scoped ON workspace_membership
  USING (workspace_id = nullif(current_setting('app.workspace_id', true), '')::uuid);
```
A row is visible if *either* the viewer is that row's own user *or* the active workspace context matches — covering both "which workspaces am I in" (pre-workspace-selection) and "who's in my active workspace" (post-selection). This resolves open-questions.md A5. RLS makes the rows visible to Postgres; the Phase 3 policy module still decides who may actually call a membership-listing endpoint (ADR 0002 — authorization is application logic, not a DB concern).

**`withUserContext` is schema-only in this change.** The policies above exist now because they're pure DDL with no application-code dependency, and adding them later would be a migration against live rows. The TypeScript helper that actually sets `app.user_id` (`withUserContext`, parallel to `withTenantContext`) has no caller yet — sign-up and the workspace switcher don't exist until Phase 3 — so it is **not built in this change**. Until then, nothing sets `app.user_id`, so only the workspace-scoped policy branch is ever exercised; the self-access branch is inert but correctly in place.

**Bootstrapping the first `user` row:** its own policy requires `id = app.user_id`, but the row doesn't exist yet at insert time. Phase 3's sign-up code generates the UUID client-side, sets `app.user_id` to that value, then inserts — `WITH CHECK` passes because the two now match. This is called out here so it isn't rediscovered as a blocker in Phase 3.

### Database roles

- A migration role owns all five tables and runs the migration.
- `railgun_app` (the application runtime role): not an owner, no `BYPASSRLS`, granted `SELECT, INSERT, UPDATE, DELETE` on all five tables only.

### `withTenantContext`

Implemented exactly as ADR 0008 decided — no new decision here. This change is its first real caller.

### RLS-coverage CI check

A script queries `pg_class` joined to `pg_policies` (via `information_schema.columns` to find tables with a `workspace_id` column), and exits non-zero if any such table lacks `relrowsecurity` + `relforcerowsecurity` and at least one policy. `user` has no `workspace_id` column, so it's correctly outside this check's scope — its self-access policy is a deliberate extra, not CI-mandated.

### Cross-tenant test harness

A reusable test helper creates two workspaces (A, B), inserts a `project` row under each via `withTenantContext`, then asserts: workspace A's context sees only A's project; a query with no context set sees zero rows; an insert attempting `workspace_id = B` while the context is set to A fails. The same helper is reused by every future change's cross-tenant tests, per ADR 0003's own verification requirement.

## Risks / Trade-offs

- **[Risk]** The CI check only verifies a policy *exists*, not that it's correct — a buggy policy (e.g. an accidental `OR true`) would still pass. → **Mitigation:** the cross-tenant test harness is the behavioral backstop; this is the same residual risk ADR 0003 already accepts, not a new one.
- **[Risk]** Fail-closed policies return empty results rather than an error when context is missing, which can mask a forgotten `withTenantContext` call as "no data" instead of a loud failure. → **Mitigation:** this is ADR 0003's deliberate choice (fail closed over fail loud, for security); mitigated by code review and the lint rule from ADR 0008 that blocks raw `PrismaClient` access outside the helper.
- **[Risk]** The client-generated-UUID pattern for the first `user` row is easy to get wrong in Phase 3 if someone instead lets Postgres default-generate the id. → **Mitigation:** documented here explicitly so it isn't rediscovered as a blocker; Phase 3's design should link back to this section.

## Migration Plan

Greenfield — no existing rows. Rollback is the migration's own `down` script; nothing is deployed yet.
