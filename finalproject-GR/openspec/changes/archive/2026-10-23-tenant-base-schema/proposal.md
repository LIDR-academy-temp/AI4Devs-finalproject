# Proposal

## Why

Every feature from this point forward — test cases, executions, bugs, environments, the activity log — lives inside a workspace and must never leak across workspace boundaries (ADR 0003). That guarantee has to exist before any feature table does: retrofitting RLS and a tenant-context mechanism after feature tables and queries already exist means auditing every query ever written for a missing filter. This change builds the base schema (workspace, user, project, membership) with tenant isolation enforced and proven from the first migration, per ADR 0003 and ADR 0008, continuing roadmap-mvp.md Phase 2.

## What Changes

- Base migration creating `workspace`, `user`, `project`, `workspace_membership`, and `project_membership` tables, covering the entities and roles in PRD.md §2.1 (Workspace), §2.2 (Project), and §3.1-§3.2 (workspace roles Owner/Collaborator; project roles Admin/Contributor/Viewer).
- `user` holds a unique Clerk user id as its only identity-provider link (ADR 0002) — no password, session, or verification data lives in our database.
- Every tenant table carries `workspace_id` (ADR 0003). Postgres Row-Level Security is enabled and **forced** on each, with a fail-closed policy (`workspace_id = current_setting('app.workspace_id')`) — no tenant context means zero rows, never another tenant's rows.
- The application database role (no `BYPASSRLS`, not the tables' owner) is created and granted only the privileges it needs; migrations run under a separate, privileged role (ADR 0003, ADR 0007's same role-split pattern).
- The `withTenantContext(prisma, workspaceId, fn)` transaction helper (ADR 0008): opens one transaction, runs `set_config('app.workspace_id', ...)`, and runs the caller's queries inside that same transaction — the mechanism every later change's data access goes through.
- A CI check that fails the build if any table carrying `workspace_id` lacks a forced RLS policy (ADR 0003's own verification requirement, not follow-up work).
- A cross-tenant automated test: run as workspace A against workspace B's data, assert nothing is visible.

**Not included** (explicitly out of scope for this change):
- Clerk integration itself and the authorization policy module evaluating workspace-role × project-role (roadmap-mvp.md Phase 3 — next after this one).
- The activity log and `ActivityLogger` (ADR 0007) — a separate proposal in this same phase, not bundled here.
- Invitations, and every feature table (test cases, executions, bugs, environments) — later phases.

## Capabilities

### New Capabilities
- `tenant-isolation`: the durable, system-wide guarantee that data scoped to one workspace is never visible under another workspace's context, regardless of entry point — enforced by Postgres RLS and provable by the cross-tenant test. This is the one genuinely new, observable, testable system behavior this change introduces; the base tables and the `withTenantContext` helper are the mechanism that makes it true, not separate capabilities of their own.

### Modified Capabilities
_None — `tenant-isolation` is new; `api-health-check` is unaffected._

## Impact

- **Affected code:** new base migration (`workspace`, `user`, `project`, `workspace_membership`, `project_membership`), the two Postgres roles (migration role, application role), RLS policies on every tenant table, the `withTenantContext` helper in the API's data-access layer, a CI script verifying RLS coverage, and a cross-tenant integration test suite.
- **Dependencies:** none new beyond what ADR 0001 already committed to (PostgreSQL, Prisma). No Clerk, no queue, no storage wiring yet.
- **Systems:** this is the foundation every later data-access change in the API and (later) worker builds on; nothing downstream can safely query a tenant table without going through this mechanism.
