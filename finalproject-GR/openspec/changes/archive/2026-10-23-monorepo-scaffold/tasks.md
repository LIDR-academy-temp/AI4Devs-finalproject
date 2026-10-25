# Tasks

## 1. Root workspace & shared config

- [x] 1.1 Create `finalproject-GR/package.json` with `"workspaces": ["apps/*", "packages/*"]`, an `engines.node` minimum, root-level aggregate scripts (`lint`, `typecheck` via `--workspaces --if-present`), and shared devDependencies (typescript, eslint) — verify `npm install` from `finalproject-GR` completes with zero errors
- [x] 1.2 Create `packages/config` with a `tsconfig.base.json` (strict mode) and a shared ESLint flat config — verify `npx tsc --showConfig -p packages/config/tsconfig.base.json` parses without error
- [x] 1.3 Confirm `finalproject-GR/.gitignore` already covers `node_modules/`, `dist/`, `build/`, `.next/` (it does per the existing file) and add any missing entry — verify `git status` shows no build artifacts tracked after running a build in step 2+

## 2. apps/api (NestJS) with health-check

- [x] 2.1 Scaffold `apps/api/package.json` with minimal NestJS dependencies and a `tsconfig.json` extending `packages/config/tsconfig.base.json` — verify `npm install` resolves the new workspace with no errors
- [x] 2.2 Implement `main.ts`, `app.module.ts`, and a `HealthController` exposing `GET /health` returning `{ status: 'ok' }`, per `specs/api-health-check/spec.md` — verify `npm run dev -w apps/api` boots and `curl localhost:<port>/health` returns HTTP 200 with that body
- [x] 2.3 Add a Jest/Supertest test asserting `GET /health` returns 200 with no `Authorization` header set, per the spec's "requires no authentication" scenario — verify the test passes via `npm test -w apps/api`

## 3. apps/web (Next.js) placeholder

- [x] 3.1 Scaffold `apps/web/package.json` with minimal Next.js dependencies, a `tsconfig.json` extending the shared base, and an App Router structure (`app/layout.tsx`, `app/page.tsx` placeholder) — verify `npm run dev -w apps/web` boots and the root route returns HTTP 200 HTML containing the placeholder content
- [x] 3.2 Verify `npm run typecheck -w apps/web` passes with zero errors

## 4. Placeholder workspaces (apps/worker, packages/shared-types, packages/reporting)

- [x] 4.1 Create `apps/worker` with a `package.json` (`private: true`), a placeholder `index.ts` (`export {}`), and a `tsconfig.json` extending the shared base — verify `npm run typecheck -w apps/worker` passes with zero errors
- [x] 4.2 Create `packages/shared-types` the same way — verify `npm run typecheck -w packages/shared-types` passes
- [x] 4.3 Create `packages/reporting` the same way — verify `npm run typecheck -w packages/reporting` passes

## 5. Prisma scaffold

- [x] 5.1 Create `prisma/schema.prisma` with a `datasource` (`postgresql`, reading `DATABASE_URL`) and a `generator` (`prisma-client-js`) block and zero models — verify `npx prisma validate` and `npx prisma format --check` both succeed

## 6. CI pipeline

- [x] 6.1 Create `railgun-qa-platform/.github/workflows/ci.yml` (at the true git repo root, since GitHub only discovers workflows there) scoped with `on.push.paths` / `on.pull_request.paths: ["finalproject-GR/**"]`, using `actions/setup-node` pinned to the `engines.node` value from 1.1, running `npm install`, `npm run lint --workspaces --if-present`, and `npm run typecheck --workspaces --if-present` with every step's `working-directory: finalproject-GR` — verify by opening a PR that touches only a file under `finalproject-GR/` and confirming the workflow runs and passes
- [x] 6.2 Verify the workflow does **not** trigger on a change outside `finalproject-GR/` (e.g. a commit touching only the repo-root `readme.md`) — verify via a real push/PR limited to that path, or by reviewing the path filter against GitHub's documented matching behavior if a live push isn't practical during this change; record which method was used. **Method used:** reviewed the parsed YAML's `on.push.paths`/`on.pull_request.paths: ["finalproject-GR/**"]` against GitHub's documented path-filter matching (no live push performed — opening a PR is a visible action left for the user to trigger deliberately).

## 7. Documentation

- [x] 7.1 Update `finalproject-GR/CLAUDE.md`'s "Current state" section to list the real commands that now exist (`npm install`, `npm run dev -w apps/web`, `npm run dev -w apps/api`, `npm run lint --workspaces`, `npm run typecheck --workspaces`) in place of "no build, lint, or test command yet" — verify by running each documented command exactly as written and confirming it behaves as described

## Workflow follow-up

- Archive the change once reviewed.
- Verify the archived result.
