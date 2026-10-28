# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

This folder (`finalproject-GR`) is Gonzalo Roland's final project submission for an AI-driven software engineering course. It is **not** the repository root — the parent `railgun-qa-platform/` repo holds other students' submissions as sibling folders; everything relevant to this project lives under `finalproject-GR/`.

The product being designed and built is the **QA Automation Platform**: a multi-tenant B2B web app for QA teams to author test cases (Gherkin or manual), organize them in folders, run them in batched "executions" with a defined lifecycle, track bugs tied to failing runs, and report on project health via dashboards and exports. Full behavioral spec: [PRD.md](PRD.md).

## Current state: monorepo scaffolded, no domain code yet

The repo structure decided in [ADR 0010](docs/adr/0010-monorepo-layout.md) exists: `apps/web` (Next.js placeholder), `apps/api` (NestJS, one `GET /health` endpoint), `apps/worker` and `packages/shared-types`/`packages/reporting` (empty placeholders), `packages/config` (shared tsconfig/ESLint base), and `prisma/schema.prisma` (datasource + generator only, zero models). No domain tables, no Postgres/Docker setup yet (ADR 0003/0007 — next change), no auth wiring. CI runs install/lint/typecheck on every push/PR touching this folder, via `railgun-qa-platform/.github/workflows/ci.yml` (see the OpenSpec section below for why it lives at the repo root).

**Commands** (run from `finalproject-GR/`):
- `npm install` — installs every workspace.
- `npm run dev` — starts the API and web dev servers and the background worker together in one terminal (`scripts/dev.js`, output prefixed `[api]`/`[web]`/`[worker]`; Ctrl+C stops all three). Postgres must already be up (`docker compose up -d`).
- `npm run dev -w apps/web` — Next.js dev server (`localhost:3000`).
- `npm run dev -w apps/api` — NestJS dev server (`localhost:3001`; `GET /health`).
- `npm run dev -w apps/worker` — the background worker alone (Graphile Worker, [ADR 0018](docs/adr/0018-queue-library.md)): runs queued jobs and the daily `trash_purge` (03:00 UTC). It connects as `railgun_worker`.
- `npm test -w apps/api` — Jest/Supertest tests for the API.
- `npm test -w apps/worker` — Jest tests for the worker, against the docker-compose database. `graphile-worker` is ESM-only, so the script runs Jest through `node --experimental-vm-modules` (call `npm test`, not `npx jest`).
- `npm run test -w apps/web` — Vitest/React Testing Library tests for the web app.
- `npm run lint` / `npm run typecheck` — the root scripts already wrap `--workspaces --if-present`, so this runs across every workspace that defines the script and skips the placeholders that don't; append `-w <workspace>` (e.g. `npm run lint -w apps/api`) to scope to one. Running `npm run lint --workspaces` directly (bypassing the root script) fails hard on any workspace without a `lint` script — use the plain `npm run lint` form.

**Environment variables.** `apps/api` loads `apps/api/.env` if present (`src/load-env.ts`, Node's built-in `process.loadEnvFile` — no dotenv dependency); `apps/web` loads `apps/web/.env.local` (Next.js). Both files are gitignored; `apps/api/.env.example` lists the API's variables. Anything already set in the shell still wins. Tests never load these files. One-time setup: copy `.env.example` to `.env`, paste the same `CLERK_SECRET_KEY` as `apps/web/.env.local`, and generate a `SECRETS_MASTER_KEY` once — then keep it, since workspace data keys (and every stored environment password) are wrapped with it.
- `DATABASE_URL` — optional; falls back to the docker-compose Postgres (`postgresql://railgun_app:app_dev_password@localhost:5433/railgun`).
- `CLERK_SECRET_KEY` — required for every authenticated API request (ADR 0002) — without it the API rejects every token with 401 and warns at startup. Currently the temporary dev Clerk app's key (see `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` below), set in both `apps/api/.env` and `apps/web/.env.local`. As of [frontend-bootstrap](docs/roadmap-mvp.md), also read server-side by `apps/web`'s `proxy.ts` (Clerk's route protection).
- `SECRETS_MASTER_KEY` — **required** as of [secrets-encryption](docs/adr/0004-secrets-storage.md): a 32-byte key, base64-encoded (e.g. `openssl rand -base64 32`). Unlike `DATABASE_URL`, this has no fallback and fails fast at first use if missing or the wrong length (`EnvKeyProvider`, `src/common/key-provider.ts`) — deliberate, since a silent default for a master encryption key would be a real vulnerability, not a dev convenience. Sign-up (`provisionIdentity`) now provisions a workspace DEK and needs this set to succeed.
- `WEB_ORIGIN` — optional; the CORS origin `apps/api` allows, defaults to `http://localhost:3000` (`main.ts`). Only matters for local dev — production CORS origin is a deployment-time decision (open-questions.md E1–E4), not yet made.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — **required** for `apps/web` as of [frontend-bootstrap](docs/roadmap-mvp.md): Clerk's publishable key, needs a real Clerk account to exist (same posture as `CLERK_SECRET_KEY` above). **Currently set via `apps/web/.env.local`** (gitignored, not committed), provisioned by `npx clerk@latest init` — a *temporary* dev-only Clerk app with no real account behind it. This is a stopgap so the app is demoable now; replace it with a real Clerk account's keys before any real/graded demo, since this temporary app and its keys can be revoked or expire without notice. Without a valid key, Clerk's hosted `<SignIn>`/`<SignUp>` components and `ClerkProvider` have nothing to talk to.
- `NEXT_PUBLIC_API_URL` — optional for `apps/web`; the base URL its API client targets, defaults to `http://localhost:3001` (matching `apps/api`'s own default port).
- `WORKER_DATABASE_URL` — optional for `apps/worker`; defaults to the docker-compose Postgres as `railgun_worker` (`postgresql://railgun_worker:worker_dev_password@localhost:5433/railgun`). Never point it at the migrator role.

**Database roles and the job queue.** Four roles, all created by `db/init/` on a fresh volume:
- `railgun_migrator` owns everything and runs migrations;
- `railgun_app` is the API's role: no ownership, no RLS bypass;
- `railgun_worker` is the worker's role: same posture, plus only what migration `0014` grants it (the queue schema, delete and select on the trashable tables, insert into the activity log, workspace ids);
- `railgun_breakglass` is inert.

The API enqueues jobs only through `enqueue_job(task, payload, run_at)` inside its own transaction; the task name must be on that function's allow-list. `npm run db:migrate` installs Graphile Worker's `graphile_worker` schema (`scripts/install-job-queue.js`) before the SQL files. **A dev database created before `background-jobs` needs a one-time catch-up**:
1. `DATABASE_URL=postgresql://postgres:postgres@localhost:5433/railgun node scripts/apply-sql.js db/init/02-worker-role.sql`
2. `DATABASE_URL=postgresql://railgun_migrator:migrator_dev_password@localhost:5433/railgun node scripts/install-job-queue.js`
3. Apply `db/migrations/0014_background_jobs.up.sql` as `railgun_migrator`, the same way as any other new migration on an existing database.

**Demo data.** `npm run db:seed -w apps/api -- --email <you@…>` (or `-- --clerk-user-id <id>`) fills that user's default project with the ShopFlow demo dataset: a folder tree of test cases, executions in every status, bugs, two teammates, and backdated history ([demo-seed](openspec/specs/demo-seed/spec.md)). The user must have signed in once. The seed is additive and idempotent: it never changes existing rows, and a rerun writes nothing. It needs `SECRETS_MASTER_KEY` (credentials are encrypted) and, for `--email`, `CLERK_SECRET_KEY`, both read from `apps/api/.env`.

**Dependency version notes** (discovered scaffolding this — all pinned below their breaking "latest" for ecosystem compatibility, not an oversight):
- **TypeScript pinned to `^6.0.3`**, not the current `7.x` — `ts-jest` and `typescript-eslint` both still declare a `<7`/`<6.1.0` peer range.
- **NestJS pinned to `^11.2.8`**, not `12.x` — NestJS 12 ships `"type": "module"` across every `@nestjs/*` package, which breaks Jest's CommonJS module loading outright.
- **Prisma CLI pinned to `6.19.3`**, not the current `7.x`/`8.0.0-rc` — Prisma 7 removed the `url` property from the `datasource` block entirely (connection config moves to `prisma.config.ts` plus a mandatory driver `adapter`), which has direct implications for [ADR 0008](docs/adr/0008-tenant-context-implementation.md)'s `withTenantContext` design and needs a deliberate evaluation, not a drive-by fix. Revisit when the DB foundation change starts.
- **`@hookform/resolvers` pinned to `5.9.2`**, not the current `6.0.0` — `6.0.0`'s own optional peer chain is internally broken (`@typeschema/effect` requires `effect@^3.6.8` while `@hookform/resolvers` itself wants `effect@^4.0.0`), which fails `npm install` outright even though `effect`/zod are unrelated to what this project actually uses. `5.9.2` is the last version before that break and is the first to explicitly declare `zod: "^3.25.0 || ^4.0.0"` as a peer, matching the `zod@^4` actually installed.
- **Postgres must be ≥ 15** (docker-compose runs 16) — as of `execution-lifecycle`, migration `0008` uses `ON DELETE SET NULL (column)` on composite tenant FKs, which clears only the referenced id and keeps `workspace_id` intact. Keep this in mind when hosting (open-questions.md E1–E4) is chosen.
- **Node must be ≥ 22.18** as of `background-jobs`: `graphile-worker` 0.18 requires it, and CI runs Node 22. It is ESM-only and is loaded from CommonJS code through Node's `require(esm)`.

## OpenSpec setup — note the folder-hierarchy split

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) (`openspec` CLI) for spec-driven change proposals, via the `/opsx:*` slash commands. Because `finalproject-GR` is **not** the VS Code workspace root (`railgun-qa-platform` is), two things live in different places on purpose:

- **`.claude/commands/` and `.claude/skills/`** live at the repo root (`railgun-qa-platform/.claude/`), one level above this folder — Claude Code only discovers project slash commands relative to the opened workspace root, not arbitrary subfolders, so they have to be there to show up.
- **`openspec/` (the actual specs/changes data) and `openspec/config.yaml`** live here, in `finalproject-GR/openspec/`, where they semantically belong. The `openspec` CLI only searches *upward* from the current directory for the nearest `openspec/` root, so running it from the repo root (or anywhere outside this folder) fails with "No OpenSpec root found" unless you point it at this project explicitly.
- This project is registered as **store id `railgun-qa-gr`** (`openspec store list --json` shows it) so it resolves from anywhere: pass `--store railgun-qa-gr` on `openspec` commands run with a cwd outside `finalproject-GR`, or just `cd finalproject-GR` first. The `/opsx:*` command workflows already check for a registered store when `openspec context` fails from the current directory — this is why the store exists, not just a convenience.

## Working documents — read these, don't duplicate them

- [PRD.md](PRD.md) — full product spec (entities, roles, screens, flows, reports). The source of truth for *what* the product does.
- [docs/adr/](docs/adr/) — Architecture Decision Records, numbered sequentially, each amending a prior one when it narrows or resolves something that ADR left open. Read 0001 first; its header lists every ADR that amends it.
- [docs/open-questions.md](docs/open-questions.md) — everything still undecided, grouped by what it blocks, with a resolved-items table at the top pointing to the ADR that settled each one.
- [docs/roadmap-full.md](docs/roadmap-full.md) and [docs/roadmap-mvp.md](docs/roadmap-mvp.md) — the two implementation orders under consideration (see below).

**Not implementation references:** [readme-GR.md](readme-GR.md) and [prompts-GR.md](prompts-GR.md) are course submission deliverables — the write-up and prompt log the assignment requires — not working specs for this build. Anything in them that matters for implementation (the monorepo sketch in readme §2.3, the example tickets in §6, etc.) is illustrative for the submission, not a decision; treat it as settled only once it also exists as a PRD requirement or an ADR.

**Decision workflow for this project:** architecture/PRD questions are resolved one at a time — present options plus a recommendation, get a decision, then record it as a new ADR (amending the ADR whose Open Items raised the question) and update `open-questions.md`'s resolved table. Don't silently decide something that `open-questions.md` lists as open; surface it the same way.

## Two roadmaps, one target architecture

[docs/roadmap-mvp.md](docs/roadmap-mvp.md) and [docs/roadmap-full.md](docs/roadmap-full.md) describe two build orders for the *same* architecture, not two different designs. The MVP roadmap cuts feature breadth (folders, tags, invitations, SSE, the job queue, image attachments, dashboards/reports) because those are additive later — new columns, tables, or screens over data already shaped correctly. It never cuts anything structural (RLS/tenant context, same-transaction activity logging, the full membership/authorization schema, envelope encryption for secrets, soft-delete columns, the execution state machine) because retrofitting those after features and data exist is the expensive path. When implementing, check which roadmap is currently active before assuming a feature is in scope.

## Architecture (target — not yet built)

Settled in [ADR 0001](docs/adr/0001-tech-stack.md) and amended by ADRs 0002–0011:

- **Monorepo ([ADR 0010](docs/adr/0010-monorepo-layout.md)):** npm workspaces (not pnpm — the repo already runs plain npm), `apps/web` (Next.js, App Router), `apps/api` (NestJS), `apps/worker` (created empty in Phase 1, gains code only when the first background job is built), `packages/shared-types`, `packages/reporting` (shared chart/report data assembly), `packages/config`. `prisma/schema.prisma` for the DB schema. No Turborepo/Nx yet — plain per-workspace npm scripts are enough at this app count.
- **Database:** PostgreSQL, single shared schema. Every tenant table carries `workspace_id`, denormalized onto deep children. No Redis in v1.
- **Tenant isolation ([ADR 0003](docs/adr/0003-tenant-isolation.md), mechanism in [ADR 0008](docs/adr/0008-tenant-context-implementation.md)):** two layers — Postgres RLS (policy: `workspace_id = current_setting('app.workspace_id')`, forced, fails closed with zero rows if unset) as the backstop, plus an explicit `withTenantContext(prisma, workspaceId, fn)` transaction helper that every request/job must go through. Services are injected a `Prisma.TransactionClient`, never the bare `PrismaClient`. This is the single most important invariant in the codebase — a missing tenant scope is the highest-impact failure mode this product has.
- **Auth ([ADR 0002](docs/adr/0002-authentication-and-workspace-membership.md)):** Clerk for identity only (sign-up, sign-in, sessions, password reset, email verification). Workspaces, project membership, roles, and invitations live entirely in our own Postgres — Clerk Organizations are explicitly *not* used, because invitations in this product are project-scoped and need semantics (accept/decline, 7-day expiry, resend to an existing member) Clerk's org-invite model doesn't support.
- **API transport ([ADR 0009](docs/adr/0009-api-authentication-transport.md)):** bearer token (Clerk session JWT, verified against Clerk's JWKS), not cookies — required because the frontend (Vercel, random per-PR preview URLs) and API (Railway/Render) are on different hosts.
- **Authorization:** two-level RBAC — workspace role (Owner/Collaborator) is a ceiling, project role (Admin/Contributor/Viewer) governs day-to-day access. One NestJS guard/policy module evaluates both; Owners are implicit Project Admin everywhere.
- **Secrets ([ADR 0004](docs/adr/0004-secrets-storage.md)):** application-level envelope encryption (AES-256-GCM), per-workspace data encryption key, wrapped by a master key (hosting secret store now, cloud KMS later via a swappable `KeyProvider`). Environment credentials are recoverable and revealable (audited); integration tokens and AI keys are write-only.
- **Real-time ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md)):** server-sent events, one multiplexed stream per tab. Events carry only identifiers — they're hints, not state; the client always refetches. Fan-out via Postgres `LISTEN/NOTIFY`.
- **Background jobs ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md)):** a Postgres-backed queue (Graphile Worker, [ADR 0018](docs/adr/0018-queue-library.md)), enqueued in the same transaction as the triggering change. The execution lifecycle itself is a domain state machine persisted in the DB — the queue never owns lifecycle state.
- **Activity log ([ADR 0007](docs/adr/0007-activity-log-and-trash-purge.md)):** one append-only `activity_entries` table, no foreign keys (so it survives purges), written via `ActivityLogger.log(tx, …)` in the *same transaction* as the change it records. Immutability is enforced by revoked `UPDATE`/`DELETE` privileges plus a trigger, not by convention.
- **Trash / soft delete ([ADR 0007](docs/adr/0007-activity-log-and-trash-purge.md)):** top-level entities carry `deleted_at`/`deleted_by`; a daily job purges anything deleted >30 days, in dependency order, without ever touching the activity log.
- **Reports ([ADR 0006](docs/adr/0006-report-generation.md)):** generated by the worker from one allow-listed data object (no secrets, no trashed items). HTML export via a server-side template; PDF via pdfmake (no headless browser). Charts drawn once as SVG and shared between both outputs.
- **Frontend UI ([ADR 0011](docs/adr/0011-frontend-ui-stack.md)):** Tailwind CSS v4 (Next.js's current, Turbopack-supported path) with CSS Modules as the fallback; shadcn/ui (Radix primitives, copied into the repo via its CLI, not an opaque dependency) for modals/dropdowns/pickers; TanStack Query for data fetching, caching, mutation-driven invalidation, and (Phase 7) polling instead of SSE; react-hook-form + zod for forms. Folder-tree drag-and-drop, the traceability graph, and a chart library are deliberately still undecided — each gets picked when the phase that actually builds it starts (open-questions.md F6).

## Key domain concept to keep straight

The **Test Execution lifecycle** (`Draft → Ready → InProgress ⇄ Paused → Completed → Done/Canceled`, PRD §6.3.4) is the architectural center of gravity. It's a transactional domain state machine, not queue-driven ([ADR 0005](docs/adr/0005-realtime-and-background-jobs-v1.md): "the queue never owns lifecycle state"). Two behavioral requirements from PRD §6.3.3 drive its design: the elapsed timer counts only while `InProgress` (paused time excluded), and each run snapshots its test case's name and Gherkin script at the moment the execution starts, so later edits or deletes don't change run history. Neither the PRD nor any ADR fixes the exact schema for this yet — that's design work for whichever OpenSpec change implements it.
