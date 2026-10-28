# Design

## Context

See proposal.md for motivation. Current state: no application code exists; only docs, ADRs, and OpenSpec setup. Constraints: ADR 0001 (Next.js App Router, NestJS, Prisma, TypeScript end-to-end) and ADR 0010 (npm workspaces, `apps/*` + `packages/*`, no Turborepo/Nx). `finalproject-GR` is a subfolder of the actual git repository root (`railgun-qa-platform`), not the root itself — this already affected where `.claude/` and the OpenSpec store had to live, and affects one decision below (CI workflow placement) the same way.

## Goals / Non-Goals

**Goals:**
- Every workspace installs and runs from a single `npm install` at the repo root.
- Shared TypeScript and ESLint config applied consistently across workspaces, not copy-pasted per app.
- CI enforces install, lint, and typecheck on every push/PR, scoped to this project only.

**Non-Goals:**
- Docker/Postgres setup, DB roles (ADR 0003/0007) — next change.
- Any deploy configuration for Vercel/Railway/Render — hosting isn't decided yet (open questions E1/E2).
- Full CI/CD maturity (staging environments, migrations-on-deploy, secrets management, IaC) — that's open question F2 in full; this change only covers the minimal install/lint/typecheck slice `roadmap-mvp.md` Phase 1 scopes in.

## Decisions

- **TypeScript config sharing:** `packages/config` holds a base `tsconfig.base.json` and a flat ESLint config; each app/package has its own `tsconfig.json` with `"extends"` pointing at the base, so `tsc --noEmit` and `eslint` run per-workspace without duplicating rules. Alternative considered: a single root tsconfig with path aliases for everything — rejected, since per-workspace configs are what let CI typecheck each workspace independently and keep `apps/worker`'s eventual config free to diverge later without touching the others.
- **apps/api (NestJS):** hand-scaffolded minimal app (`main.ts`, one `HealthController` returning `{ status: 'ok' }` at `GET /health`, no guards). The ADR 0009 bearer-token guard is not added yet — the health-check spec explicitly requires no authentication, and there's no other endpoint yet to guard.
- **apps/web (Next.js):** App Router, one placeholder `page.tsx`. No data fetching, no Clerk wiring — nothing to fetch yet.
- **Placeholder workspaces (`apps/worker`, `packages/shared-types`, `packages/reporting`):** each gets a minimal `package.json` (name, version, `private: true`) plus one placeholder `index.ts` (e.g. `export {}`) rather than being left fully empty. Rationale: an npm workspace with no files at all can still break `tsc`/`eslint --ext .ts` expecting at least one matched file; a trivial real file avoids that without implying any actual behavior.
- **`prisma/schema.prisma`:** created with a valid minimal `datasource`/`generator` block and zero models, not a literally empty file — so `prisma format`/`prisma validate` succeed now and the next change can add models without also fixing a broken scaffold file.
- **CI provider and placement:** GitHub Actions (the repo is already GitHub-hosted, per existing PR/branch history) — not an ADR-level decision, just the obvious default for "install/lint/typecheck on push/PR" at this scope. Because `finalproject-GR` is a subfolder of the actual repo root, the workflow file must live at `railgun-qa-platform/.github/workflows/ci.yml` (GitHub only discovers workflows at the true repo root, same constraint that moved `.claude/` up earlier), scoped with `on.push.paths` / `on.pull_request.paths: ["finalproject-GR/**"]` and every job step using `working-directory: finalproject-GR`.

## Risks / Trade-offs

- **[Risk]** A repo-root GitHub Actions workflow with a missing or wrong path filter could run (or fail to run) on unrelated changes elsewhere in the shared course repo. → **Mitigation:** explicit `paths: ["finalproject-GR/**"]` filter and `working-directory: finalproject-GR` on every step; verify by making a trivial change outside `finalproject-GR/` and confirming the workflow does not trigger.
- **[Risk]** Placeholder workspaces with a trivial `index.ts` could be mistaken later for "already implemented," causing a future change to build around a stub instead of replacing it. → **Mitigation:** each placeholder file is a single `export {}` with no logic, and the proposal's "Not included" section names them explicitly as placeholders.
- **[Risk]** Node version drift between this dev machine (Node 24) and CI. → **Mitigation:** pin a minimum in the root `package.json` `engines` field and use the same version in the CI workflow's `actions/setup-node` step.

## Migration Plan

Greenfield — no existing code, data, or deployment to migrate. Rollback, if needed, is reverting the commit(s); nothing is deployed from this change.
