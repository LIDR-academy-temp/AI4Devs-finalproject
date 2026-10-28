# ADR 0018: Queue Library

**Status:** Accepted
**Date:** 2026-10-27
**Amends:** [ADR 0005](0005-realtime-and-background-jobs-v1.md) (its open item on the queue library; reverses its pg-boss default)
**Resolves:** open question B2

## Context

[ADR 0005](0005-realtime-and-background-jobs-v1.md) chose a Postgres-backed job queue with **transactional enqueue**: a job is written in the same database transaction as the change that triggers it. It named pg-boss as the default and Graphile Worker as the alternative. It left the final choice open until the library had been checked against the ORM and the connection pooler.

What the codebase looks like now:
- **Prisma is pinned to 6.19.3.** Prisma 7 removes the datasource `url` and requires a driver adapter (CLAUDE.md), which needs its own evaluation.
- **Every write is raw SQL** (`tx.$executeRaw` / `$queryRaw`) inside `withTenantContext` or `withUserContext` transactions (ADR 0008).
- **`railgun_app` owns nothing** and is granted only the DML it needs. Schema changes run as `railgun_migrator`.

What the current documentation says (checked 2026-10-27):
- **pg-boss** (v12.38) can create jobs inside an existing transaction through a `db` object that implements `executeSql(text, values) → { rows }`. Its ready-made Prisma adapter "requires Prisma v7+ with `@prisma/adapter-pg`". On Prisma 6 we would have to write and maintain our own shim.
- **Graphile Worker** enqueues with a SQL function, `graphile_worker.add_job(identifier, payload, …)`. Inside our transactions it is one more statement, with no adapter. The function "requires database owner privileges". The documented way to let a lower-privileged role enqueue is a `SECURITY DEFINER` wrapper that does its own checks.

## Decision

1. **Graphile Worker** is the queue and scheduler for background jobs (emails, Trash purge, Health Score snapshots, report generation). Its crontab feature covers the scheduled ones. It runs in `apps/worker`, a separate process from the same codebase (ADR 0005).
2. **Enqueue goes through one migrator-owned `SECURITY DEFINER` function.** The function checks the task name against an allow-list and then calls `graphile_worker.add_job`. Only `railgun_app` gets `EXECUTE` on it. Services call it with `tx.$executeRaw` inside their existing transaction, so the job commits or rolls back with the change, as ADR 0005 requires.
3. **The `graphile_worker` schema is installed by our migrations**, run as `railgun_migrator` alongside `db/migrations`, not by the worker at startup. Schema changes keep a single owner and a single path.
4. **Payloads carry identifiers only**, such as `workspaceId` and the id of the affected row, never secrets or copied content. A task handler loads what it needs itself, through `withTenantContext` like any other code. This matches ADR 0005's rule that events are hints.
5. **The worker needs a direct database connection**, because Graphile Worker uses `LISTEN/NOTIFY` and ADR 0005 already says that cannot go through a transaction-mode pooler. Enqueuing from the API is an ordinary statement inside a transaction, so it works through any pooler.
6. ADR 0005's domain rule is unchanged: **the queue never owns execution lifecycle state.**

## Alternatives Considered

- **pg-boss (ADR 0005's default).** It is a mature library with built-in cron, retries and an optional dashboard. Rejected for now: transactional enqueue on Prisma 6 needs a custom `executeSql` shim over `tx.$queryRawUnsafe`. We would own that compatibility layer until the separate Prisma 7 decision, and then switch to the official adapter. Graphile Worker's SQL enqueue is the same either side of that upgrade.
- **Calling `graphile_worker.add_job` directly from `railgun_app`.** Rejected: it would mean giving the app role owner-level rights on the queue schema. The wrapper keeps the app role unprivileged and limits it to known task names.
- **Enqueuing after commit from application code.** Rejected by ADR 0005: that leaves a window where the change is committed but the job is lost.

## Consequences

- A new migration creates the `graphile_worker` schema, the enqueue wrapper and its grant. `db:check-rls` must not flag the queue tables: they are not tenant data and carry no `workspace_id`, so they remain outside RLS by design.
- `apps/worker` gains its first code. It depends on `graphile-worker` and the shared tenant-context helpers.
- A Prisma 7 upgrade does not affect enqueueing.
- Hosting (E1–E2) must give the worker a direct, non-pooled connection.

## Open Items

- ~~Which role the worker process connects as, and the exact grants it needs on the `graphile_worker` schema.~~ Resolved by the `background-jobs` change (migration `0014`), verified by running the worker:
  - The worker connects as its own **`railgun_worker`** role (`db/init/02-worker-role.sql`): login, no ownership, no RLS bypass.
  - On the queue schema it gets `USAGE`; DML on all tables; `USAGE, SELECT` on the sequences; `EXECUTE` on the functions; and matching default privileges for later Graphile tables.
  - **Graphile enables RLS on its `_private_*` tables with no policies**, which the docs don't mention, so each one also needs a `FOR ALL TO railgun_worker` policy. A table that a later Graphile version adds with RLS needs its own.
  - Tenant data: `SELECT, DELETE` on the trashable tables, `INSERT` on `activity_entries`, and workspace ids only (a column grant plus a role-scoped policy). `member_visible` on `project` is now scoped `TO railgun_app`, so its membership subquery doesn't deny the worker.
  - The migrator is never used at runtime.

## Revisit Triggers

- Queue latency or throughput becomes a measured problem (same trigger as ADR 0005).
- Graphile Worker's schema migrations stop working with our migrator-owned install path.
