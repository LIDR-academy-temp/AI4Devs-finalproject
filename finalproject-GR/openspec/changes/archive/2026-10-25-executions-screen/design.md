# Design

## Context

See proposal.md - Why. Current `apps/web` state (after `frontend-bootstrap` + `frontend-ui-stack`):

- Routes live under the `app/(app)/` group, wrapped by `Shell` (sidebar plus `SessionProvider`). `useSessionContext()` gives `{ projectId, projectName, role }`, and the role is never null inside the shell.
- Data access goes through `useApiClient()` (bearer token, 401 → `/sign-in`), with one small typed module per resource (`lib/test-cases-api.ts`) and TanStack Query hooks inside components. Query keys mirror REST paths, e.g. `['projects', projectId, 'test-cases']`.
- Role → UI permissions is a pure function (`lib/test-case-permissions.ts`) with its own unit test. Forms use react-hook-form + zod (`create-test-case-form.tsx`). UI uses shadcn primitives (style `radix-nova`, single `radix-ui` package) under `components/ui/`. Tests use Vitest + RTL through `test/render-with-providers.tsx`, mocking `useApiClient`.
- `useApiClient().request` currently throws `new Error('API request … failed: <status> <body>')` on non-2xx, so the server's 409 reason is buried in a string.
- The API is complete for this slice: `/projects/:projectId/executions` (+ lifecycle verbs and `runs/:runId`), `/projects/:projectId/environments[/:id]` (Viewer+), `POST …/credentials/:credentialId/reveal` (Contributor+, rate-limited → 429), `/projects/:projectId/test-cases`.
- Next.js is 16.4.3, newer than training data (`apps/web/AGENTS.md`). Anything version-sensitive gets checked in `node_modules/next/dist/docs/` at task time, as earlier changes did.

## Goals / Non-Goals

**Goals:**
- One Executions screen that covers journey §10.3 end to end, against the real API, with no backend changes.
- Lifecycle and permission rules live in pure, unit-tested functions. Components only render what those functions return.
- The timer and polling stay correct with several testers and a skewed client clock.

**Non-Goals:**
- Run reordering, the activity panel, Cancel/Try Again, the dashboard, and exports (proposal.md - deferred).
- Server-side sorting, filtering, or pagination. The list is one project's executions, small at MVP scale.
- SSE. Polling is the committed mechanism (ADR 0005 fallback, ADR 0011 #4).

## Decisions

**Route and selection state in the URL.** `app/(app)/executions/page.tsx` renders `ExecutionsScreen`. The selected execution id lives in the query string (`/executions?execution=<id>`), not component state, for two reasons. First, the Test Cases "Run" button navigates there after creating an execution, so the new execution opens selected. Second, a link to an execution is shareable between testers. `useSearchParams` in a client component needs a `<Suspense>` boundary in the App Router; confirm against the bundled Next 16 docs at task time. Alternative rejected: React state plus a context handoff from Test Cases. It's lost on reload and can't be linked.

**Layout follows PRD §6.3.1:** a left list panel (fixed width, scrollable) and a right detail panel. The run detail opens in a shadcn `Sheet` (side panel) over the detail; the environment panel uses a `Sheet` as well. The New/Edit modal and the Run All mode confirmation use `Dialog`, and Delete confirmation uses `Dialog` too. Primitives added via `npx shadcn@latest add dialog sheet checkbox badge switch` (the `frontend-ui-stack` precedent: add only what's used).

**Pure modules, each unit-tested:**
- `lib/execution-permissions.ts` has `executionActionsFor(status, role)`. It returns the visible action set (`edit`, `markReady`, `delete`, `backToDraft`, `runAll`, `pause`, `resume`, `signOff`) plus `canCreate` and `canRecordOutcome(status, role)`. It mirrors the API's transition table (`apps/api/src/executions/execution-lifecycle.ts`) and ADR 0012, and its test enumerates every status × role pair. Alternative rejected: importing the API module into the web app. That couples the two app builds; `packages/shared-types` exists for that later, but the table is tiny and the API stays the authority anyway (409s are shown).
- `lib/elapsed-time.ts` has `elapsedMs(execution, clientNow, skewMs)` and `formatElapsed(ms)` (`m:ss`, `h:mm:ss` past an hour). Skew is `serverNow − clientNowAtReceipt`, measured when each response arrives.
- `lib/execution-list-view.ts` has `sortExecutions` and `filterExecutions` (name substring case-insensitive, status, environment name, browser). The environment filter matches by `environmentName`, so executions whose environment was deleted still filter by their kept name.

**Live timer:** a `useElapsed(execution)` hook holds `skewMs` from the last fetch and re-renders every second via `setInterval`, only while `status === 'InProgress'`. That stops wasted renders on finished executions. The interval is the display tick only; the source of truth is the polled execution.

**Polling with TanStack Query `refetchInterval`.** On the detail query (`['projects', p, 'executions', id]`), the interval is a function returning `5000` while the latest data is `InProgress` or `Paused` and `false` otherwise. On the list query (`['projects', p, 'executions']`), it's `10000` while any listed execution is `InProgress` or `Paused`. Every mutation (lifecycle verb, outcome, create, edit, delete) writes its returned execution into the detail cache with `setQueryData`, so the user's own change appears instantly. It then invalidates the list key, which matters because the API returns the full execution from every verb. Alternative rejected: a fixed interval on everything. That polls forever on idle projects.

**API client error type.** `request` throws `ApiError extends Error { status: number; serverMessage: string }`. `serverMessage` is parsed from Nest's JSON error body (`message`, string or string[]) and falls back to the raw text. Existing callers only check that a call threw, so they keep working. The 401 redirect behavior is unchanged. A shared `<ActionError error={…} />` renders `serverMessage` for 4xx and a generic message otherwise, and shows a dedicated "try again shortly" for 429 on reveal.

**Execution form (`components/executions/execution-form-dialog.tsx`), one component for create and edit.** It uses a zod schema: name non-empty; `testCaseIds` min 1; viewport positive integers; locale and timezone non-empty strings. The API does the full `Intl` validation, and a 400 is shown inline. The test case picker is a checkbox list of `GET …/test-cases` filtered to `status === 'Ready'`, in picking order. Selection order is kept in an array, and a "picked" list underneath shows the resulting run order (since there's no reordering, picking order *is* the order). The environment `Select` lists `GET …/environments` plus "None". Choosing an environment pre-fills browser with its `defaultBrowser` unless the user already changed browser. Locale and timezone are a `Select` of a short common list (en-US, en-GB, es-ES, pt-BR, ja-JP; UTC, America/New_York, Europe/Paris, Asia/Tokyo, …) plus an "Other…" free-text entry, so G9's curated list stays open without blocking. Viewport presets: 1280×720, 1366×768, 1920×1080, 390×844 (mobile), and Custom. Edit mode pre-fills from the execution and sends `testCaseIds` only if the selection changed, so run ids aren't churned needlessly.

**"Run" on a test case:** `TestCaseDetail` gets a `canRun` prop (role Contributor+ and `status === 'Ready'`). It opens the same `ExecutionFormDialog` with `initialTestCaseIds=[id]` and a default name of the test case's name. On success it calls `router.push('/executions?execution=<newId>')`. The dialog lives in the shared `components/executions/` folder; Test Cases imports it.

**Environment panel:** `GET /environments/:id` loads on open (key `['projects', p, 'environments', id]`). Reveal is a mutation per credential, and the revealed passwords are held only in component state, never in the query cache. Leaving them out of the cache keeps them out of devtools/persistence, and they're dropped when the sheet closes. The API already sets `Cache-Control: no-store`.

**Nav active state:** `Shell` uses `usePathname()` to mark the current link (`aria-current="page"`).

**Testing:**
- Unit tests for the three pure modules.
- Component tests with a mocked `useApiClient`: the screen's role-gated actions per status; the run panel's outcome control (shown, hidden, the completion path updating the header); the stats-bar filter; the form's validation, Ready-only picker, and picking order; the environment panel's reveal per role and the 429 message; the Test Cases Run button gating; the nav link.
- The timer is tested with Vitest fake timers.
- A manual dev-server checklist covers what the jsdom tests can't: real polling between two browser sessions, and Radix `Sheet`/`Dialog` focus behavior.

## Risks / Trade-offs

- [Client-side sort and filter won't scale to thousands of executions] → Fine at MVP scale. Moving them server-side later is additive (query params on the existing list endpoint).
- [The web permission table can drift from the API's transition table] → The API remains the authority (refusals are shown via `ApiError`), and the web table's exhaustive status × role test makes drift visible in review. Revisit moving both into `packages/shared-types` when a third consumer appears.
- [Polling every 5s per open detail tab adds load] → Only while In Progress/Paused, and it's one indexed query per tick. ADR 0011's revisit trigger covers moving to SSE if this proves inadequate.
- [Picking order as run order is less discoverable than drag-and-drop] → The picked-order preview makes it explicit; reordering returns with F6's decision.
- [shadcn `sheet`/`dialog` generation against `radix-nova` + Next 16 is unverified] → Same posture as `frontend-ui-stack`: check typecheck after `shadcn add`. Fallback is hand-assembling from `radix-ui` primitives.
- [`useSearchParams` Suspense requirement in Next 16] → Checked against bundled docs at task time (task 3.1).
