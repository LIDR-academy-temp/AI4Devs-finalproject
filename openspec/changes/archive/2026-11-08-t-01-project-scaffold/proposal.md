# T-01 Repository, project scaffold, and CI

**Issue:** [#27](https://github.com/ojordan0/AI4Devs-finalproject/issues/27) · **Ticket:** [docs/08-WORK-TICKETS.md, T-01](../../../docs/08-WORK-TICKETS.md#t-01-repository-project-scaffold-and-ci) · **Branch:** `chore/t-01-project-scaffold`

**Covers:** Epic E-08. Stories: none. Functional requirements: none. Business rules: none. Acceptance criteria: none; this is foundation work, verified by the ticket's "Done when" statement.

## Why

The repository holds documentation and no application, so no other ticket can start: T-02 and T-05 depend directly on this one, and all the others depend on it through them. D2 is due on November 19, 2026, and every later pull request needs a repeatable local setup and automatic checks from the start.

## What Changes

- **Application scaffold:** Next.js (App Router) with TypeScript in strict mode, added around the existing documentation, following [Architecture §2](../../../docs/03-ARCHITECTURE.md#2-project-structure), with one placeholder page.
- **Dependencies:** the milestone 1 packages from [Architecture §1.6](../../../docs/03-ARCHITECTURE.md#16-dependencies), installed with npm and pinned by `package-lock.json`.
- **Quality tools:** ESLint and Prettier; Vitest with the coverage report and Playwright with Chromium and WebKit, each with a passing example test.
- **Local environment:** `docker-compose.yml` with Postgres, `.env.example` with every variable in [Infrastructure §7](../../../docs/06-INFRASTRUCTURE.md#7-configuration), and the npm scripts `setup`, `dev`, `lint`, `db:migrate`, `db:seed`, and the test commands in [Security and testing §2.5](../../../docs/07-SECURITY-AND-TESTING.md#25-running-tests-locally-and-in-ci).
- **Pull request checks:** a GitHub Actions workflow running linting, type checks, unit and integration tests with the coverage target, browser tests, and the documentation link check, plus a dependency audit and Dependabot.
- **Branch protection on `main`:** a pull request and passing checks are required, with no bypass for administrators.
- **Claude Code hooks:** checks before a pull request is opened, and ESLint after each file edit.
- **Documents updated first**, because reviewing this ticket found three places where they can't be followed as written:
  - **Review requirement.** `ojordan0` is the repository's only collaborator, and GitHub doesn't count an author's approval, so a required approval can't be met without a bypass that also skips failing checks. Branch protection requires passing checks with no approvals; the adversarial review stays a required step of the pull request process ([Infrastructure §3](../../../docs/06-INFRASTRUCTURE.md#3-deployment-process), T-01).
  - **Dependency audit.** [Security and testing §1](../../../docs/07-SECURITY-AND-TESTING.md#1-security) promises an audit step and automated update pull requests, but no ticket owned them. T-01 now owns them ([Infrastructure §3](../../../docs/06-INFRASTRUCTURE.md#3-deployment-process), T-01).
  - **Versions.** [Architecture §1.6](../../../docs/03-ARCHITECTURE.md#16-dependencies) asks for the current stable release of each package. TypeScript 7 stops ESLint from starting, and ESLint 10 is outside the peer ranges of the plugins `eslint-config-next` uses. Both get an exception, like the existing Zod note.

## Capabilities

### New Capabilities

- `developer-environment`: setting up, running, and testing the app from a fresh clone with one setup command.
- `pull-request-checks`: the automatic checks on every pull request, the rules that block merging into `main`, and automated dependency updates.
- `agent-guardrails`: the checks that stop Claude Code from opening a pull request while linting, type checks, or tests fail, and that show it lint errors after each edit.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Non-goals

| Left out | Owner |
| --- | --- |
| Database tables, the first real migration, and seed data | T-02 |
| The check that the generated OpenAPI document is up to date, and its generator | T-03 |
| Better Auth configuration and the development-only sign-in | T-04 |
| Tailwind CSS and shadcn/ui setup, next-intl setup, the translation key test, and the app shell (the packages are installed here but not configured) | T-05 |
| Vercel, Neon, `vercel.json`, production variables, and the setup checklist | T-06 |
| Backup workflow | Not assigned to a ticket in milestone 1; not addressed here |
| Checking external links in the documentation | Not planned; the link check covers links and anchors inside the repository |

## Impact

- **New at the repository root:** `src/`, `tests/`, `.github/`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `drizzle.config.ts`, `docker-compose.yml`, `.env.example`, `.nvmrc`, and the ESLint, Prettier, Vitest, and Playwright configuration.
- **New scripts:** `scripts/setup.mjs`, `scripts/seed.ts`, `scripts/check-doc-links.ts`, and `scripts/doc-links.ts`.
- **Changed tooling:** `.claude/settings.json`, new hook scripts and tests in `.claude/hooks/`, and `.gitignore`.
- **Changed documents:** `docs/03-ARCHITECTURE.md`, `docs/06-INFRASTRUCTURE.md`, `docs/07-SECURITY-AND-TESTING.md`, `docs/08-WORK-TICKETS.md`, `readme.md`, `CLAUDE.md`, and `prompts.md`.
- **GitHub settings:** a repository ruleset protecting `main`, changed only at the owner's request.
- **Developer machines:** Node.js must be the current LTS release (26). Machines on an older version need to upgrade.
- **No effect** on the product's behavior, the API, or the data model. None exists yet.
