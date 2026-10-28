# Design

## Context

See proposal.md, Why. Constraints from the current codebase and docs:

- **ADR 0005:**
  - SSE, with events as hints.
  - One multiplexed stream per tab.
  - Authorization is checked when a stream opens.
  - `LISTEN/NOTIFY` on a direct connection.
- **ADR 0009:**
  - Bearer token from Clerk's `getToken()`, verified by the global `ClerkAuthGuard`.
  - The SSE client reuses it through `fetch`. Native `EventSource` can't send headers.
- **API:**
  - Every write is raw SQL inside `withTenantContext` (one Prisma interactive transaction).
  - `ProjectRoleGuard` with `@RequireProjectRole` returns 403 when the caller lacks access to the project.
  - CORS allows `WEB_ORIGIN` only.
  - No `pg` dependency yet; `apps/worker` already uses `pg@^8.23`.
- **Web:**
  - TanStack Query keys: `executionKeys.list(p)` = `['projects', p, 'executions']` is the prefix of `executionKeys.detail(p, id)`.
  - Run bugs use `bugKeys.forRun(p, runId)`.
  - `execution-detail.tsx` polls every 5 s while In Progress or Paused.
  - `execution-list.tsx` polls every 10 s while any execution is live.
  - `useApplyExecution` writes the user's own mutation results into the cache.
  - `SessionProvider` in `app/(app)/layout.tsx` knows the active project.
- **Tests:**
  - API e2e tests run the real `AppModule` against the dev database, with `@clerk/backend`'s `verifyToken` mocked to return `{ sub: token }`.
  - Web tests are Vitest with Testing Library.

## Goals / Non-Goals

**Goals:**
- Another user's change to an execution reaches an open Executions screen within about a second.
- The change is atomic with the commit: no event for a rolled-back change, and no lost event for a committed one while connected.
- No new infrastructure or migration, and no new web dependency.

**Non-Goals:**
- Guaranteed delivery or event replay (`Last-Event-ID`). A reconnect refetches instead (ADR 0005).
- Suppressing the echo of the user's own changes. Their own tab refetches once more, which is harmless.
- Multi-instance load testing.

## Decisions

### 1. One project-scoped stream per tab carries both channels

`GET /projects/:projectId/events` delivers every execution event of that project. Each event names its execution. The client applies an event to the detail cache only when that execution is cached, so the "per-execution channel" is a filter on the client.

- **Why:** an execution's visibility is exactly its project's (`@RequireProjectRole('Viewer')`), so per-execution authorization would repeat the project check. Selecting another execution needs no resubscribe, and the list needs every execution's events anyway.
- **Alternatives:**
  - **A stream per execution plus one for the list:** two connections per tab, against ADR 0005's one-stream rule.
  - **One multiplexed stream with subscribe/unsubscribe requests:** needs a connection id and server-side subscription state. That can come later, with the per-user channel.
- The per-user channel joins this stream later, or replaces the project path with a user-level one. The event format below doesn't change either way.

### 2. Emit with `pg_notify` inside the existing transaction

A helper `emitLiveEvent(tx, event)` runs ``SELECT pg_notify('railgun_live', ${json})`` on the same `tx`. Postgres delivers notifications only at commit and discards them on rollback, which gives the commit-only rule for free.

- **Payload:** `{ type, workspaceId, projectId, executionId, runId? }`, about 200 bytes, well under the 8000-byte limit.
- **Emission points:**

| Route | Event |
|---|---|
| `POST /executions` | `execution.changed` |
| `PATCH /executions/:id` | `execution.changed` |
| `DELETE /executions/:id` | `execution.changed` |
| `POST /executions/:id/runs/:runId/move` | `execution.changed` |
| each lifecycle transition (shared `transition()` helper) | `execution.changed` |
| `PATCH …/runs/:runId` | `execution.changed`, plus `run.bugs.changed` when a bug was auto-created |
| `POST /bugs` with a run | `run.bugs.changed` |
| `POST /bugs/:id/link-run` | `run.bugs.changed` |
| `PATCH /bugs/:id` and `DELETE /bugs/:id` when the bug has a `test_run_id` | `run.bugs.changed` (the run's execution id is read in the same transaction) |

- **Alternatives:**
  - **Emit from the controller after `withTenantContext` resolves:** in-process only, so it breaks with a second instance, and it is easy to forget on an error path.
  - **A trigger on `test_execution` / `test_run`:** fires on the worker's purge and on the seed too, and hides the event set in SQL. Explicit calls next to the existing `logExecutionActivity` calls are easier to audit.

### 3. One `LISTEN` connection per API process, fanned out in memory

`LiveEventsService` (Nest `OnModuleInit`/`OnModuleDestroy`) opens one `pg.Client` to `REALTIME_DATABASE_URL ?? DATABASE_URL` and runs `LISTEN railgun_live`. It keeps a `Map<projectId, Set<subscriber>>`. Each notification is parsed and passed to that project's subscribers. A malformed payload is logged and dropped.

- **Reconnect:** on a client error or end, it reconnects with backoff (1 s doubling to 30 s). After reconnecting it sends a `resync` event to every open stream, because notifications sent while it was down are gone.
- **Alternatives:**
  - **A `LISTEN` connection per stream:** wastes connections.
  - **Prisma:** it can't `LISTEN`, since it has no notification API.
- `pg` is added to `apps/api`, at the version `apps/worker` uses. `railgun_app` needs no grant for `LISTEN` or `pg_notify`.

### 4. Raw Express response instead of Nest's `@Sse()`

The handler takes `@Res()`, so the global `ClerkAuthGuard` and `ProjectRoleGuard` still run first. A refusal is the normal 401 or 403 JSON response.

- **Headers:**
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache, no-transform`
  - `X-Accel-Buffering: no`
  - `Connection: keep-alive`

  It then calls `flushHeaders()`.
- **First write:** `retry: 3000`, then `event: ready`.
- **While open:**
  - `: ping` every 25 s.
  - Each event as `event: <type>` / `data: <json>` (the payload without `workspaceId`).
- **Closing:** after 5 minutes it ends the response. On `req.on('close')` it clears the timers and unsubscribes.
- **Tenant check:** the controller resolves the project's workspace once at open (`resolveProjectWorkspaceId`). Each delivered payload's `workspaceId` must match, a defence in depth on top of the project-id key.
- **Alternative:** `@Sse()` returning an Observable. It can't write SSE comments, and it needs extra plumbing for the max-age close and cleanup. Rejected for less control with no less code.

### 5. In-house fetch-based reader on the client

`lib/live-updates.tsx` holds three parts:

- **`readEventStream(body, onEvent)`:** about 40 lines of SSE parsing (line splitting across chunks, `event:`, `data:`, comments, blank-line dispatch), unit-tested on its own.
- **`LiveUpdatesProvider`:** mounted inside `SessionProvider`. For the active project it calls `getToken()` and then `fetch` with `Authorization`.
  - On `ready`, it sets `connected = true`.
  - It reads until the response closes. On an error it sets `connected = false` and reconnects with backoff (1 s doubling to 30 s, reset on `ready`).
  - A clean server close (the 5-minute rotation) reconnects at once.
  - An `AbortController` closes the stream on unmount or a project change.
- **`useLiveConnected()`:** reads the context. It returns `false` outside the provider, so existing tests that don't mount it still poll.
- **Alternative:** `@microsoft/fetch-event-source`. It works, but it hasn't been released since 2021, and the parsing we need is small.

### 6. Event → cache mapping

| Event | Cache action |
|---|---|
| `execution.changed` | Invalidate `executionKeys.list(p)` (exact) and `executionKeys.detail(p, executionId)` |
| `run.bugs.changed` | Invalidate `bugKeys.forRun(p, runId)` |
| `ready` after the first one on this provider, or `resync` | Invalidate the `executionKeys.list(p)` prefix (list and every detail) and the `['projects', p, 'bugs', 'run']` prefix |

Invalidation refetches only queries that are mounted, so a closed screen costs nothing.

### 7. Polling becomes the fallback

The `refetchInterval` callbacks in `execution-detail.tsx` and `execution-list.tsx` return `false` when `useLiveConnected()` is true. Otherwise they keep today's rule (5 s detail, 10 s list, live statuses only). The spec's "within 5 seconds" holds either way.

## Risks / Trade-offs

- **[Risk] A proxy or host buffers `text/event-stream`, so events arrive late or never, while `ready` may still have arrived.** → `X-Accel-Buffering: no` and `no-transform` cover the common proxies. If heartbeats stop arriving the client treats the stream as down: with no bytes for 60 s it aborts and reconnects, and meanwhile it polls.
- **[Risk] A token expires mid-stream.** → Expiry is checked only at open. The 5-minute rotation bounds how long revoked access keeps receiving identifiers, and identifiers alone reveal no content.
- **[Risk] The `LISTEN` connection drops silently.** → `pg` emits `error`/`end` on a socket loss. The service reconnects and sends `resync`. A periodic `SELECT 1` keepalive on the listener is cheap and added too.
- **[Trade-off] Every own mutation echoes back as one extra refetch.** → Accepted. TanStack Query dedupes concurrent fetches of a key.
- **[Risk] Browsers allow 6 HTTP/1.1 connections per host, and many tabs open on the same API host could exhaust them.** → One stream per tab (ADR 0005). HTTP/2 hosting removes the limit. Tracked with hosting (E1–E2).
- **[Risk] A pooled `DATABASE_URL` in production breaks `LISTEN`.** → `REALTIME_DATABASE_URL` exists for exactly this, and CLAUDE.md says so.

## Migration Plan

There is no data migration. Deploy the API and web together. If the stream endpoint is missing (an old API), the client gets 404, stays disconnected and polls as today. Rollback is reverting the change; nothing persists.
