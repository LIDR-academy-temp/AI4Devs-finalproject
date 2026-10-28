# Tasks

## 1. Docs

- [ ] 1.1 In roadmap-full.md, add a Phase 6 "Slice 2: SSE live updates 🚧" entry pointing at the OpenSpec change `sse-live-updates`, with its scope and deferred list from proposal.md. Verify it reads like Slice 1's entry.

## 2. API: emitting events

- [ ] 2.1 Add `pg` and `@types/pg` to `apps/api` at the versions `apps/worker` uses. Add `src/realtime/live-event.ts` with the event types and `emitLiveEvent(tx, event)` (`pg_notify('railgun_live', json)` on the given transaction; design.md decision 2). Add an e2e spec that `LISTEN`s with a plain `pg` client and verifies both cases:
  - an `emitLiveEvent` inside `withTenantContext` that commits delivers exactly one notification with the expected payload
  - one whose callback throws delivers nothing
- [ ] 2.2 Call `emitLiveEvent` from the execution routes in design.md decision 2's table: create, edit, delete, run move, the shared lifecycle `transition()` helper, and run outcome (plus `run.bugs.changed` when a bug is auto-created). Extend `executions.e2e-spec.ts` and `execution-lifecycle.e2e-spec.ts` with a listener and verify:
  - each route emits `execution.changed` with the right ids
  - a refused transition (409) emits nothing
  - Fail with auto-create on also emits `run.bugs.changed`
- [ ] 2.3 Call `emitLiveEvent` from the bug routes: create with a run, link-run, and edit or delete of a bug that has a `test_run_id` (reading the run's execution in the same transaction). Extend `bugs.e2e-spec.ts` and verify:
  - each case emits `run.bugs.changed` with the execution and run ids
  - editing an unlinked bug emits nothing

## 3. API: listener and stream

- [ ] 3.1 Add `LiveEventsService` (design.md decision 3):
  - one `pg.Client` on `REALTIME_DATABASE_URL ?? DATABASE_URL`, running `LISTEN railgun_live`
  - per-project subscribe and unsubscribe
  - malformed payloads dropped and logged
  - reconnect with backoff, then `resync` to every subscriber
  - a periodic `SELECT 1` keepalive
  - clean shutdown in `onModuleDestroy`

  Register it in a `RealtimeModule` imported by `AppModule`. Add unit tests with a fake client and verify that dispatch reaches only the matching project, and that a simulated connection loss reconnects and sends `resync`.
- [ ] 3.2 Add `GET /projects/:projectId/events` (`@RequireProjectRole('Viewer')`, raw `@Res()`; design.md decision 4):
  - headers, then `retry` and `ready`
  - a `: ping` every 25 s
  - events written as `event`/`data` without `workspaceId`, and a workspace check on each payload
  - the stream closed after 5 minutes
  - cleanup on client close

  Make the intervals injectable so tests can shorten them. Add `test/live-updates.e2e-spec.ts` (`app.listen(0)` plus `fetch`, `verifyToken` mocked as in the other e2e specs) and verify:
  - Viewer → 200 `text/event-stream` and `ready`
  - no token → 401
  - non-member → 403
  - a run outcome recorded through the API reaches an open stream on that project
  - nothing reaches a stream on another project of the same workspace, or on another workspace's project (cross-tenant harness)
  - a heartbeat and the max-age close happen with shortened intervals
  - closing the client unsubscribes it (the service's subscriber count returns to 0)
- [ ] 3.3 Run `npm run lint`, `npm run typecheck` and `npm test -w apps/api` and verify they all pass. In CLAUDE.md, document `REALTIME_DATABASE_URL` next to `DATABASE_URL`, including the fact that it must be a direct, non-pooled connection in production.

## 4. Web: client

- [ ] 4.1 Add `readEventStream` to `lib/live-updates.tsx` (design.md decision 5). Write `lib/live-updates.test.ts` and verify that it parses:
  - events split across chunks
  - multi-line `data`
  - comments, which are ignored
  - CRLF line endings
- [ ] 4.2 Add `LiveUpdatesProvider` and `useLiveConnected()` in the same file:
  - one fetch per active project, with the Clerk bearer token and an `AbortController`
  - `connected` set on `ready`
  - backoff reconnect, with an immediate reconnect after a clean close
  - a 60 s silence watchdog
  - the cache mapping from design.md decision 6

  Mount it inside `SessionProvider` in `app/(app)/layout.tsx`. Add Vitest tests with a mocked `fetch` stream and verify:
  - `execution.changed` invalidates the list and that detail
  - `run.bugs.changed` invalidates that run's bug list
  - a second `ready` invalidates every execution query
  - a project change aborts the old stream and opens a new one
  - an error sets `connected` to false and retries
  - `useLiveConnected()` is false outside the provider

## 5. Web: polling as fallback

- [ ] 5.1 Gate `refetchInterval` in `execution-detail.tsx` and `execution-list.tsx` on `!useLiveConnected()` (design.md decision 7), and update their comments, which still say "Polling instead of SSE". Extend `execution-detail.test.tsx` and `execution-list.test.tsx` and verify:
  - with the provider reporting connected, no refetch happens after 5 s / 10 s
  - disconnected, today's polling still happens
- [ ] 5.2 Run `npm run lint`, `npm run typecheck` and `npm test -w apps/web` and verify they all pass.

## 6. Integration check and docs

- [ ] 6.1 With `npm run dev`, open the same In Progress execution in two browser sessions as two members, and verify:
  - an outcome recorded in one appears in the other within about a second
  - the browser's network panel shows one `events` request and no 5 s polling
  - stopping the API makes the other tab fall back to polling, and restarting the API reconnects it and catches up
- [ ] 6.2 Update the docs, and verify that the links resolve and that CLAUDE.md's statement on polling still matches the code (`grep -rn "Polling instead of SSE" apps/web` returns nothing):
  - **ADR 0005:** its stream-authentication open item is closed, pointing to ADR 0009 and this change, and noting the project-scoped stream (design.md decision 1).
  - **open-questions.md H1:** the SSE endpoint now exists.
  - **roadmap-full.md:** Slice 2 is marked ✅, with Built, Key decisions and Deferred like Slice 1.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the integration check passes and the user has reviewed it.
