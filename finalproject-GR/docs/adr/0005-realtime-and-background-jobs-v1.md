# ADR 0005: Real-time Updates and Background Jobs for v1

**Status:** Accepted, amended by [ADR 0012](0012-execution-completion-and-sign-off.md) (execution completion, sign-off and test case eligibility)
**Date:** 2026-09-23
**Amends:** [ADR 0001](0001-tech-stack.md) (Real-time and Background Jobs layers)

## Context

ADR 0001 committed to Socket.IO, Redis and BullMQ from the start, justified largely by the automated execution engine (live step progress, streaming console output, pausable long-running work). That engine is disabled in [PRD.md](../../PRD.md) (§6.3.4, §9), so v1 has **manual runs only**. ADR 0001's own Consequences section acknowledged that Redis becomes required "even before the automation engine is rebuilt".

What v1 actually needs:

| Need | v1 (manual runs) | Later (automated engine) |
|---|---|---|
| Elapsed timer (§6.3.3) | Computed in the browser from the execution's accumulated elapsed time and last-resume timestamp (so pauses are excluded); no server push | Same |
| Several testers on one execution | The stats bar and runs table refresh when a colleague updates a run | Same |
| Step-by-step progress, console log | Not needed | Server-to-browser stream |
| Pause, resume, cancel | Ordinary requests | Ordinary requests |
| Background work | Emails (invitations, password reset, verification) with retries; report generation (HTML, PDF); daily Health Score snapshot; 30-day trash purge; orphaned attachment cleanup | Long-running Playwright runs |

Every push need is **one-way, server to browser**. Commands travel as ordinary requests, so nothing in the PRD requires a bidirectional channel.

## Decision

**Server-sent events (SSE) for real-time, and a PostgreSQL-backed job queue for background work. No Redis, Socket.IO or BullMQ in v1.**

**Real-time**
- The API exposes SSE streams. Events carry only an event type and identifiers (small payloads); the client refetches or patches state through the normal API. **State is the source of truth; events are hints**, so a missed event is repaired by refetching on reconnect.
- One multiplexed stream per browser tab, with channels per execution and per user (for pending invitations), to stay within browser connection limits.
- Authorisation is checked when a stream opens and per channel, under the tenant context from ADR 0003.
- Fan-out across several API instances uses Postgres `LISTEN/NOTIFY` on a direct (non-pooled) connection. Payloads are identifiers only, well under the notification size limit. A single API instance is acceptable for v1.

**Background jobs**
- A Postgres-backed queue (**pg-boss** by default; Graphile Worker is the alternative) runs in a separate worker process from the same codebase.
- v1 jobs: email delivery, report generation, daily Health Score snapshot, trash purge, orphaned attachment cleanup. Invitation expiry is evaluated on read and needs no job.
- **Jobs are enqueued in the same database transaction as the change that triggers them**, so an invitation and its email either both happen or neither does.
- Rules for every job: it carries `workspace_id` and sets the tenant context (a job without one fails, per ADR 0003); it carries secret ids, never secret values (ADR 0004); handlers are idempotent; failures retry with backoff and land in a dead-letter state; scheduled jobs run as singletons so several instances never run the same schedule twice.

**Domain rule:** the execution lifecycle (Draft, Ready, In Progress, Paused, Completed, Done, Canceled) is a state machine in the domain layer, persisted in the database. **The queue never owns lifecycle state.** This keeps a later move to a different execution runtime from creating a second source of truth.

**Explicitly not decided here:** the automated execution engine's runtime. ADR 0001's deferral of Temporal stands, and this ADR does not commit to anything for the engine.

## Rationale

- **Fits the actual traffic.** One-way push is exactly what SSE provides, including for the later console stream. It is plain HTTP, reconnects automatically, and needs no separate protocol or sticky-session setup.
- **One fewer service.** Removing Redis reduces the operational surface at a point where ADR 0001 already has five or six vendors, and removes the constraint that Redis be configured for a queue (no eviction).
- **Transactional enqueue** is a correctness benefit a Redis queue cannot offer: no window where the data change committed but the job was lost, or the job ran for a change that rolled back.
- **Volume is small.** v1 job volume (emails, occasional reports, a few scheduled tasks) sits far below what a Postgres queue handles.

## Alternatives Considered

- **Socket.IO + Redis + BullMQ from day one (ADR 0001).** Ready for the engine and battle-tested. Rejected for v1: it runs Redis and a WebSocket layer for features that are disabled, cannot enqueue transactionally with the data change, and the bidirectional channel is unused by the PRD.
- **Hybrid: Socket.IO with a Postgres queue.** Avoids Redis at first. Rejected: keeps a WebSocket layer nothing needs, and scaling past one API instance would need the Redis adapter after all.
- **Polling.** Simplest. Rejected as the primary mechanism because several testers working in one execution benefit from immediate refresh, but it remains the fallback if a proxy interferes with streaming.

## Consequences

- No Redis, Socket.IO or BullMQ in v1. The diagram and decision table in ADR 0001 show them; they are superseded for v1 by this ADR.
- **The API authenticates streams differently from plain requests.** The browser's built-in `EventSource` cannot send an `Authorization` header, so the stream needs a fetch-based client or a short-lived stream ticket. This ties into the open item in ADR 0002 on bearer tokens versus cookies.
- The queue adds load and tables to the primary database, and the queue library must be verified against the chosen ORM and connection pooler. `LISTEN/NOTIFY` requires a direct connection, not a transaction-mode pooler.
- Throughput has a ceiling well above v1's needs but far below a dedicated broker's.
- Browsers limit concurrent connections per host on HTTP/1.1, hence one stream per tab and HTTP/2 where available.

## Revisit Triggers

- **Work on the automated execution engine starts.** Streaming console output from many concurrent runs across several instances needs a real pub/sub transport (introduce Redis pub/sub at that point) and the ADR 0001 Temporal evaluation.
- Queue latency or throughput becomes a measured problem.
- More than one API instance carries heavy event volume through `LISTEN/NOTIFY`.

## Open Items

- Stream authentication approach (fetch-based client versus stream tickets), decided together with the ADR 0002 bearer-versus-cookie item.
- Final queue library choice (pg-boss versus Graphile Worker), validated against the ORM and the pooler.
- Where the worker process runs in the hosting layout.
