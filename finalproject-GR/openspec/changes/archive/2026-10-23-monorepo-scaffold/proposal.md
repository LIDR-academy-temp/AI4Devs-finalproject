# Proposal

## Why

No application code exists yet (per CLAUDE.md, "Current state: pre-scaffold"). Every feature phase in roadmap-mvp.md and roadmap-full.md depends on the repository having the structure ADR 0010 decided — three independently deployable apps sharing types and a database schema. Scaffolding this now, before any domain code, avoids restructuring later: every subsequent change assumes `apps/*` and `packages/*` already exist and resolve through npm workspaces.

## What Changes

- Create the npm-workspaces monorepo structure decided in ADR 0010: `apps/web`, `apps/api`, `apps/worker`, `packages/shared-types`, `packages/config`, `packages/reporting`, `prisma/`.
- `apps/web`: a minimal Next.js (App Router) app with a placeholder home page. No domain UI.
- `apps/api`: a minimal NestJS app exposing one `GET /health` endpoint. No domain modules.
- `apps/worker`: created as an empty placeholder directory only (per ADR 0010 and roadmap-mvp.md Phase 1) — no job-processing code yet.
- `packages/shared-types`, `packages/reporting`: created as empty placeholder packages (per ADR 0010) — populated when the first feature or report needs them.
- `packages/config`: shared ESLint and TypeScript base configuration, consumed by the other workspaces.
- `prisma/schema.prisma`: created empty, ready for the first migration (next change).
- Root `package.json` declares the `workspaces` field (`apps/*`, `packages/*`) and holds only shared dev tooling — no runtime dependency at the root (ADR 0010).
- CI pipeline: install, lint, and typecheck across all workspaces on every push/PR. No test step yet, since there is nothing to test.

**Not included** (explicitly out of scope for this change):
- The local Postgres docker-compose setup and its two DB roles (ADR 0003 / ADR 0007) — next proposal.
- Any Prisma schema content, any NestJS module beyond the health check, any frontend page beyond the placeholder.
- Turborepo or Nx — ADR 0010 rules this out for now.

## Capabilities

### New Capabilities
- `api-health-check`: the API exposes a liveness/readiness endpoint (`GET /health`) that returns a success response when the service is up. This is the one piece of this change that is genuinely new, observable system behavior; everything else below is repository scaffolding and tooling, not a product capability.

### Modified Capabilities
_None — no existing specs yet (first change in this project)._

## Impact

- **Affected code:** entire repository structure (currently empty of application code). Creates `apps/web`, `apps/api`, `apps/worker`, `packages/shared-types`, `packages/config`, `packages/reporting`, `prisma/`, plus root `package.json` and CI configuration.
- **Dependencies:** Next.js, NestJS, and their minimal runtime dependencies (per ADR 0001); no database driver, ORM client usage, or auth SDK wired in yet — those arrive with later changes.
- **Systems:** establishes the CI pipeline (install/lint/typecheck) that every subsequent change will run against.
