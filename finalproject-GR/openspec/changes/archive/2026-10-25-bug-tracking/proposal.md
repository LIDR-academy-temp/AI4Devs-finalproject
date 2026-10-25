# Proposal

## Why

Phase 7 made executions runnable end to end, but a failing run still leads nowhere: there is no way to record the defect it exposed. Bugs are the third leg of the MVP's core loop (PRD §10.3 step 4, §10.4): *write a test → run it → file what broke*. This is roadmap-mvp.md **Phase 8 — Bugs (text-only)**: file a bug from a failing run, keep a snapshot of the run's test case, move it through its status lifecycle. No image attachments, no object storage.

Per decision, Phase 8 is **one change** (DB + API + Bugs screen + run-panel integration). It is much smaller than the execution lifecycle, and every frontend pattern it needs exists since `executions-screen`.

## What Changes

- **New table `bug`** (standard `workspace_id` RLS, soft delete per ADR 0007). Columns follow the data model in readme §3: title, severity, status, description, steps to reproduce, optional links to a test run and test case (nullable, cleared on purge), and server-derived snapshots of the test case name, Gherkin script and failed step. Additions:
  - `reporter_display_name`: users can only read their own `"user"` row, the same reason activity entries store the actor's name.
  - `auto_created`.
- **Bug API** under `/projects/:projectId/bugs`:
  - Create, list, detail and edit (Contributor+); delete (Admin, soft delete).
  - Filing from a run: the server copies the run's own start snapshot (name + script) and the test case link; the client never supplies snapshot text.
  - Optional **failed step**, which must be one line of that script.
  - **Linking an existing unlinked bug to a run.**
  - Every change is activity-logged in the same transaction (ADR 0007).
- **Status transitions — resolves G4 (per decision):** any of Open, In Progress, Resolved, Closed, Won't Fix → any other, for Contributors and Admins. Reopening is just Closed → Open. **Severity:** Critical, High, Medium, Low.
- **Auto-create on failure — resolves G8 (per decision):** when a run is set to **Fail** on an execution with *Auto-create bug on failure* on, the API creates a bug in the same transaction. The new bug carries the snapshot title and script, the tester as reporter, `auto_created`, and severity Medium. It is created **at most once per run**: flipping a run Fail → Pass → Fail doesn't create a second bug.
- **Bugs screen** (`/bugs`, PRD §6.4.1 split layout, `?bug=<id>` selection):
  - **List** (§6.4.2): title, severity dot and status badge, sorted and filtered client-side; sort by last updated, created, status, severity; filter by name, status, severity.
  - **Detail** (§6.4.3):
    - Inline title, status and severity editing, plus description and steps to reproduce saved on blur.
    - The reporter's name.
    - A **linked test run** section: execution name, run position and outcome, linking to `/executions?execution=…`.
    - A **linked test case** section that links to the test case.
    - The **Gherkin snapshot with the failed step highlighted**.
    - Admin delete.
  - **New Bug modal** (§7.3, minus tags and images).
- **Run panel integration** (PRD §6.3.3 / §7.3 step 1), on the Executions screen's run side panel:
  - Lists the bugs linked to that run, each linking to `/bugs?bug=…`.
  - **File bug** opens the New Bug modal pre-filled from the run, with a **failed-step picker** that lists the script's lines.
  - **Link existing bug** picks from the project's unlinked bugs.
  - All of this is for Contributors and above, once the execution has started.
- **Test Cases deep link:** `/test-cases?testCase=<id>` selects that test case, so a bug's linked test case is a real link.
- **Navigation:** the shell gains a **Bugs** link.
- **ADR 0013** records G4, G8, the failed-step rule and the one-run-per-bug linking rule; open-questions.md moves G4 and G8 to resolved.

**Explicitly deferred (recorded, not silently omitted):**
- Image attachments and object storage (F8).
- Tags on bugs (no tags exist yet).
- The bug activity history panel (needs an activity read endpoint).
- The Bugs dashboard and PDF.
- Unlinking a bug from a run, or moving it to another run.
- Issue-tracker integrations.
- "Former member" reporter display (no member removal exists yet).

## Capabilities

### New Capabilities
- `bug-tracking`: bugs as a domain:
  - Creating, reading, editing and deleting bugs.
  - Severity and status rules.
  - Server-derived run and test-case snapshots, and the failed-step rule.
  - Linking an existing bug to a run.
  - Automatic bug creation on failure.
  - Activity logging.
- `bugs-screen`: the web Bugs screen (list with sort/filter, detail with inline edits and linked run/test case/snapshot, New Bug modal, Admin delete).

### Modified Capabilities
- `executions-screen`: the run side panel gains linked bugs, File bug (with failed-step picker), and Link existing bug. Added requirements; existing ones are unchanged.
- `web-app-shell`: the navigation requirement now covers the Bugs screen too, and the Test Cases screen can be opened on a specific test case.

## Impact

- **DB:** migration `0009_bug.up/down.sql`, one new table with standard RLS; `test_run`/`test_case` reuse their existing `UNIQUE (id, workspace_id)` for composite FKs with `ON DELETE SET NULL (column)` (Postgres ≥ 15, already required).
- **API:**
  - New `apps/api/src/bugs/` controller and queries.
  - `execution-lifecycle.controller.ts`'s outcome write gains the auto-create step.
  - A pure `bug-rules.ts` module holds the statuses, severities and failed-step validation.
- **Web:**
  - New `app/(app)/bugs/page.tsx` and `components/bugs/*`.
  - New `lib/bugs-api.ts` and `lib/bug-list-view.ts`.
  - `run-panel.tsx` gains a bugs section.
  - The shell gains the Bugs link.
  - `test-cases-screen.tsx` reads `?testCase=`.
- **Docs:** ADR 0013; open-questions.md (G4, G8 resolved); roadmap-mvp.md Phase 8 entry.
- **Dependencies:** none new.
