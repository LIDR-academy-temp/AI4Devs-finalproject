# ADR 0003: Tenant Isolation

**Status:** Accepted, amended by [ADR 0008](0008-tenant-context-implementation.md) (tenant context implementation mechanism)
**Date:** 2026-09-23
**Amends:** [ADR 0001](0001-tech-stack.md) (Database and ORM layers)

## Context

The Workspace is the tenant boundary ([PRD.md](../../PRD.md) §2.1). Every project, test case, execution, run, bug, environment credential and activity entry belongs to exactly one workspace, and a user may belong to several. A cross-tenant data leak is the highest-impact failure this product can have, and several parts of the planned system reach the database without going through ordinary CRUD code:

- Dashboard and trend queries that ADR 0001 already expects to drop to raw SQL (window functions, date bucketing).
- Background workers producing reports and, later, automated executions.
- Stored secrets (environment credentials, integration tokens) whose exposure would be severe.

Membership and roles live in our database (ADR 0002), so each request can be resolved to a workspace before any query runs. Project roles sit *inside* the workspace boundary and are an authorization concern, not an isolation concern.

## Decision

**Shared schema, isolation enforced in two layers: application scoping and PostgreSQL Row-Level Security (RLS).**

1. **Every tenant-owned table carries `workspace_id`**, including deep child tables (runs, step results, bug images, activity entries). It is denormalised onto children so policies stay a single equality check and never need joins.
2. **Application layer:** all data access goes through one mandatory data-access layer that injects the workspace scope. Raw SQL is allowed only through helpers that run inside the tenant context below.
3. **Database layer (backstop):**
   - The application connects as a role that owns nothing and cannot bypass RLS. Migrations run under a separate privileged role.
   - Tenant tables have RLS enabled and forced, with a policy of the form `workspace_id = current_setting('app.workspace_id')::uuid`.
   - Each request and each background job opens a transaction and sets the workspace with a **transaction-local** setting before any query. Jobs carry `workspace_id` in their payload.
4. **Tables that are about the user rather than a tenant** (users, workspace memberships, invitations) are needed to resolve *which* workspace to set. They are accessed through a small, separate, narrowly scoped path with policies keyed on the current user id.
5. **Project-level roles stay in the application layer.** RLS enforces the workspace boundary only.
6. **Verification:** an automated cross-tenant test runs each endpoint and job as workspace A against data from workspace B and asserts nothing is visible. A migration check fails the build if a table with `workspace_id` lacks a policy.

## Rationale

- **Defence in depth against the realistic failure.** The likely leak is a forgotten filter, a raw dashboard query or a worker that skips the data-access layer. Application scoping alone has nothing behind it in those cases. With RLS, such a bug returns no rows instead of another tenant's rows.
- **Transaction-local settings are compatible with pooled connections**, including the transaction-mode pooling common with managed Postgres, because nothing persists on the connection after the transaction ends.
- **Denormalising `workspace_id`** trades a little storage and a consistency rule (enforced by foreign keys and tests) for simple, fast policies.
- **Workspace-level RLS only** keeps the policy set small. Encoding the workspace-role × project-role matrix in SQL would duplicate the authorization module from ADR 0002 and be hard to test.

## Alternatives Considered

- **Application-layer scoping only.** Simplest, with no database setup and less friction with the ORM. Rejected: no safety net for raw SQL, workers, or a missed filter.
- **Schema per workspace (or database per workspace).** Structural isolation and easy per-tenant backup and restore. Rejected as disproportionate: migrations must run across every schema, connection pooling becomes harder, and the ORM has weak support for it. Revisit only if a customer requires physical isolation.

## Consequences

- Every new tenant table needs `workspace_id`, an RLS policy, and a case in the cross-tenant test suite. This is enforced in CI rather than left to convention.
- Every request pays for a transaction and a setting call. The overhead should be measured early with a representative dashboard query.
- Prisma has no native RLS support, so the tenant context is applied through a client extension or an explicit transaction helper. This must be settled before the first data-access code is written, and it is a reason to re-check ORM choice if the friction is high (ADR 0001 lists Drizzle and Kysely as alternatives).
- Support and administrative tooling needs an explicit, audited privileged path. There is no implicit "see everything" role for the application.
- Background jobs must always set the tenant context from their payload; a job without one must fail rather than run unscoped.

## Open Items

- ~~Exact mechanism for applying the tenant context with the chosen ORM (extension versus explicit transaction helper).~~ Settled in [ADR 0008](0008-tenant-context-implementation.md): an explicit `withTenantContext` transaction helper.
- Design of the user-scoped path for membership and invitation lookups.
- Immutability of the activity log (append-only enforcement) is a related database-level control, deferred to its own decision.
