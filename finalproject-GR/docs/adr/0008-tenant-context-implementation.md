# ADR 0008: Tenant Context Implementation Mechanism

**Status:** Accepted
**Date:** 2026-10-23
**Amends:** [ADR 0003](0003-tenant-isolation.md) (resolves Open Item: exact mechanism for applying the tenant context with Prisma)

## Context

ADR 0003 decided on RLS plus application-layer scoping as the tenant-isolation strategy, but left the exact mechanism open (its own Open Items, and B1 in [open-questions.md](../open-questions.md)): whether to apply the tenant context through a Prisma Client Extension or an explicit transaction helper, flagging this as a reason to re-check the ORM choice if friction turned out to be high.

The mechanism must:

- Set `workspace_id` as a transaction-local Postgres setting (`SET LOCAL` / `set_config(..., true)`) before any query runs, inside the same transaction as the query (ADR 0003 point 3).
- Support a single request or job running several statements in one transaction — e.g. the execution lifecycle's `run-all` (readme §6 Ticket 2), which needs `SELECT ... FOR UPDATE`, several writes, and the activity-log insert to commit or roll back together, with `pg_notify` firing only on commit.
- Apply uniformly in two call contexts with different lifecycles: NestJS API requests (per request, resolved via framework DI) and background jobs in `apps/worker` (per job, no HTTP request, `workspace_id` carried in the job payload per [ADR 0005](0005-realtime-and-background-jobs-v1.md)). The MVP roadmap doesn't build `apps/worker` yet, but the mechanism chosen now must extend to it later without rework.
- Fail closed: a query issued with no tenant context set must return zero rows, never another tenant's rows — ADR 0003's backstop property.

## Decision

**An explicit transaction helper, not a Prisma Client Extension.**

```ts
async function withTenantContext<T>(
  prisma: PrismaClient,
  workspaceId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;
    return fn(tx);
  });
}
```

- **API requests:** a NestJS guard resolves the authenticated user's active workspace (from the bearer token's subject, per [ADR 0009](0009-api-authentication-transport.md), plus a membership lookup) and opens the transaction via `withTenantContext` once per request, exposing the tx-bound client to that request's services through a request-scoped provider. Services inject "the" Prisma client and never see the bare `PrismaClient` singleton directly.
- **Background jobs:** each handler calls `withTenantContext` directly with the `workspace_id` carried in its payload, before touching any tenant table. A job with no `workspace_id` is rejected before the handler runs.
- **Multi-statement operations** (e.g. `run-all`) run entirely inside the one callback passed to `withTenantContext`, so the row lock, the writes, and the `ActivityLogger.log` call share the same transaction and the same `SET LOCAL`, and `pg_notify` fires only if the whole callback resolves.
- **Enforcement:** a lint rule / dependency-boundary check prevents services from importing the raw `PrismaClient` singleton directly; only the request-scoped provider and a job handler's call to `withTenantContext` may hold one. RLS remains the database-level backstop if this is ever bypassed (ADR 0003).

## Rationale

- **Matches ADR 0003's own model.** ADR 0003 already describes "one transaction per request/job, context set before any query" — the explicit helper *is* that model, not an abstraction layered on top of it.
- **Multi-statement atomicity.** The execution lifecycle needs a row lock, several writes and an activity-log insert in one transaction. A per-query extension would, by default, open a new transaction per intercepted call — exactly wrong here. Coordinating one shared transaction across several extended calls would need its own escape hatch, at which point it has reinvented the explicit helper with extra indirection.
- **One mechanism for requests and jobs.** The helper takes a plain `PrismaClient` and a `workspaceId` and has no NestJS dependency, so the same function serves both the per-request guard (built now) and, unchanged, the worker's job handlers (full roadmap Phase 6).
- **Explicitness over magic for a correctness-critical path.** Tenant isolation is the single highest-impact failure mode this product has (ADR 0003's own framing). A call that's easy to grep for and unit-test in isolation is preferable to behavior that depends on Prisma extension internals.

## Alternatives Considered

- **Prisma Client Extension (`$extends`), intercepting every query to inject the `SET LOCAL`.** Lowest per-call-site friction. Rejected: fights the multi-statement-transaction requirement, and needs a second, parallel mechanism for background jobs since they don't originate from an intercepted query the same way. Revisit only if the explicit helper proves to have call-site discipline problems in practice that code review and the lint rule don't catch.
- **Raw `PrismaClient` with a manual `SET LOCAL` at each call site, no shared helper.** Rejected: duplicates the same lines everywhere, and a forgotten call fails silently into RLS's zero-rows backstop rather than erroring loudly in development.
- **A different ORM (Drizzle, Kysely) with first-class scoped-session support.** ADR 0003 flagged this as worth revisiting if Prisma friction were high. Not pursued: the explicit helper has no meaningful friction, so there's no basis to reopen ADR 0001's ORM choice.

## Consequences

- Every service method that touches a tenant table receives a `Prisma.TransactionClient`, not a `PrismaClient`, as its injected dependency — this is now the project's standard service signature.
- The cross-tenant test harness can unit-test `withTenantContext` directly (fake workspace ids, assert `SET LOCAL` is issued and scoped to the transaction) in addition to integration-level cross-tenant tests against real Postgres.
- Adding `apps/worker` later requires no change to this helper, only a new call site.

## Revisit Triggers

- The lint rule / dependency-boundary check proves unable to catch a raw-`PrismaClient` usage in review.
- Per-request transaction overhead is measured and found material — ADR 0003 already flagged this as worth measuring early.
