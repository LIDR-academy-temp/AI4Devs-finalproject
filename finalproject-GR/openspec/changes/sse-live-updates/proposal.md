# Proposal

## Why

The Executions screen stays current by polling: every 5 s for the open execution, and every 10 s for the list while anything is live (ADR 0005/0011 stopgap). Two testers on one execution see each other's outcomes up to 5 s late, and every open tab keeps sending requests while nothing has changed. ADR 0005 chose server-sent events with Postgres `LISTEN/NOTIFY` for v1, and ADR 0009 settled how a stream authenticates (a fetch-based client sends the same bearer token). Slice 1 (`background-jobs`) is done, so this is roadmap-full.md Phase 6, slice 2: SSE live updates.

## What Changes

- **Transactional notifications (API):** execution mutations call `pg_notify` inside their existing `withTenantContext` transaction, so an event goes out only if the change commits. Payloads hold identifiers only (ADR 0005: events are hints). Events fire for:
  - execution create, edit, delete and run reordering
  - lifecycle transitions and run outcomes
  - bug changes that alter a run's linked bugs: filed from a run, auto-created on Fail, linked to a run, or edited or deleted while linked
- **Fan-out (API):** one dedicated `pg` connection per API process `LISTEN`s on a single channel. It hands each notification to the open streams for that notification's project. A new optional env var, `REALTIME_DATABASE_URL`, points it at a direct (non-pooled) connection and defaults to `DATABASE_URL`.
- **Stream endpoint (API):** `GET /projects/:projectId/events` is a `text/event-stream`.
  - **Auth:** the same Clerk bearer guard and the project role check (Viewer and up) as every other project route, applied when the stream opens.
  - **Heartbeat:** a comment every 25 s keeps proxies from closing an idle stream.
  - **Re-authorization:** the server closes each stream after 5 minutes, so the client reconnects with a fresh token and access is checked again.
  - **Fan-out:** the project's execution events reach every stream open on that project, and nothing else does.
- **Web client:**
  - A small fetch-based SSE reader. Native `EventSource` cannot send headers, so the reader is written in-house, with no new dependency.
  - A `LiveUpdatesProvider` in the app shell holds one stream per tab, for the active project. It reconnects with backoff.
  - **On an event:** it invalidates the matching TanStack Query caches: the executions list, that execution's detail, and that run's linked bugs.
  - **On a reconnect:** it invalidates the project's execution queries to repair anything missed.
  - It exposes whether the stream is connected.
- **Polling becomes the fallback:** the execution detail and list keep their 5 s / 10 s intervals, but only while the stream is not connected (ADR 0005: polling stays the fallback if a proxy interferes).

Out of scope:
- **The per-user channel:** pending invitations, which don't exist until the Phase 3 remainder.
- **Live updates for other screens:** Bugs list, Test Cases tree, tags.
- **Phase 7's console and step streams:** the automated engine.
- **Report-ready notifications:** Phase 10.
- **Fan-out across several API instances:** each instance `LISTEN`s, so this works as designed but isn't tested beyond one instance. Hosting (E1–E2) decides the direct connection.
- **Enqueueing jobs from API routes:** unchanged from slice 1.

## Capabilities

### New Capabilities

- `live-updates`: the server-to-browser event stream. It covers:
  - stream authentication and per-project authorization
  - transactional emission (commit-only)
  - identifier-only payloads
  - project and tenant isolation of events
  - heartbeat and periodic re-authorization
  - the client's reconnect-and-repair behaviour

### Modified Capabilities

- `executions-screen`: "Execution views stay current while work is under way" changes. Colleagues' changes now arrive by push. Polling remains only while the live stream is unavailable.

## Impact

- **API:**
  - `src/realtime/` (new): the notify helper, the `LISTEN` service and the stream controller.
  - Notify calls are added to `executions.controller.ts`, `execution-lifecycle.controller.ts` and `bugs.controller.ts`.
  - New dependency: `pg`, which `apps/worker` already uses.
  - New e2e specs against the real database.
- **DB:** no migration. `pg_notify`, `LISTEN` and `NOTIFY` need no grants for `railgun_app`.
- **Web:**
  - `lib/live-updates.tsx` (new): the provider, the hook and the SSE reader.
  - `app/(app)/layout.tsx` mounts the provider.
  - `execution-detail.tsx` and `execution-list.tsx` gate their polling on the connection state.
- **Docs:**
  - CLAUDE.md: `REALTIME_DATABASE_URL`.
  - roadmap-full.md: the Phase 6 slice 2 entry.
  - ADR 0005: its stream-authentication open item is closed by pointing to ADR 0009 and this change.
  - open-questions.md H1: the SSE endpoint now exists.
