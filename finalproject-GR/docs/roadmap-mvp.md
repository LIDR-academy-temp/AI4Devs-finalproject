# Implementation Roadmap — MVP

A narrower path to a demoable slice of [PRD.md](../PRD.md) that feeds directly into [roadmap-full.md](roadmap-full.md) afterward. The guiding rule: cut **feature breadth**, never the structural decisions that are cheap to get right now and expensive to retrofit once data and endpoints exist. Everything cut here is additive later — a new column, table, or screen over data that was already shaped correctly — never a migration of live data or a security retrofit.

**Sequencing note (decided 2026-10-23):** every change through Phase 4's start has been backend + DB only — `apps/web` still has nothing but the placeholder page from `monorepo-scaffold`. Deliberately staying backend-first rather than pairing a frontend slice with each backend one: lower risk of UI rework while the API surface is still settling, at the cost of no demoable UI for longer. Revisit once there's enough backend surface for a real first screen, with a dedicated frontend-bootstrap slice (Clerk sign-in page, API client, routing) at that point — not before.

**How to read this file (for a fresh session with no prior conversation context):** each phase is ✅ Complete, 🚧 In progress, or ⬜ Not started. A completed or in-progress phase lists its slices individually — each slice maps to one archived (or active) OpenSpec change under `openspec/changes/archive/` (or `openspec/changes/` if still active), with its own **Built**, **Key decisions / discoveries**, and **Deferred / out of scope** so you don't need to open the change itself to know what happened. A phase with no slices listed yet has no OpenSpec change started — treat its one-line scope as a plan, not a record.

## What stays non-negotiable, even in the MVP

| Keep from day 1 | Why cutting it now costs more later |
|---|---|
| RLS + tenant context (ADR 0003) | Retrofitting means auditing every query ever written for a missing filter. |
| Activity log writes in the same transaction as every mutation (ADR 0007) | Retrofitting means history can't be reconstructed for anything that happened before the log existed. |
| Full workspace/project membership schema + policy module (ADR 0002) | Cheap to build in full now (two tables plus a guard function); auth bolted onto shipped endpoints is how access holes happen. |
| Envelope encryption for environment credentials (ADR 0004) | Plaintext-now, encrypt-later means migrating live data and rewriting every read/write path under time pressure. |
| Core execution state machine (Draft→Ready→InProgress→Paused→Completed→Done/Canceled) with snapshot-on-start | It's the product's central entity; a simplified lifecycle now means reconciling already-created rows later. |
| Soft-delete columns (`deleted_at`, `deleted_by`) on every top-level entity | Adding the column after rows exist, and auditing every existing read path to exclude them, is the exact retrofit this roadmap avoids. The Trash *screen* can still wait. |
| Full `test_execution` metadata columns (environment, browser, viewport, locale, timezone) | The columns cost nothing to add now; only their picker UIs are deferred, with sensible defaults hardcoded. |

## What's safe to cut

| Cut for MVP | Why it's safe | How it slots back in later |
|---|---|---|
| Folders, Tags | Additive relations (`folder_id` nullable FK, join table) | Add the column/table; no change to existing test case or execution rows. |
| Invitations + email | Membership table already models roles correctly; seed memberships directly for the demo | New `invitation` table + email job, bolted on top of existing membership logic. |
| SSE real-time | ADR 0005 already treats events as hints; state is always refetched from the API regardless | Swap the polling trigger for an SSE trigger inside the same data hook — no API contract change. |
| Background job queue (pg-boss), worker app | Nothing in MVP scope needs an async job yet | Add the queue + worker app when the first real job (email, report) appears; doesn't touch existing tables. |
| Bug image attachments / S3 | Bug text fields work standalone | Add an `image` child table + presigned upload later; doesn't change the bug row itself. |
| Dashboards, Health Score, Reports, Activity feed UI, Trash UI | Pure read-side consumers of data that's already correctly shaped | New endpoints/screens over existing, already-correct data — zero schema change. |
| Viewport/locale/timezone pickers, traceability graph, console drawer, Try Again, Cancel | UI/feature surface on top of an unchanged execution row | Add the form fields/screens; backend columns already exist. |

---

## Phase 0 — Minimal decisions ✅ Complete

**Scope:** only the open architecture questions the MVP actually touches before Phase 1 could start.

- **B1** (tenant-context mechanism) → resolved as [ADR 0008](adr/0008-tenant-context-implementation.md): explicit `withTenantContext` helper.
- **A2**, partial (bearer vs. cookie auth for plain requests; SSE auth moot since SSE is deferred) → resolved as [ADR 0009](adr/0009-api-authentication-transport.md): bearer token.
- **F4** (repo layout — surfaced right before Phase 1, not originally scoped here) → resolved as [ADR 0010](adr/0010-monorepo-layout.md): npm workspaces, not pnpm.
- Deferred entirely: **E1–E4** (hosting/region — local Docker Postgres is enough until an actual deploy is needed), **B2** (queue library — no queue yet).

## Phase 1 — Scaffold ✅ Complete

**OpenSpec change:** `monorepo-scaffold` (archived 2026-10-23)

- **Built:** same monorepo shape as the full roadmap (`apps/web`, `apps/api`, `prisma/`); `apps/worker` created empty as a placeholder so its eventual addition doesn't restructure the repo.
- **Key decisions / discoveries:** three dependency pins discovered mid-build, each a real ecosystem-breaking change in "latest," not a style choice (also documented in CLAUDE.md):
  - TypeScript pinned to `^6.0.3`, not `7.x` — `ts-jest`/`typescript-eslint` don't support 7 yet.
  - NestJS pinned to `^11.2.8`, not `12.x` — 12 is pure ESM and breaks Jest's CJS loader.
  - Prisma CLI pinned to `6.19.3`, not `7.x` — 7 removed `datasource.url` in favor of a mandatory driver-adapter model, which also touches ADR 0008 and needed a deliberate look, not a side-effect decision.

## Phase 2 — Database foundation ✅ Complete

**Scope:** base migration, RLS pattern proven on one table, `activity_entries` + `ActivityLogger.log()` wired into every mutation from the first one, RLS CI check, cross-tenant test harness. Identical to the full roadmap's Phase 2 — no shortcuts here.

### Slice 1: Tenant-isolated base schema ✅

- **OpenSpec change:** `tenant-base-schema` (archived 2026-10-23)
- **Built:** `workspace`/`user`/`workspace_membership`/`project`/`project_membership` tables, RLS forced on all five, `withTenantContext`, the RLS-coverage CI check, the reusable cross-tenant test harness.
- **Key decisions / discoveries:**
  - Resolved open-questions.md **A5**: `workspace_membership` needed a *dual* self-keyed + workspace-keyed RLS policy (combined by Postgres with OR), not the single self-keyed one ADR 0003 literally describes — otherwise an Admin couldn't see their own workspace's other members.
  - Local dev now requires Docker (`docker-compose.yml`, `db/init/`, `db/migrations/`); the compose Postgres runs on host port **5433**, not 5432, because this dev machine already has a native Postgres service bound to 5432.

### Slice 2: Activity log ✅

- **OpenSpec change:** `activity-log` (archived 2026-10-23)
- **Built:** `activity_entries` (no foreign keys, by design), `ActivityLogger.log`, keyset pagination.
- **Key decisions / discoveries:**
  - `railgun_migrator` deliberately lacks `CREATEROLE`, so the break-glass role is created in the superuser-run `db/init/01-roles.sql`, not a migration.
  - A `BEFORE` trigger only runs *after* Postgres's own privilege check passes, so the break-glass exception needed its own grant to mean anything.
  - Generalized the CI migration step from one hardcoded filename to `scripts/apply-migrations.js` (applies every `db/migrations/*.up.sql` in order) — the hardcoded version would have silently never run this change's migration.

## Phase 3 — Minimal auth ✅ Complete

**Scope:** Clerk sign-up/sign-in, atomic user+workspace+Owner-membership creation, full policy module (guards) even though only Owner/Contributor get exercised at first. Membership schema built in full (workspace + project roles) even though invitations are stubbed — seed a second collaborator directly for the demo.

### Slice 1: Identity and provisioning ✅

- **OpenSpec change:** `identity-provisioning` (archived 2026-10-23)
- **Built:** `ClerkAuthGuard` (bearer token verified via `@clerk/backend`'s `verifyToken`, not hand-rolled JWKS), atomic idempotent sign-up provisioning (`provisionIdentity`), `withUserContext`, `GET /me`.
- **Key decisions / discoveries:**
  - Surfaced a real schema gap: `tenant-base-schema`'s `user` table could only look itself up by internal id, never by `clerk_user_id` — exactly what first contact needs before that id is even known — so its RLS policy gained a second OR'd condition (migration `0003`), the same dual-policy pattern `workspace_membership` already used.
  - Corrected a design assumption mid-build: Clerk's `createTestingToken()` is a bot-detection bypass for browser E2E, not a way to mint a session JWT from pure backend code — so `GET /me`'s tests mock Clerk at the boundary (`verifyToken`, the Users-API profile fetch) while exercising real Postgres underneath.
- **Deferred / out of scope:** genuine verification against live Clerk JWKS is a flagged manual step once a Clerk account exists, not a blocking automated test — no Clerk account was set up at the time of this change.

### Slice 2: Authorization policy module ✅

- **OpenSpec change:** `project-authorization` (archived 2026-10-23)
- **Built:** identity resolution moved from `GET /me`'s handler into `ClerkAuthGuard` itself (role checks need it on every request, not just `/me`); `resolveEffectiveProjectRole` + `@RequireProjectRole`/`ProjectRoleGuard`; `GET /projects/:projectId` as the proving endpoint.
- **Key decisions / discoveries:**
  - Surfaced the *third* instance of the same recurring RLS shape (`project` and `project_membership` each needed a `FOR SELECT`-only policy to be discoverable before any workspace context is known, same as `workspace_membership` and `user` before them).
  - Fixed a real bug in already-archived code rather than leaving it in place: `provisionIdentity` assumed every existing user has an `Owner` membership somewhere, which crashed the first time a Collaborator-only user hit the real guard pipeline.

## Phase 4 — Test Cases (flat, no folders/tags) ✅ Complete

**Scope:** single project, flat list of test cases, Gherkin editor. Skip the folder tree and tag picker.

### Slice 1: Test case authoring ✅

- **OpenSpec change:** `test-case-authoring` (archived 2026-10-23)
- **Built:** `test_case` table (standard `workspace_id`-keyed RLS, no new policy shape needed — the first table in this project that didn't require one); `source_type` deliberately *not* stored, only derived from whether `gherkin_script` is set. `POST`/`GET`/`GET :id`/`PATCH` nested under `/projects/:projectId/test-cases` (Contributor+ to write, Viewer+ to read); `PATCH` covers name/script/status together per open-questions.md **G2**.
- **Key decisions / discoveries:**
  - Caught and avoided, during design rather than during apply, what would have been a *fourth* instance of the "needs a self-visible lookup before workspace context exists" RLS pattern: nesting every route under the project id (resolved first via the caller's own `project_membership`/`workspace_membership`, already RLS-visible from `project-authorization`) meant `test_case` itself never needed one.
  - One lint fix mid-build: the `resolveProjectWorkspaceId` helper was extracted into `src/common/resolve-project-workspace.ts` (added to the `no-restricted-imports` allow-list) rather than letting a controller import `PrismaClient` directly.

### Slice 2: Test case delete ✅

- **OpenSpec change:** `test-case-delete` (archived 2026-10-23)
- **Built:** `DELETE /projects/:projectId/test-cases/:testCaseId`, Admin-only, writing the `deleted_at`/`deleted_by` columns `test-case-authoring`'s migration added but never used.
- **Key decisions / discoveries:** caught during design, before any code was written — this is a soft delete implemented as an `UPDATE`, not a SQL `DELETE`, so the grant the proposal first assumed was needed (`DELETE` on `test_case`) was never actually necessary; the existing `UPDATE` grant already covers it.
- **Deferred / out of scope:** PRD §6.2.5's "refused while part of an active execution" rule — no `test_execution` concept exists yet (Phase 7, Execution lifecycle) — recorded as a gap for that phase to close, not a silent omission.

## Phase 5 — Environments & Secrets ✅ Complete

**Scope:** single environment per project in the UI is fine, but build the real encryption module and the reveal-plus-audit endpoint — this is the one feature area that isn't simplified, per the non-negotiable table above.

### Slice 1: Secrets encryption ✅

- **OpenSpec change:** `secrets-encryption` (archived 2026-10-24)
- **Built:** application-level envelope encryption (ADR 0004) — `workspace_dek` table (one wrapped data encryption key per workspace, standard tenant-scoped RLS, `SELECT, INSERT` grant only); `KeyProvider`/`EnvKeyProvider` reading `SECRETS_MASTER_KEY` (32-byte, base64, validated eagerly at construction — see CLAUDE.md's Environment variables section); `encrypt(prisma, workspaceId, secretId, plaintext)` / `decrypt(...)` as the only sanctioned path to a secret value, binding workspace id and secret id as AES-GCM authenticated additional data; a workspace's DEK is now created atomically inside `provisionIdentity`'s existing new-workspace transaction.
- **Key decisions / discoveries:**
  - Ciphertext is one opaque, self-describing string (`v<version>.<iv>.<tag>.<ciphertext>`, base64) so any future caller stores a secret in one `text` column — no per-field iv/tag columns to design.
  - `src/common/secrets-encryption.ts` added to the `PrismaClient` ESLint allow-list (same mechanism-module pattern as `tenant-context.ts`); `key-provider.ts` needed no such exception, since it never touches Prisma.
- **Deferred / out of scope:** no caller yet (no controller, no endpoint) — that's Slice 2. Actual key/DEK *rotation* (ADR 0004 #6) is out of scope; only the `master_key_version` column needed to make rotation possible later without a migration. KMS-backed `KeyProvider` is ADR 0004's explicit "later."

### Slice 2: Environment credentials ✅

- **OpenSpec change:** `environment-credentials` (archived 2026-10-24)
- **Built:** `environment` and `environment_credential` tables (standard tenant-scoped RLS, full CRUD grant including `DELETE` — environments are not part of PRD §2.11's Trash model, so deletion is a hard delete from the start, unlike `test_case`); `POST`/`GET`/`GET :id`/`PATCH`/`DELETE` under `/projects/:projectId/environments`, with credentials managed as part of their parent environment's body (one modal, matching PRD §6.7) rather than a separate resource; `POST .../credentials/:credentialId/reveal` — decrypts via `secrets-encryption`, writes an `ActivityLogger.log` entry (the first controller to actually call it), sets `Cache-Control: no-store`.
- **Key decisions / discoveries:**
  - Resolved a PRD/ADR tension explicitly rather than silently picking one: PRD §6.7 gates the whole Project Settings screen (including Environments) to Admin/Owner, while ADR 0004 #5 and its own context table say reveal is "Contributor or Admin." Read `GET` as `Viewer`+ and reveal as `Contributor`+ (matching ADR 0004 and PRD §6.3.3's stated Viewer visibility), write routes (`POST`/`PATCH`/`DELETE`) as `Admin`+ (matching PRD §6.7's screen-level restriction). This means today's only caller (no execution-panel UI exists yet) is Admin-only in practice, but the endpoint itself needs no rework when Phase 7's execution panel starts calling `GET`/`reveal` as a Contributor.
  - Rate limiting the reveal endpoint is an in-process fixed-window counter (10/user/60s), no new dependency — same posture as `secrets-encryption` reaching for Node's built-in `crypto` over installing a package for one endpoint. Per-instance only; revisit if the API ever runs as more than one process.
  - `secrets-encryption`'s `encrypt`/`decrypt` each manage their own transaction internally and can't be nested in the caller's own transaction, so a reveal is actually three app-level transactions (read ciphertext → decrypt → write audit log), not one literal DB transaction — still satisfies "no audit entry without a successful decrypt" by construction (the log write is only reached on success).
- **Deferred / out of scope:** the New Execution modal's environment picker and the execution-detail environment panel (PRD §6.3.3) — Phase 7, not started. G10 (what happens to a Draft/Ready execution's environment link when that environment is deleted) stays open until that phase.

## Phase 6 — Frontend bootstrap ✅ Complete

**Scope added 2026-10-24:** every phase through Phase 5 stayed backend+DB only on purpose (sequencing note above), deliberately deferring a dedicated frontend-bootstrap slice until there was enough backend surface for a real first screen. Phase 4 (Test Cases) and Phase 5 (Environments & Secrets) are now both built, so that point has arrived — and the MVP needs *something* a person can actually sign into and use before Execution lifecycle (renumbered to Phase 7 below) layers more backend-heavy work on top with still nothing demoable. Scope: Clerk sign-in/sign-up pages, a typed API client (bearer token from the Clerk session per ADR 0009), Next.js App Router routing, the app shell (sidebar nav per PRD §5 — project switcher only; workspace switcher UI can stay minimal since there's no multi-workspace journey to demo yet), and the Test Cases screen (flat list, matching Phase 4's backend scope — no folder tree or tags yet) wired to the real API. This is the smallest slice where someone can sign in and see real, live data, not just scaffolding.

### Slice 1: Frontend bootstrap ✅

- **OpenSpec change:** `frontend-bootstrap` (archived 2026-10-24)
- **Built:** `apps/web`'s first real code — `@clerk/nextjs` (`ClerkProvider`, hosted `<SignIn>`/`<SignUp>` under catch-all routes, session-based route protection in Next.js 16's `proxy.ts`); one shared API client attaching the Clerk session token as `Authorization: Bearer` (ADR 0009) and redirecting to `/sign-in` on `401`; a minimal app shell (workspace name, Test Cases link, sign-out); the Test Cases screen (flat list + detail: create, inline name edit, Gherkin autosave-on-blur, status change, delete), each control gated by the caller's project role, plus an access-denied state. Backend additions to unblock it: `provisionIdentity` also creates one default project in its existing new-workspace transaction, `GET /me` returns `projectId`, `GET /projects/:projectId` returns the caller's `role`, and the API enables CORS for `WEB_ORIGIN` (default `http://localhost:3000`).
- **Key decisions / discoveries:**
  - Surfaced while scoping the frontend: a signed-up user had zero projects and no endpoint to get one. Closed minimally (auto-created default project) by explicit decision, not full Project CRUD.
  - Next.js 16.4.3 is newer than training data — read the bundled docs first: `middleware.ts` is now `proxy.ts`, and the only documented test setup is Vitest + React Testing Library (no Jest guide), so data fetching stays in Client Components to remain unit-testable.
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is currently provided via a gitignored `apps/web/.env.local` from a temporary `npx clerk@latest init` dev app — a stopgap that must be replaced with a real Clerk account's keys before any graded demo (see CLAUDE.md).
- **Deferred / out of scope:** full Project CRUD and a project/workspace switcher (PRD §6.9/§7.5), the Onboarding Welcome screen (PRD §4.3), browser-driven E2E tests.

### Slice 2: Frontend UI stack migration ✅

- **OpenSpec change:** `frontend-ui-stack` (archived 2026-10-24)
- **Built:** moved Slice 1's screens onto the [ADR 0011](adr/0011-frontend-ui-stack.md) stack before any more screens get built on the ad hoc patterns: Tailwind CSS v4 + shadcn/ui primitives replace the plain CSS Modules; TanStack Query (`useQuery`/`useMutation`, query keys mirroring REST paths) replaces manual `useEffect`/`useState` fetching and the `refreshToken` counter; react-hook-form + zod for the Create Test Case form. Pure refactor (`skip_specs: true`) — every existing test ported 1:1 through a shared `renderWithProviders` helper.
- **Key decisions / discoveries:** the detail panel's save-on-blur edits were deliberately *not* moved to react-hook-form — that pattern doesn't map onto a submit-driven form library, and forcing it would have been a behavior change disguised as a refactor.
- **Deferred / out of scope:** polling (`refetchInterval`) — nothing to poll until Phase 7; modal conversion of the inline create form; folder-tree DnD, traceability graph and chart library stay open (open-questions.md F6).

## Phase 7 — Execution lifecycle ✅ Complete

**Scope:** run-all / pause / resume / manual outcome entry, snapshot-on-start, elapsed timer — built as in the full roadmap's Ticket 1–3 design (DB → backend state machine → frontend header). Frontend uses simple polling or a manual refresh button instead of SSE. Defer cancel, try-again, traceability graph, console drawer.

Sliced backend first, frontend second (same split as Phases 4/5 → 6).

### Slice 1: Execution lifecycle backend ✅

- **OpenSpec change:** `execution-lifecycle` (archived 2026-10-25)
- **Built:** migration `0008_test_execution` — `test_execution` (run conditions, status, timer fields `elapsed_ms_accumulated`/`last_resumed_at`, sign-off and soft-delete columns) and `test_run` (position, outcome, name/script snapshot columns), standard tenant RLS. `/projects/:projectId/executions` CRUD for Drafts (Contributor+ create/edit, Admin soft-delete) and one endpoint per lifecycle action (`mark-ready`, `back-to-draft`, `run-all`, `pause`, `resume`, `sign-off`) plus `PATCH .../runs/:runId` for outcomes. Every change writes an activity entry in the same transaction (category `Executions`). Test-case delete now refused (409) while in a Ready/InProgress/Paused execution — closes Phase 4's recorded gap.
- **Key decisions / discoveries:**
  - Decided before building and recorded in [ADR 0012](adr/0012-execution-completion-and-sign-off.md): automatic completion when the last Pending run gets an outcome; Sign Off blocked while any run is Needs Review; "active" = Ready/InProgress/Paused; only Ready test cases selectable (G6, G11). G10 resolved by the FK itself: `ON DELETE SET NULL (environment_id)` plus a stored `environment_name`, so the environment delete endpoint needed no change.
  - The state machine is a table (`execution-lifecycle.ts`) plus one conditional `UPDATE ... WHERE status = :from [AND precondition]` per action — concurrent conflicting requests resolve to exactly one 200 and one 409 without explicit locks (e2e-tested). Outcome writes are the exception: they lock the execution row so two testers recording the last two outcomes at once still complete it.
  - `ON DELETE SET NULL (column)` on composite tenant FKs needs Postgres ≥ 15 (noted in CLAUDE.md) — it keeps `workspace_id` intact when only the referenced id is cleared.
- **Deferred / out of scope:** all frontend work (Slice 2); Cancel and Try Again (G7 — `Canceled` already allowed by the status check constraint); Automated mode (422); acting on `auto_create_bug` (Phase 8, G8); step results, attempts, console drawer, traceability graph; list filtering/sorting beyond most-recently-updated first. Known edge: a Mark as Ready racing a concurrent test-case delete isn't serialized (each checks the other's state, neither locks) — negligible at human pace, not guarded.

### Slice 2: Executions screen ✅

- **OpenSpec change:** `executions-screen` (archived 2026-10-25)
- **Built:** `/executions` (PRD §6.3.1 split layout, selected execution in `?execution=<id>`): list with status/counts and client-side sort + filter (name, status, environment, browser); detail with live pause-aware timer (clock-skew corrected via the API's `now`), run conditions, 5-cell stats bar filtering the runs table, outcome-proportioned progress bar; lifecycle buttons by status × role, Run All mode dialog (Automated disabled), Admin delete with confirmation; run side panel with snapshot script and outcome control; environment panel with audited reveal; New/Edit Execution dialog (Ready test cases only, picking order = run order, environment pre-fills browser, common locale/timezone lists + "Other…"); "Run" on a Ready test case → dialog → lands on the new execution; Executions link in the shell. TanStack Query polling: detail every 5s and list every 10s, only while something is In Progress/Paused. No backend changes.
- **Key decisions / discoveries:**
  - `useApiClient` now throws a typed `ApiError { status, serverMessage }` so refusals show the API's reason (e.g. Sign Off blocked by Needs Review); a shared `ActionError` renders it. Also fixed in passing: a test-case delete refused by Slice 1's new 409 guard now shows why instead of failing silently.
  - Status × role → actions is a pure, exhaustively tested table mirroring the API's transition table; the API stays the authority.
  - Revealed passwords are held only in the panel's component state, never in the query cache.
  - `useSearchParams` needs a `<Suspense>` boundary in Next 16 (bundled docs); confirmed by a production build prerendering `/executions` as static. jsdom needed a `ResizeObserver` no-op polyfill for Radix Checkbox/Switch.
- **Deferred / out of scope:** UI polish — the manual check passed end to end, with controls and styling to be refined later; run reordering (deferred by decision; its drag-and-drop library will be shared with the folder tree — open-questions F6); execution activity panel (needs an activity read endpoint); Cancel / Try Again (G7); Automated mode; console drawer, traceability graph, step results, attempts, bug links; Executions dashboard and report downloads; curated locale/timezone lists (G9).

## Phase 8 — Bugs (text-only) ✅ Complete

**Scope:** file a bug from a failing run, link to the run/test case snapshot, status transitions. No image attachments, no S3.

One change for the whole phase (DB + API + Bugs screen + run panel), since it reuses every pattern Phase 7 built.

### Slice 1: Bug tracking ✅

- **OpenSpec change:** `bug-tracking` (archived 2026-10-25)
- **Built:** migration `0009_bug` (`bug` table, standard tenant RLS, soft delete; `test_run` gained `UNIQUE (id, workspace_id)` for the composite FK). `/projects/:projectId/bugs` — file (optionally from a run of a started execution, snapshot copied server-side from the run, optional failed step that must be a script line), list (`?testRunId=`), detail, PATCH (title/severity/status/description/steps, any status → any), `link-run` (unlinked bugs only, 409 otherwise), Admin soft delete; every change activity-logged with old → new values. Auto-create: setting a run to Fail on an execution with the toggle on creates an Open/Medium bug in the same transaction. Web: `/bugs` (list with sort/filter, detail with inline edits, linked run → `/executions?execution=…`, linked test case → `/test-cases?testCase=…`, snapshot with the failed step highlighted, New Bug form, Admin delete); the run panel lists linked bugs with File bug (failed-step picker) and Link existing bug; Bugs nav link.
- **Key decisions / discoveries:**
  - [ADR 0013](adr/0013-bug-lifecycle-and-auto-creation.md) records G4 (any → any status, Contributor+) and G8 (auto-create on Fail), plus: the snapshot always comes from the run, the failed step is a trimmed script line, one run per bug.
  - "At most one auto-created bug per run" is a **partial unique index** (`… WHERE auto_created AND deleted_at IS NULL`) with `INSERT … ON CONFLICT DO NOTHING`, so Fail → Pass → Fail and concurrent Fails can't duplicate it — e2e-tested both ways.
  - Bugs store `reporter_display_name`, because `"user"` rows are only readable by their owner (same reason the activity log stores actor names).
  - The Test Cases screen now accepts `?testCase=<id>`, which needed the same `<Suspense>` wrapper as the other screens.
  - Running the API test suite still needs `SECRETS_MASTER_KEY` exported in the shell: tests deliberately don't load `apps/api/.env`.
- **Deferred / out of scope:** image attachments and object storage (F8); tags on bugs; bug activity history panel (needs an activity read endpoint); Bugs dashboard and PDF; unlinking or moving a bug between runs; issue-tracker integrations; "Former member" reporter display.

## Phase 9 — Demo polish ✅ Complete

**Scope:** seed script for a believable dataset, basic loading/error states, and optionally a single on-the-fly (unstored) stats readout to gesture at the Overview journey without building the Health Score job. *(2026-10-25: the stats readout was dropped, by user decision; Slice 4 is the seed only.)*

**Scope added 2026-10-25:** after manual testing of Phases 6–8, the UI needs to be closer to end-use ready, and two PRD features deferred earlier (folder tree, drag-and-drop ordering) are pulled into the MVP. Decisions: a neutral, dense look with one electric-indigo accent, semantic outcome colors, Geist fonts, light + dark mode; a collapsible sidebar with an icon per item; folders nest **up to 4 levels** (PRD §2.3 amended from 3); run reordering stays **Draft-only** (PRD §6.3.3); drag-and-drop library chosen with the folder tree (open-questions F6). Sliced as:

### Slice 1: Look & feel ✅

- **OpenSpec change:** `look-and-feel` (archived 2026-10-25)
- **Built:** electric-indigo accent plus semantic tokens (`--pass/--fail/--review/--pending`, `--sev-*`, `--live`) in `globals.css`, light + dark; Geist Mono; Light/Dark/System theme via `next-themes` (user menu, no flash); Clerk sign-in/up themed from the same CSS variables (no extra Clerk theme package). Shell rebuilt on shadcn's `sidebar`: icon per screen, collapsible to an icon rail with tooltips, state in the `sidebar_state` cookie (1 year), mobile sheet, project header, user menu (avatar, theme, Sign out). `PageHeader` on every screen; Test Cases moved to the split-pane layout. Shared `ListSkeleton`/`DetailSkeleton`/`EmptyState`/`ErrorState` (Retry) across the three screens. Toasts (`sonner`, via `lib/notify.ts`) on every successful create/save/status change/delete/link/reveal; failures stay inline. `GherkinView` (line numbers + keyword highlighting, failed-step band) replaces the plain script blocks. In Progress badges get a pulsing live dot.
- **Key decisions / discoveries:**
  - Reading the sidebar cookie in the `(app)` layout makes `/test-cases`, `/executions`, `/bugs` render on demand instead of prerendered — accepted, since all three need a signed-in session anyway.
  - Clerk 7's appearance variables accept CSS variables, so the hosted sign-in pages follow `.dark` and the accent with no `@clerk/themes`.
  - The primary "New …" action stays in each list's header rather than the page header (avoids duplicate buttons / test churn; recorded in design.md).
  - jsdom needed a `matchMedia` no-op polyfill (sidebar's `useIsMobile`, next-themes).
- **Deferred / out of scope:** resizable split panes; highlighting inside the editable Gherkin textarea; workspace/project switchers; nav links to screens that don't exist yet; mobile layouts beyond the sidebar sheet; visual regression tests.

### Slice 2: Folder tree ✅

- **OpenSpec change:** `folder-tree` (archived 2026-10-25)
- **Built:** migration `0010_folder` — `folder` (self-referencing composite FK, case-insensitive unique sibling names via partial index, `position_key text COLLATE "C"`, soft delete + `deletion_id`) and `test_case.folder_id` / `position_key` / `deletion_id` (existing rows backfilled in creation order). `/projects/:projectId/folders` (list, create, rename, `move`, `delete-impact`, Admin subtree delete guarded by Ready/InProgress/Paused executions) and `POST /test-cases/:id/move`; test cases created into a folder and listed with `folderId`, `positionKey`, `lastOutcome`; activity entries for every tree change. Web: `TestCaseTree` (folders first, outcome dots, name/status filter, expansion remembered per browser, ⋯ and right-click actions menus, dnd-kit drag and drop with before/after/into zones by pointer and keyboard), folder summary with counts, breadcrumbs, Move to… / rename / delete dialogs, destination folder picker in New Test Case.
- **Key decisions / discoveries:**
  - [ADR 0014](adr/0014-drag-and-drop-and-ordering.md): dnd-kit; **in-house** base-36 fractional keys (`keyBetween`, randomized-tested) because `fractional-indexing` is ESM-only and the API is CommonJS under Jest; clients send intent (parent + `afterId`), the server computes keys.
  - Draft executions don't block test case or folder deletion — PRD §2.11/§6.2.5 amended to match ADR 0012, whose wrong "the PRD didn't define it" note got a dated correction.
  - The `0010` backfill had to lift `FORCE ROW LEVEL SECURITY` on `test_case` for the cross-tenant update (forced RLS applies to the owner too, and migrations have no tenant context), then restore it in the same transaction.
  - Moves aren't optimistic (the client can't compute server keys): wait + refetch; a refused move never changes the tree. Dragging pauses while filtering.
  - After manual testing: rows don't shift while dragging (a drop line / folder highlight shows the target, a floating label follows the pointer); the drop-inside highlight is folders-only; empty folders have no expand control.
- **Deferred / out of scope:** Trash UI / restore (deleted items keep `deletion_id`); tags and tag filter; Test Cases dashboard; health banners and run history; "add to existing execution"; multi-select moves; keyboard nesting by drag (Move to… covers it).

### Slice 3: Drag-and-drop ordering ✅

- **OpenSpec change:** `drag-and-drop-ordering` (archived 2026-10-25)
- **Built:** `POST /executions/:id/runs/:runId/move { afterRunId }`. It works on Draft executions only and is Contributor+. It renumbers positions 1..n under the execution row lock, keeps run ids, and logs `test_execution.runs_reordered`, except for moves that change nothing. The New/Edit Execution form now has two panels:
  - A folder-tree picker with a name filter. Draft and Deprecated test cases are greyed out with their status. Checking a folder picks every Ready test case under it in tree order, and folders show checked, partly checked, or unchecked.
  - A Selected panel that sets the run order. It reorders by pointer or keyboard drag and has a remove button per item.

  A Draft's runs table has drag handles, which reorder runs and show the new order immediately, restoring it if the server refuses. Shared helpers are in `lib/sortable-list.ts` and `test/keyboard-drag.ts`.
- **Key decisions / discoveries:**
  - Runs keep integer positions, renumbered on each move, rather than fractional keys (dated note in [ADR 0014](adr/0014-drag-and-drop-and-ordering.md)). A dedicated move endpoint replaced reusing `PATCH testCaseIds`, which would recreate every run on each drag.
  - After manual testing:
    - The Selected panel behaves like the folder tree: rows stay put, a drop line marks the target, and a label follows the pointer.
    - The whole picker row (checkbox, icon, name) toggles. The shadcn Checkbox's enlarged hit area overlapped the expand arrow, so it's turned off in the picker.
    - Folders with no Ready test case stay disabled and say so.
  - `DragOverlay` inside a Radix Dialog must be portalled to `<body>`. The dialog's CSS transform makes `position: fixed` relative to the dialog, which put the overlay off-screen and stretched the dialog's scroll area.
  - The shadcn Checkbox now shows a minus icon when partly checked.
- **Deferred / out of scope:** removing individual runs from the runs table; "add to existing execution"; tags in the picker; dragging from the tree into the Selected panel; multi-select drag; Try Again's subset picker. The runs table still shifts rows live while dragging, unlike the Selected panel.

### Slice 4: Seed data ✅

- **OpenSpec change:** `demo-seed` (archived 2026-10-25)
- **Built:** `npm run db:seed -w apps/api -- --email <address>` (or `--clerk-user-id <id>`) fills a signed-in user's default project with "ShopFlow", a demo e-commerce app:
  - two teammates who can't sign in (Contributor Priya Shah, Viewer Marco Rossi)
  - a 4-level folder tree with 33 Gherkin test cases (25 Ready, 5 Draft, 3 Deprecated)
  - 2 environments with 3 encrypted credentials
  - 6 executions, one per status (Draft through Done), with 44 runs and consistent timers, snapshots, and sign-off
  - 8 bugs, six of them filed from failed runs (one auto-created)
  - 72 backdated activity entries over three weeks

  It is additive, idempotent (a marker folder with a deterministic id; a rerun writes nothing) and all-or-nothing (one tenant transaction, one multi-row insert per table). The old Acme/Globex fixture seed is removed. The dataset is plain data in `src/seed/demo-dataset.ts`, and the writer is `src/seed/demo-seed.ts`.
- **Key decisions / discoveries:**
  - The optional stats readout was dropped (user decision).
  - RLS on `"user"` blocks finding a user by email, so the CLI asks the Clerk Backend API for the Clerk id and then follows `provisionIdentity`'s read path. That lookup lives in `src/common/seed-target.ts`, added to ADR 0008's lint exception list, since it sets `app.clerk_user_id` and `app.user_id` itself.
  - Activity is inserted directly because `log()` always stamps `now()`. Only actions the API logs get entries: test case and environment creation are not logged by the API today.
  - Single-statement batches keep the transaction well inside Prisma's 5s interactive-transaction timeout.
  - The dev Clerk app's account is `demo+clerk_test@example.com`, not the developer's own email.
- **Deferred / out of scope:** stats / Overview readout; a reset or unseed command (impossible to do cleanly with the append-only activity log); seeding several projects; creating Clerk accounts; activity entries for test case and environment creation (an API logging gap).
---

This covers PRD §10's key journeys — onboarding, writing test cases, running a suite, investigating a bug — short of "Reviewing Project Health" (§10.5), which is deferred to the full roadmap's Phase 9. Every deferred item above is a pure addition on top of data already shaped correctly, so continuing into [roadmap-full.md](roadmap-full.md) from Phase 4 onward requires no rework of what the MVP built. (Phase numbers here are this document's own, independent of roadmap-full.md's — each roadmap orders its phases to fit its own build order, per CLAUDE.md's "Two roadmaps, one target architecture.")
