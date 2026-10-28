# Tasks

## 1. Foundations

- [x] 1.1 Add shadcn primitives: `npx shadcn@latest add dialog sheet checkbox badge switch` (from `apps/web`) — verify each file exists under `components/ui/` and `npm run typecheck -w apps/web` passes; if generation doesn't compile, hand-assemble from `radix-ui` per design.md and note it
- [x] 1.2 Make `lib/api-client.ts` throw `ApiError { status, serverMessage }` (parse Nest's JSON `message` — string or string[] — fall back to raw text), keeping the 401 redirect and 204 handling unchanged — verify `lib/api-client.test.ts` still passes plus new cases: 409 JSON body → `serverMessage` is the server's message and `status` 409; non-JSON body → raw text
- [x] 1.3 Add `components/action-error.tsx` rendering `serverMessage` for 4xx, a generic message otherwise, and "try again shortly" for 429 — verify a component test for all three

## 2. Pure modules (unit-tested, no React)

- [x] 2.1 `lib/executions-api.ts`: types (`Execution`, `Run`, `ExecutionStatus`, `RunOutcome`, `ExecutionInput`) matching the API's `ExecutionResponse`, and functions for list/get/create/update/delete, each lifecycle verb, and `setRunOutcome`; `lib/environments-api.ts`: `listEnvironments`, `getEnvironment`, `revealCredential` — verify typecheck (behavior covered by component tests)
- [x] 2.2 `lib/execution-permissions.ts`: `executionActionsFor(status, role)`, `canCreateExecution(role)`, `canRecordOutcome(status, role)` per design.md — verify `execution-permissions.test.ts` enumerates every status × role (Viewer/Contributor/Admin) and asserts the exact action set, including Viewer → none, Delete/Sign Off Admin-only, outcomes only In Progress/Completed
- [x] 2.3 `lib/elapsed-time.ts`: `elapsedMs(execution, clientNow, skewMs)`, `skewFrom(serverNowIso, clientReceivedAt)`, `formatElapsed(ms)` — verify tests: running with skew (60s accumulated + 5s server-relative → 1:05), paused stays fixed, hour formatting (`1:02:03`), never negative
- [x] 2.4 `lib/execution-list-view.ts`: `sortExecutions(list, key, direction)` (updatedAt default desc, createdAt, status) and `filterExecutions(list, { name, status, environmentName, browser })` — verify tests for each sort key/direction and each filter, including case-insensitive name match and filtering by a deleted environment's kept name

## 3. Executions screen

- [x] 3.1 `app/(app)/executions/page.tsx` + `components/executions/executions-screen.tsx`: split layout, selected id from `?execution=` via `useSearchParams` (check the Suspense requirement in `node_modules/next/dist/docs/` first), selecting updates the URL — verify a component test: `?execution=<id>` renders that execution's detail; selecting another updates the param
- [x] 3.2 `components/shell.tsx`: add the Executions nav link with `aria-current="page"` for the active route via `usePathname()` — verify `shell.test.tsx` gains: both links render, the current one is marked
- [x] 3.3 `components/executions/execution-list.tsx`: list query with conditional `refetchInterval` (10s while any In Progress/Paused), status badge, counts, last updated, sort and filter controls wired to `execution-list-view.ts`, empty state with New for `canCreateExecution` — verify tests: rows show counts; filtering by status narrows the list; empty state shows New only for Contributor+
- [x] 3.4 `components/executions/execution-detail.tsx` + `execution-header.tsx`: detail query with `refetchInterval` (5s while In Progress/Paused), header (name, description, status badge, live timer via `useElapsed`, run conditions, environment entry) — verify tests: run conditions render; with fake timers an In Progress timer advances by 1s per tick and a Paused one doesn't
- [x] 3.5 `stats-bar.tsx` + progress bar + `runs-table.tsx`: five clickable cells filtering the table, outcome-proportioned progress bar, runs in position order with name/outcome and a deleted-test-case marker — verify tests: Fail cell shows only Fail runs, Total resets; deleted test case marked
- [x] 3.6 `lifecycle-actions.tsx`: buttons from `executionActionsFor`, each a mutation that writes the returned execution into the detail cache and invalidates the list; Run All opens a mode dialog (Manual enabled, Automated disabled as unavailable); Delete confirms then clears `?execution`; refusals shown via `ActionError` — verify tests: Contributor on Ready sees Back to Draft + Run All only; Viewer sees none; Run All → Manual calls `run-all` with `{ mode: 'Manual' }`; a 409 on Sign Off shows the server message and the status stays Completed
- [x] 3.7 `run-panel.tsx` (Sheet): test case name + script, deleted marker, outcome buttons when `canRecordOutcome` — verify tests: Contributor on In Progress sets Fail → table and stats update from the returned execution; returned status Completed updates the header; no control when Paused or for a Viewer
- [x] 3.8 `environment-panel.tsx` (Sheet): loads the environment on open, lists alias/email, Reveal per credential for Contributor+ held only in component state, 429 message, deleted-environment state with no panel — verify tests: Contributor reveal shows the password; Viewer has no Reveal; 429 shows "try again shortly"; `environmentId: null` with a name shows "no longer available" and no open control

## 4. New / Edit Execution form

- [x] 4.1 `components/executions/execution-form-dialog.tsx`: react-hook-form + zod, Ready-only test case checkboxes keeping picking order with a run-order preview, environment select (+ None) pre-filling browser from `defaultBrowser` unless changed, browser/viewport presets + custom, locale/timezone common lists + "Other…", auto-create-bug switch; create mode → `POST`, select the new execution; edit mode pre-fills and sends `testCaseIds` only when changed; API 400 shown inline — verify tests: only Ready test cases are pickable; missing name/test cases blocks submit; picking B then A sends `[B, A]`; edit without touching test cases omits `testCaseIds`
- [x] 4.2 Wire New (list header / empty state) and Edit (Draft detail) to the dialog — verify test: Edit on a Draft opens pre-filled and saving updates the detail

## 5. Run from a test case

- [x] 5.1 `TestCaseDetail` gains Run (`canRun` = Contributor+ and status Ready) opening `ExecutionFormDialog` with the test case preselected and its name as default execution name; on success `router.push('/executions?execution=<id>')` — verify tests: Run shown for Ready + Contributor; hidden for Draft/Deprecated and for Viewer; successful save navigates with the new id

## 6. Docs and final verification

- [x] 6.1 open-questions.md F6: note run reordering is deferred and its drag-and-drop library will be chosen together with the folder tree's (decision 2026-10-25) — verify the F6 row reads accordingly
- [x] 6.2 Run `npm run lint`, `npm run typecheck`, `npm run test -w apps/web`, `npm test -w apps/api` — verify all pass
- [x] 6.3 Manual dev-server check (API + web running, `SECRETS_MASTER_KEY` set): create an execution from Test Cases' Run → Mark as Ready → Run All (Manual) → set outcomes → one Needs Review blocks Sign Off → resolve → Sign Off; in a second signed-in browser as another member, confirm outcomes appear within ~5s; open the environment panel and reveal — record anything that diverges — **Done 2026-10-25:** the flow works end to end; UI to be refined later with better controls and styling (no functional gaps recorded).
- [x] 6.4 roadmap-mvp.md: Phase 7 Slice 2 Built / Key decisions / Deferred entry; mark Phase 7 ✅ Complete once archived

## Workflow follow-up

- Archive with `/opsx:archive` once all tasks are done.
