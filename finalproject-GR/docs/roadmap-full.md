# Implementation Roadmap — Full Product

Consolidated from [PRD.md](../PRD.md) and ADRs [0001](adr/0001-tech-stack.md)–[0007](adr/0007-activity-log-and-trash-purge.md), as of 2026-10-23. This is the build order for the complete product. See [roadmap-mvp.md](roadmap-mvp.md) for a narrower, faster path to a demoable slice that feeds into this same order without rework.

Ordering principle: anything cross-cutting that every later feature depends on (tenant isolation, the activity log, authorization) is built once, correctly, before any feature table — retrofitting these after features exist means auditing every query and mutation already shipped. Feature work then follows the domain's own dependency graph.

---

## Phase 0 — Lock in mechanism decisions

Settle before writing code, since changing these later touches everything built on top of them. See [open-questions.md](open-questions.md) for full context; decide each with an ADR per the project's usual workflow.

- **B1** — Prisma tenant-context mechanism (extension vs. explicit transaction helper).
- **A2** — Bearer token vs. cookie auth; SSE auth approach (native `EventSource` can't send `Authorization`).
- **E1 / E2 / E3** — Postgres host, compute host, object storage.
- **E4** — Region / data residency.
- **B2** — Queue library (pg-boss vs. Graphile Worker).

## Phase 1 — Monorepo scaffold

pnpm workspace per [readme §2.3](../readme-GR.md): `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker`; `packages/shared-types`, `packages/config`, `packages/reporting`; `prisma/`. Docker-compose for local Postgres with the two DB roles (migration role, `railgun_app`) from ADR 0003/0007. Minimal CI (lint, typecheck, test placeholder).

## Phase 2 — Database foundation

Built before any feature table — this is the layer every later phase depends on.

- Base migration: `workspace`, `user`, `project`, `membership`.
- RLS policy pattern + tenant-context helper, proven end-to-end on one table (resolves the B1 spike).
- `activity_entries` table, `ActivityLogger.log(tx, …)`, the immutability trigger, revoked `UPDATE`/`DELETE`/`TRUNCATE` privileges (ADR 0007).
- CI check: fails if a `workspace_id` table lacks a forced RLS policy.
- Cross-tenant test harness (workspace A vs. B), reused by every feature's tests from here on.

## Phase 3 — Auth & authorization skeleton

- Clerk integration (sign-up, sign-in, session) — ADR 0002.
- `users` mirror table; atomic user+workspace+Owner-membership transaction.
- Authorization policy module (NestJS guards): workspace role × project role matrix.
- Project membership CRUD.
- Invitation model + accept/decline/revoke/resend (§3.3).

## Phase 4 — Core domain CRUD: Project, Folders, Tags, Test Cases

First real vertical slice — no lifecycle state machine, no secrets, no real-time. Folder tree (3-level, drag/reorder via position keys) built here while low-stakes, since F6 flags it as one of the hardest UI pieces and nothing downstream depends on it yet. Resolves G2 (status transitions) and G3 (tag management).

## Phase 5 — Environments & Secrets

Envelope encryption (ADR 0004), `KeyProvider` interface, reveal endpoint with same-transaction audit logging and rate limiting. Self-contained; get it right in isolation before executions reference it.

## Phase 6 — Background jobs & real-time infra

- pg-boss queue, worker process, transactional enqueue (job in the same transaction as the triggering change).
- SSE stream endpoint + auth (fetch-based client), channels per execution and per user.
- Email job — unblocks Phase 3's invitations actually being delivered.

Needed before Phase 7, which depends on both the live-update channel and a proven job pattern.

## Phase 7 — Test Execution lifecycle

The readme's three example tickets, in their documented order:

1. **DB** — `test_execution` / `test_run` schema: timer fields (`elapsed_ms_accumulated`, `last_resumed_at`), snapshot columns, RLS, constraints.
2. **Backend** — `run-all` / `pause` / `resume` as a transactional domain state machine; later, mark-ready / back-to-draft / cancel / completed / sign-off / try-again.
3. **Frontend** — execution header (live timer, lifecycle buttons by role, SSE subscription), runs table, run detail side panel, console drawer placeholder.

Resolves G6 (what makes an execution Completed) and G7 (Try Again semantics).

## Phase 8 — Bugs

Bug CRUD, image attachments (S3/R2 presigned, server-side validation per F8), linked run/test case snapshots, auto-create-on-failure (resolves G8). Depends on Executions (run linkage) and Secrets/storage.

## Phase 9 — Activity feed UI, Trash UI, Dashboards

- Activity log backend has existed since Phase 2; build the filterable, paginated feed UI.
- Trash list/restore UI and the daily purge job (ADR 0007) land together.
- Health Score snapshot job (resolves B3) and the Overview dashboard KPIs/charts, since they aggregate everything built in prior phases.

## Phase 10 — Reports (HTML / PDF)

Time-boxed spike first (D1: SVG chart fidelity, Japanese font coverage, PDF generation time for a large execution) before building. Shared data-assembly + chart module (ADR 0006), execution HTML/PDF, per-dashboard PDFs. Built last among "real" features since it's a pure consumer of every other entity's trash-exclusion and secret-exclusion rules.

## Phase 11 — Project Members / Workspace Settings / Profile polish

Backend logic mostly exists from Phase 3; this is UI plus remaining edge cases (ownership transfer, "Former member" attribution).

## Phase 12 — Hardening

Disabled-state placeholders for roadmap items (§9: automated execution engine, test generation, code generation, integrations, AI/LLM config). Full end-to-end suite across the journeys in §10. Observability (F1), finalized CI/CD (F2).

---

**Why this order minimizes rework:** RLS, the activity log, and authorization sit under every feature, so Phase 2–3 are non-negotiable first. The folder tree (hardest UI) is pulled into the simplest domain slice rather than deferred into a harder one. Executions — the slice with the most concurrency and timer-math risk — is built last among core features, once logging, auth, secrets, and jobs are already proven, matching the dependency order the project's own example tickets assume.
