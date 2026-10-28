# Proposal

## Why

Slice 1 (`execution-lifecycle`, archived 2026-10-25) built the whole execution backend: Draft authoring, the state machine, snapshot-on-start, the pause-aware timer, and manual outcomes. None of it is reachable from the web app yet, so the MVP still can't run a single test from a browser. This is roadmap-mvp.md Phase 7's **Slice 2**: the Executions screen that makes the lifecycle usable, closing Phase 7 and journey PRD §10.3 ("Running a Test Suite") end to end.

## What Changes

- **Navigation:** the app shell gains an **Executions** link next to Test Cases.
- **Executions screen** (`/executions`, PRD §6.3.1 split layout):
  - **List panel** (§6.3.2): name, status badge, done/total, Pass/Fail/Needs Review counts, last updated. **Sorting** (last updated, created, status; ascending/descending) and **filtering** (name, status, environment, browser), done in the browser over the list the API already returns. The tag filter is omitted because tags don't exist yet.
  - **Detail panel** (§6.3.3): header with name, description, status badge, and a **live elapsed timer** computed client-side from `elapsedMsAccumulated` + `lastResumedAt`, corrected for clock skew with the server's `now`. Run-condition metadata. A **5-cell stats bar** that filters the runs table, a **progress bar** colored by outcome share, and the **runs table** (position, test case name, status).
  - **Lifecycle buttons by role** (§6.3.4): Edit and Delete (Admin) on Draft, Mark as Ready, Back to Draft, Run All (Manual mode only; Automated shown disabled as unavailable), Pause/Resume, and Sign Off (Admin). Viewers see none of them. The API's 409 messages (e.g. "resolve every Needs Review run…") are shown to the user.
  - **Run detail side panel:** the run's test case name and Gherkin script (the snapshot once started), and an outcome control (Pass / Fail / Needs Review) for Contributors+ while the execution is In Progress or Completed.
  - **Environment panel** (§6.3.3, deferred here from Phase 5): opening the execution's environment lists its credential aliases and emails, and Contributors+ can reveal a password through the existing audited, rate-limited reveal endpoint.
  - **Polling instead of SSE** (ADR 0005/0011): the selected execution and the list refetch on an interval while anything is In Progress or Paused, so several testers on one execution see each other's outcomes.
- **New / Edit Execution modal** (§7.2): name, description, test case picker (**Ready test cases only**, ADR 0012), environment (optional), browser, viewport, locale, timezone, and the auto-create-bug toggle (stored only). Built with react-hook-form + zod (ADR 0011). Edit reuses the same modal on Draft executions.
- **"Run" button on a test case** (§7.2 step 1): on the Test Cases screen, for Contributors+ and only for Ready test cases. Opens the New Execution modal with that test case preselected.
- **API client:** non-2xx responses surface the server's error message and status (a typed error) instead of a generic string, so the screen can show *why* a transition was refused.

**Explicitly deferred (recorded, not silently omitted):**
- **Run reordering**, per decision: run order is the order test cases are picked in the modal, and editing the Draft changes it. Drag-and-drop arrives with the folder tree so both use the same library (open-questions F6).
- The execution activity history panel, which needs a new activity read endpoint.
- Cancel / Try Again (G7).
- Automated mode.
- Console drawer, traceability graph, step results, attempt history, bug links.
- The Executions dashboard and report downloads.
- Curated locale/timezone lists (G9). The modal offers a short common list plus free entry, validated by the API.

## Capabilities

### New Capabilities
- `executions-screen`: the web Executions screen: listing, sorting, and filtering executions; the detail view with live timer, stats, and runs; role-gated lifecycle actions; recording run outcomes; the environment panel with credential reveal; the New/Edit Execution modal; and starting a new execution from a test case.

### Modified Capabilities
- `web-app-shell`: the shell's navigation adds the Executions screen alongside Test Cases. This is a new requirement; existing ones are unchanged.

## Impact

- **Web (`apps/web`):** new `app/(app)/executions/page.tsx`; new `components/executions/*` (screen, list, detail, header/timer, stats bar, runs table, run panel, environment panel, execution form modal); new `lib/executions-api.ts`, `lib/environments-api.ts`, `lib/execution-permissions.ts`, `lib/elapsed-time.ts`; `components/shell.tsx` gains the nav link; `components/test-cases/test-case-detail.tsx` gains the Run button; `lib/api-client.ts` throws a typed `ApiError`. New shadcn primitives: `dialog`, `sheet`, `checkbox`, `badge`, `switch`.
- **API / DB:** none. Every endpoint this screen needs already exists (`executions`, `environments` list/detail/reveal, `test-cases` list).
- **Docs:** roadmap-mvp.md Phase 7 Slice 2 and Phase 7 → ✅ on completion; open-questions.md F6 notes that run reordering is deferred and its drag-and-drop choice will be shared with the folder tree.
- **Dependencies:** no new npm packages beyond the shadcn-generated component files and the Radix primitives they bring in (`radix-ui` is already installed).
