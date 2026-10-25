# ADR 0010: Monorepo Layout

**Status:** Accepted
**Date:** 2026-10-23
**Amends:** [ADR 0001](0001-tech-stack.md) (adds the repository-layout layer ADR 0001 did not cover; resolves open question F4)

## Context

[ADR 0001](0001-tech-stack.md) committed to a TypeScript-end-to-end stack across three independently deployable processes, per its own architecture diagram: a Next.js frontend (Vercel), and a NestJS API plus a worker process sharing one compute host, all sharing one Prisma schema and one set of domain types. It never specified how the repository itself is organized to make that sharing real rather than aspirational — that gap is open question F4 ("the readme assumes a pnpm monorepo; the ADR does not record it").

A monorepo sketch existed only in the course submission write-up (`readme-GR.md` §2.3), which [CLAUDE.md](../../CLAUDE.md) now treats as a deliverable, not a decision — anything from it that matters for implementation needs its own ADR before it's treated as settled. This ADR is that decision.

## Decision

**npm workspaces**, with `apps/*` for independently deployable processes and `packages/*` for shared, non-deployable code:

```
finalproject-GR/
├── apps/
│   ├── web/              # Next.js (App Router) — deployed to Vercel
│   ├── api/               # NestJS — deployed to the compute host
│   └── worker/            # Postgres-queue job runner — compute host; created empty now
│                          # (roadmap-mvp.md Phase 1), gains code when the first job is built
├── packages/
│   ├── shared-types/       # DTOs/types shared by web, api, and worker
│   ├── reporting/          # shared chart/report data assembly (ADR 0006)
│   └── config/             # shared eslint/tsconfig base
├── prisma/
│   └── schema.prisma        # single schema, read by api and worker
├── docs/
├── openspec/
├── PRD.md
└── CLAUDE.md
```

- The root `package.json` declares `"workspaces": ["apps/*", "packages/*"]` and holds only repo-wide dev tooling (eslint, TypeScript, test runner config) — no runtime dependency lives at the root. Every runtime dependency is declared in the specific app or package that needs it.
- Cross-package references work through npm's native workspace resolution: a workspace listed as a dependency by name resolves to the sibling package automatically, no publishing step required.
- No build-orchestration tool (Turborepo, Nx) for now. Per-workspace `npm run <script>` (or `--workspaces` across all of them) is enough at three apps and three shared packages.

## Rationale

- **Makes ADR 0001's "one type system from DB to UI" literal, not aspirational.** `packages/shared-types` is the one place Prisma-generated types and DTOs live; `apps/api` defines them, `apps/web` and `apps/worker` consume them, with no second definition and no published package in between.
- **Zero new tooling.** The repo already has a plain npm `package-lock.json`, not a pnpm one. npm workspaces are built into the package manager already in use — nothing new to install, learn, or document for a course deliverable.
- **Sized to the project.** Three deployable apps and three shared packages sit well within what npm workspaces handle natively (hoisting, workspace-scoped installs). A build-graph caching tool solves a problem — slow, uncached CI across many packages — this project doesn't have yet.
- **Low-surprise convention.** The `apps/` vs. `packages/` split (deployable vs. shared-library) is a standard pattern in this stack, so the structure is self-explanatory without needing a bespoke onboarding doc.

## Alternatives Considered

- **pnpm workspaces.** Faster installs and stricter phantom-dependency isolation. Rejected for now: would mean dropping the existing npm `package-lock.json` and introducing a new package manager for a benefit that doesn't bite at this scale. Revisit if npm's looser hoisting causes an actual phantom-dependency bug.
- **npm workspaces + Turborepo/Nx.** Adds task-graph caching and affected-based builds. Rejected as premature: the CI pipeline itself is still undecided (open question F2), so there's no measured build-time problem to solve yet. Revisit once CI is designed and a real bottleneck appears.
- **Separate repositories per app** (web/api/worker each on their own). Rejected outright: it directly undoes ADR 0001's own rationale for a single TypeScript stack ("one type system from DB to UI, lowers context-switching") — splitting repos would force either duplicating types or publishing an internal package just to share them, reintroducing the overhead ADR 0001 chose this stack to avoid. Also incompatible with the course's single-repository submission format.
- **A single Next.js app with API routes, no separate NestJS app.** Already rejected by ADR 0001 itself ("NestJS was chosen over... a Next.js-only monolith"); not reopened here.

## Consequences

- `apps/worker` is created empty in Phase 1 scaffolding and gains its first real dependencies only when the first background job is built (full roadmap Phase 6).
- Vercel's build needs standard monorepo configuration (root directory `apps/web`, install at the repo root so workspace resolution runs) — a routine deploy setting, not a structural risk.
- This resolves open question F4.

## Revisit Triggers

- CI build time across the three apps becomes a measured problem — reconsider Turborepo/Nx then (ties to F2).
- npm's hoisting causes a real phantom-dependency bug — reconsider pnpm then.
