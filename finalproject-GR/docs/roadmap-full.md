# Implementation Roadmap — Full Product

Consolidated from [PRD.md](../PRD.md) and ADRs [0001](adr/0001-tech-stack.md)–[0007](adr/0007-activity-log-and-trash-purge.md), as of 2026-10-23. This is the build order for the complete product. See [roadmap-mvp.md](roadmap-mvp.md) for a narrower, faster path to a demoable slice that feeds into this same order without rework.

Ordering principle: anything cross-cutting that every later feature depends on (tenant isolation, the activity log, authorization) is built once, correctly, before any feature table — retrofitting these after features exist means auditing every query and mutation already shipped. Feature work then follows the domain's own dependency graph.

**Status after the MVP (reconciled 2026-10-26):** [roadmap-mvp.md](roadmap-mvp.md) Phases 0–9 are complete and built most of this roadmap's foundation and core domain. Each phase below keeps its original plan and adds its status (✅ Complete, 🚧 Partly done, ⬜ Not started), what the MVP covered (by MVP phase — **the two roadmaps number phases independently**), and what remains. Future work is scoped as "Phase N remainder" from those lists; a slice that closes one is recorded under its phase the same way roadmap-mvp.md records slices (OpenSpec change, Built, Key decisions, Deferred).

**Suggested order for the remaining work:** Phase 4 remainder (no new infrastructure) → Phase 0 B2 decision → Phase 6 (unblocks invitations, Trash purge, Health Score job, live updates) → Phase 3 and 7 remainders → Phase 9 → Phase 8 attachments (after E3) → Phases 10–12.

---

## Phase 0 — Lock in mechanism decisions 🚧

Settle before writing code, since changing these later touches everything built on top of them. See [open-questions.md](open-questions.md) for full context; decide each with an ADR per the project's usual workflow.

- **B1** — Prisma tenant-context mechanism (extension vs. explicit transaction helper).
- **A2** — Bearer token vs. cookie auth; SSE auth approach (native `EventSource` can't send `Authorization`).
- **E1 / E2 / E3** — Postgres host, compute host, object storage.
- **E4** — Region / data residency.
- **B2** — Queue library (pg-boss vs. Graphile Worker). ✅ [ADR 0018](adr/0018-queue-library.md): Graphile Worker.

- **Covered by MVP Phase 0:** B1 → [ADR 0008](adr/0008-tenant-context-implementation.md); A2 (bearer token; SSE client reuses it) → [ADR 0009](adr/0009-api-authentication-transport.md).
- **Remaining:** E1–E4 (hosting, storage, region), needed before deploying and before Phase 8 attachments (E3); not needed for local development.

## Phase 1 — Monorepo scaffold ✅

pnpm workspace per [readme §2.3](../readme-GR.md): `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker`; `packages/shared-types`, `packages/config`, `packages/reporting`; `prisma/`. Docker-compose for local Postgres with the two DB roles (migration role, `railgun_app`) from ADR 0003/0007. Minimal CI (lint, typecheck, test placeholder).

- **Covered by MVP Phase 1:** npm workspaces instead of pnpm ([ADR 0010](adr/0010-monorepo-layout.md)); `apps/api`, `apps/web`, `apps/worker` (placeholder), `packages/*`; docker-compose Postgres 16 with the migrator/app roles; CI (lint, typecheck, test).
- **Remaining:** none.

## Phase 2 — Database foundation ✅

Built before any feature table — this is the layer every later phase depends on.

- Base migration: `workspace`, `user`, `project`, `membership`.
- RLS policy pattern + tenant-context helper, proven end-to-end on one table (resolves the B1 spike).
- `activity_entries` table, `ActivityLogger.log(tx, …)`, the immutability trigger, revoked `UPDATE`/`DELETE`/`TRUNCATE` privileges (ADR 0007).
- CI check: fails if a `workspace_id` table lacks a forced RLS policy.
- Cross-tenant test harness (workspace A vs. B), reused by every feature's tests from here on.

- **Covered by MVP Phase 2:** all of it: base schema, forced RLS + `withTenantContext`, append-only `activity_entries`, `db:check-rls`, cross-tenant harness.
- **Remaining:** none.

## Phase 3 — Auth & authorization skeleton 🚧

- Clerk integration (sign-up, sign-in, session) — ADR 0002.
- `users` mirror table; atomic user+workspace+Owner-membership transaction.
- Authorization policy module (NestJS guards): workspace role × project role matrix.
- Project membership CRUD.
- Invitation model + accept/decline/revoke/resend (§3.3).

- **Covered by MVP Phase 3:** Clerk sign-up/sign-in, atomic user + workspace + Owner provisioning, the role-combining policy module and guards (`project-authorization`).
- **Remaining:** project membership CRUD (add, change role, remove); the invitation model and flows (§3.3), which need A1 (email provider) and Phase 6's email job to deliver them. A3–A5 stay open until then.

## Phase 4 — Core domain CRUD: Project, Folders, Tags, Test Cases 🚧

First real vertical slice — no lifecycle state machine, no secrets, no real-time. Folder tree (3-level, drag/reorder via position keys) built here while low-stakes, since F6 flags it as one of the hardest UI pieces and nothing downstream depends on it yet. Resolves G2 (status transitions) and G3 (tag management).

- **Covered by MVP Phases 4 and 9:** test case authoring and deletion; the folder tree, nested **4** levels (PRD §2.3 amended), with drag-and-drop ordering on fractional keys ([ADR 0014](adr/0014-drag-and-drop-and-ordering.md)); the New Test Case modal. G2 resolved as already built ([ADR 0015](adr/0015-test-case-status-changes.md)), except that status changes aren't activity-logged yet.
- **Remaining** (decided 2026-10-26: tags first, projects later; tag rules in [ADR 0016](adr/0016-tag-management.md)):
  - **Slice 1: Tags on test cases ✅** (OpenSpec change `test-case-tags`, archived 2026-10-27)
    - **Built:**
      - Migration `0011_tag`: `tag` (unique name per project ignoring case, eight-colour palette check) and `test_case_tag`, both with forced RLS.
      - `/projects/:projectId/tags`: list with test case counts, create (default colours rotate), rename/recolour, and Admin-only permanent delete. A duplicate name returns 409.
      - Test cases carry `tagIds`, set on create and update.
      - Test case create, update (a diff of status, name, "script changed", and tags added/removed) and delete are now activity-logged, closing ADR 0015's gap.
      - Web:
        - tag badges with palette tokens for light and dark mode
        - a searchable tag picker with create-on-type, in the test case detail and the New Test Case modal
        - a Tags filter on the tree ("any of"; dragging pauses while it's on)
        - the Manage tags dialog: rename and recolour for Contributors, delete for Admins after a confirmation stating how many test cases carry the tag
    - **Key decisions / discoveries:**
      - The picker sends the full tag set (one write path, one diff, one log entry) rather than per-tag add/remove routes.
      - shadcn `popover` and `command` were added (and `cmdk`).
      - `logTreeActivity` was widened to tags rather than adding a third logging helper.
      - Manage tags is an interim home: it moves to a project settings page later (Phase 11, ADR 0016).
      - Tags in the New Test Case modal were added at the user's request during implementation.
    - **Deferred / out of scope:** tags on bugs and the Executions/Bugs tag filters (Slice 2); tag badges in tree rows; tags in the demo seed; G5 (concurrent edits: the full-set write means last write wins).
  - **Slice 2: Tags on bugs + list filters ✅** (OpenSpec change `bug-tags-and-filters`, archived 2026-10-27)
    - **Built:**
      - Migration `0012_bug_tag`: adds `bug (id, workspace_id)` unique (it was missing) and `bug_tag` with forced RLS.
      - Bugs carry `tagIds`, set when filed (manually or from a run) and on edit; activity entries name the tags. Auto-created bugs start untagged.
      - Tags report `bugCount`; deleting a tag removes it from bugs and logs `{testCases, bugs}`.
      - The executions list reports the tags its test cases carry now.
      - Web:
        - the shared `TagsField` in the test case and bug details
        - a Tags field in New Bug / File bug
        - a Tags filter on the Bugs list (with Manage tags) and on the Executions list (without it)
        - Manage tags shows "N test cases · M bugs" and names both counts in the delete confirmation
    - **Key decisions / discoveries:**
      - Tag writes for test cases and bugs share `setItemTags` (`src/tags/tag-queries.ts`), which validates and writes only the difference.
      - Tag counts use scalar subqueries, since joining both carriers would multiply rows.
      - Executions match on their test cases' current tags, not tags at the time they ran.
      - A bug tag filter goes slightly beyond PRD §6.4.2's filter list, justified by §2.4 and ADR 0016.
    - **Deferred / out of scope:** historical (run-time) tags; tags on auto-created bugs; tags in the demo seed; moving Manage tags to a settings page (Phase 11).
  - **Slice 3: Projects ✅** (OpenSpec change `project-management`, archived 2026-10-27)
    - **Scope:** create projects (Workspace Owners), rename them (Project Admins, in Project Settings › General), a project switcher in the sidebar, delete with a 30-day trash and Restore from Workspace Settings › Projects, and workspace rename. The last live project can't be deleted. The active project is remembered on the server ([ADR 0017](adr/0017-active-project.md)).
    - **Deferred / out of scope:**
      - Workspace Settings › Members and Transfer Ownership; Project Members (Phase 3 remainder)
      - several workspaces per user and the workspace switcher (needs invitations)
      - New Project offering to add an environment, as an optional step (PRD §7.5 step 4); for now it asks only for a name
      - Environments and Execution Defaults on Project Settings
      - purging projects after 30 days in the trash (Phase 6)
  - G5 (concurrent edits) stays open.

## Phase 5 — Environments & Secrets ✅

Envelope encryption (ADR 0004), `KeyProvider` interface, reveal endpoint with same-transaction audit logging and rate limiting. Self-contained; get it right in isolation before executions reference it.

- **Covered by MVP Phase 5:** envelope encryption with a `KeyProvider`, environment + credential CRUD, audited and rate-limited reveal.
- **Remaining:** activity entries for environment and credential create, edit and delete (only reveals are logged today, against ADR 0007's every-mutation rule); key/DEK rotation and a KMS-backed `KeyProvider` (ADR 0004's explicit "later"); C1 (where the master key lives in production) and C2 (re-mask after reveal), decided with hosting.

## Phase 6 — Background jobs & real-time infra ⬜

- Graphile Worker queue ([ADR 0018](adr/0018-queue-library.md)), worker process, transactional enqueue (job in the same transaction as the triggering change, through the allow-listed enqueue wrapper).
- SSE stream endpoint + auth (fetch-based client), channels per execution and per user.
- Email job — unblocks Phase 3's invitations actually being delivered.

Needed before Phase 7, which depends on both the live-update channel and a proven job pattern.

- **Covered by the MVP:** nothing. The MVP polls (5 s while an execution is live, ADR 0005/0011) and has no jobs.
- **Remaining:** all of it. Swapping polling for SSE happens inside the existing data hooks, with no API contract change (roadmap-mvp.md "What's safe to cut").
  - **Slice 1: Queue and worker ✅** (OpenSpec change `background-jobs`, archived 2026-10-27)
    - **Scope:** Graphile Worker installed by the migrate step, a least-privilege `railgun_worker` role, the allow-listed `enqueue_job` wrapper (transactional enqueue), the first worker code in `apps/worker`, and the daily `trash_purge` job (ADR 0007: items in the trash over 30 days, removed in dependency order with one system activity entry each).
    - **Deferred / out of scope:**
      - SSE live updates (slice 2)
      - the email job (slice 3; needs A1)
      - enqueueing jobs from API routes (no route needs one yet)
      - deleting bug images on purge (attachments are Phase 8)
      - where the worker runs when deployed (E1–E2)

## Phase 7 — Test Execution lifecycle 🚧

The readme's three example tickets, in their documented order:

1. **DB** — `test_execution` / `test_run` schema: timer fields (`elapsed_ms_accumulated`, `last_resumed_at`), snapshot columns, RLS, constraints.
2. **Backend** — `run-all` / `pause` / `resume` as a transactional domain state machine; later, mark-ready / back-to-draft / cancel / completed / sign-off / try-again.
3. **Frontend** — execution header (live timer, lifecycle buttons by role, SSE subscription), runs table, run detail side panel, console drawer placeholder.

Resolves G6 (what makes an execution Completed) and G7 (Try Again semantics).

- **Covered by MVP Phases 7 and 9:** schema with timer and snapshot fields; Draft → Ready → In Progress ⇄ Paused → Completed → Done with role rules; manual outcomes; automatic completion and sign-off rules ([ADR 0012](adr/0012-execution-completion-and-sign-off.md), resolves G6); Executions screen with live timer (polling), run panel, environment panel; folder-tree picker and drag-and-drop run ordering.
- **Remaining:** Cancel; Try Again (G7); the execution activity panel; removing individual runs; "add to existing execution"; automated-mode placeholder; console drawer, step results, attempts, traceability graph; Executions dashboard and report downloads (Phases 9–10); curated locale/timezone lists (G9).

## Phase 8 — Bugs 🚧

Bug CRUD, image attachments (S3/R2 presigned, server-side validation per F8), linked run/test case snapshots, auto-create-on-failure (resolves G8). Depends on Executions (run linkage) and Secrets/storage.

- **Covered by MVP Phase 8:** bug CRUD, run/test case snapshots with failed step, auto-create on failure (G8) and status rules (G4), both in [ADR 0013](adr/0013-bug-lifecycle-and-auto-creation.md); Bugs screen and run-panel bug links.
- **Remaining:** image attachments (needs E3 and F8); tags on bugs (after Phase 4's tags); the bug activity panel; Bugs dashboard and PDF; unlinking or moving a bug between runs.

## Phase 9 — Activity feed UI, Trash UI, Dashboards ⬜

- Activity log backend has existed since Phase 2; build the filterable, paginated feed UI.
- Trash list/restore UI and the daily purge job (ADR 0007) land together.
- Health Score snapshot job (resolves B3) and the Overview dashboard KPIs/charts, since they aggregate everything built in prior phases.

- **Covered by the MVP:** the data only. Every mutation is activity-logged, and deleted items keep `deleted_at` / `deletion_id`. The demo seed (MVP Phase 9) gives realistic history to build these screens against. The MVP's optional stats readout was dropped.
- **Remaining:** all of it; needs Phase 6 (purge and snapshot jobs), B3, and the chart library (F6).

## Phase 10 — Reports (HTML / PDF) ⬜

Time-boxed spike first (D1: SVG chart fidelity, Japanese font coverage, PDF generation time for a large execution) before building. Shared data-assembly + chart module (ADR 0006), execution HTML/PDF, per-dashboard PDFs. Built last among "real" features since it's a pure consumer of every other entity's trash-exclusion and secret-exclusion rules.

- **Remaining:** all of it, starting with the D1 spike.

## Phase 11 — Project Members / Workspace Settings / Profile polish ⬜

Backend logic mostly exists from Phase 3; this is UI plus remaining edge cases (ownership transfer, "Former member" attribution).

- **Covered by the MVP:** the user menu (theme, sign out) only.
- **Remaining:** all of it, after the Phase 3 remainder. Includes moving **Manage tags** (built in Phase 4 Slice 1 as a dialog opened from the Test Cases tag filter) to a project settings page, rules unchanged ([ADR 0016](adr/0016-tag-management.md) revisit trigger).

## Phase 12 — Hardening ⬜

Disabled-state placeholders for roadmap items (§9: automated execution engine, test generation, code generation, integrations, AI/LLM config). Full end-to-end suite across the journeys in §10. Observability (F1), finalized CI/CD (F2).

- **Covered by the MVP:** CI runs lint, typecheck and tests; API e2e tests cover every endpoint.
- **Remaining:** everything listed above.

---

**Why this order minimizes rework:** RLS, the activity log, and authorization sit under every feature, so Phase 2–3 are non-negotiable first. The folder tree (hardest UI) is pulled into the simplest domain slice rather than deferred into a harder one. Executions — the slice with the most concurrency and timer-math risk — is built last among core features, once logging, auth, secrets, and jobs are already proven, matching the dependency order the project's own example tickets assume.
