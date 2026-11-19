# Design

## Context

The repository holds documentation, design mockups, OpenSpec configuration, one Python hook, and one Python script. It has no `package.json`, no application, and no CI. `main` has no branch protection. See [proposal.md](proposal.md) for motivation and scope, and the specs for required behavior.

T-01 has no acceptance criteria, so scenarios are named after the behavior they verify, and no test carries an `AC-` prefix.

Constraints checked while planning, on November 8, 2026:

| Finding | How it was checked | Effect |
| --- | --- | --- |
| TypeScript 7.0.2 stops ESLint from starting: `typescript-eslint does not support TS 7.0` | Scratch install and run | TypeScript 6.0.3, the newest version in the supported range |
| `eslint-plugin-jsx-a11y`, `eslint-plugin-react`, and `eslint-plugin-import` allow ESLint up to 9 | `npm view` | ESLint 9.39.5, which installs with no peer conflicts |
| Vitest exits 0 with a threshold set and no files in the coverage scope | Scratch run | The 80% target can be set now, before any service exists |
| npm 11 holds back install scripts that aren't approved. `esbuild`, `@swc/core`, and `@parcel/watcher` are affected, and everything works without them | Installing and running the tools | None are approved; `npm ci` prints a warning listing them |
| The current Node.js LTS is 26; the development machine runs 22 | nodejs.org release index, `node -v` | `.nvmrc` pins 26, and the developer upgrades |
| `protect-branches.py` blocks `gh api` writes to `/branches/` | Reading the hook | Claude Code can't change a classic protection rule; rulesets changes happen only at the owner's request |
| `ojordan0` is the only collaborator | GitHub API | No approval is required; see decision 7 |

## Goals / Non-Goals

**Goals:**

- Every scenario in the specs passes, and T-01's "Done when" statement is demonstrated on a real fresh clone.
- T-02 to T-05 can start by adding code, without reworking commands or the workflow.

**Non-Goals:**

- Empty folders for later tickets. Git doesn't track them, and each ticket creates the folders it needs in the places [Architecture §2](../../../docs/03-ARCHITECTURE.md#2-project-structure) names.
- Rules that enforce layering automatically. Nothing in the ticket asks for them.
- Tests in CI for the Python hooks. Infrastructure §3 step 2 doesn't list them, and they run locally, like the existing branch-protection tests.

## Decisions

### 1. Write the scaffold by hand, not with `create-next-app`

`create-next-app` refuses or complicates a non-empty directory and adds defaults this project doesn't want, such as Tailwind setup that T-05 owns. A generated copy in a scratch folder can serve as a reference for current configuration, and only the files the project needs are written.

### 2. Application layout

- `src/app/layout.tsx` sets the document language, and `src/app/(public)/page.tsx` is the placeholder; T-04 replaces it with the Welcome screen.
- `src/i18n/es.json` and `en.json` hold the placeholder's few strings. The page imports the Spanish file directly, as a plain JSON import. T-05 replaces that with next-intl.
- `src/server/db/` holds the Drizzle client, an empty schema file, and the migrations folder.
- `@/*` maps to `src/*`. Vitest resolves the alias through its own configuration, so no extra package is needed.

`next dev` writes its own agent instructions into `AGENTS.md`, which is a link to `CLAUDE.md`, when it detects an AI coding agent. `next.config.ts` sets `agentRules: false`, Next's documented switch, so the project's rules stay hand-written and running the app never changes a tracked file.

Tailwind, shadcn/ui, and next-intl are installed but not configured, because T-05 owns that. The `shadcn` command is not installed as a dependency, and T-05 runs it. If its output needs a package outside §1.6, T-05 updates that section first.

### 3. Setup is a Node script with no dependencies

`scripts/setup.mjs` runs before `node_modules` exists, so it can use only Node's built-in modules. A shell script wouldn't work on Windows, which [Architecture §3](../../../docs/03-ARCHITECTURE.md#3-technical-decisions) gives as the reason for using npm scripts.

Steps, in order, each safe to repeat:

1. Check the Node.js version and that Docker is running; stop with a clear message otherwise.
2. Copy `.env.example` to `.env` if it's missing. This makes one command enough on a fresh clone, and the readme's copy step becomes unnecessary.
3. `npm ci`.
4. `docker compose up -d --wait`, which relies on a health check in `docker-compose.yml`.
5. Create `comproparati_test` if it's missing, using `pg`, which is now installed. An init script in the Docker image was rejected: it only runs on an empty volume, so an existing volume would never get the database.
6. `npm run db:migrate`, then `npm run db:seed`.
7. `npx playwright install chromium webkit`.

### 4. One database URL, with the test URL derived from it

[Infrastructure §7](../../../docs/06-INFRASTRUCTURE.md#7-configuration) lists only `DATABASE_URL`, and the spec requires `.env.example` to match that list. Tests replace the database name in that URL with `comproparati_test`, and refuse any host other than `localhost` or `127.0.0.1`, enforcing the "no production data" rule in [Security and testing §2.3](../../../docs/07-SECURITY-AND-TESTING.md#23-test-data-and-isolation).

Browser tests also use `comproparati_test`. The document names that database only for integration tests, but browser tests reseed their database, and using the development database would wipe a developer's data. The two never run at once: CI runs them in separate jobs with their own containers, and locally a developer runs one command at a time. `docs/07-SECURITY-AND-TESTING.md` §2.3 records this.

Environment files are read with Node's `process.loadEnvFile()`, because `dotenv` isn't in §1.6. Next.js reads `.env` by itself.

### 5. Test setup

- **Vitest** has two projects. `unit` covers `tests/unit` and has no database. `integration` covers `tests/integration`, runs one file at a time, and has a global setup that derives the URL, applies migrations, and fails with a clear message if Postgres is down.
- **Example tests:** a unit test of the URL derivation and its host check, an integration test that runs a query and confirms it reached `comproparati_test`, and a browser test that opens the placeholder page and runs axe with the WCAG 2.1 AA tags. Each proves its wiring end to end. `--passWithNoTests` was rejected because it would hide a misconfigured project.
- **Lint strictness:** `next`'s ESLint configuration reports accessibility and image rules as warnings, and ESLint exits 0 on warnings. `npm run lint` and the lint hook pass `--max-warnings 0`, so breaking any rule fails.
- **Test database guard:** the Postgres driver lets the `host` connection parameter override the address's host, so the guard refuses it as well as a remote host. It also refuses `hostaddr` and `service`, which the driver ignores but libpq tools such as `psql` read.
- **Coverage** includes only `src/server/services/**`, with a line threshold of 80.
- **Playwright** has two projects: Chromium on a phone-size device and WebKit on an iPhone. Its `webServer` runs migrations, the seed, `next build`, and `next start` against the test database. Retries are 1 in CI and 0 locally.

### 6. Empty migrations must succeed

`drizzle-kit migrate` expects a migrations journal, which doesn't exist until the first migration does. The repository includes an empty `meta/_journal.json`, which the current drizzle-kit accepts, so `db:migrate` succeeds until T-02. `scripts/seed.ts` connects and exits.

### 7. Branch protection

The rule on `main` uses these settings:

| Setting | Value | Reason |
| --- | --- | --- |
| Require a pull request | Yes, 0 approvals | The only collaborator can't approve their own pull request |
| Required checks | Every job in the workflow | Includes the audit |
| Require branches to be up to date | Yes | One ticket merges at a time, so the cost is low, and each merge is tested against the latest `main` |
| Enforce for administrators | Yes | Without it, the owner's bypass would also skip failing checks |
| Force pushes and deletion | Not allowed | Matches the branch rules in `CLAUDE.md` |

Requiring one approval with administrators exempt was rejected, because every merge would need the bypass, which leaves no check enforced. Delivery branches aren't covered: they receive pushes from `main`, as `CLAUDE.md` describes.

These settings live in the repository ruleset `require-pull-request`, limited to the default branch with no bypass actors. A second ruleset, `block-deletion-&-force-pushes`, covers deletion. Rulesets replace the classic branch protection rule this design first planned, because the owner had already created them.

The ruleset must not target all branches: a ticket branch couldn't receive commits, and a delivery branch couldn't receive `main`.

Keeping up with `main` adds a small cost: the existing hook blocks `update_pull_request_branch`, so an out-of-date pull request is updated by merging `main` into the ticket branch locally, or with GitHub's button.

### 8. CI workflow

One file, `.github/workflows/ci.yml`, triggered by `pull_request` into `main`, with `contents: read` permission and no secrets. Separate jobs give separate results, and their names become the required checks: `lint`, `typecheck`, `test`, `e2e`, `doc-links`, and `audit`.

There are no path filters, because a filtered required check stays pending and blocks the merge. Node comes from `.nvmrc`, and dependencies are installed with `npm ci` using the setup action's npm cache. `test` and `e2e` each have their own Postgres service container, using the same image as `docker-compose.yml`, and set `DATABASE_URL` directly, with placeholder credentials. Secrets required by later tickets are added by those tickets. T-03 adds the OpenAPI job, and adds it to the required checks.

`audit` runs `npm audit --audit-level=high`. Security §1's example, "a vulnerable package version fails the build", doesn't set a level. High filters out the low-severity advisories that often have no fix and would block unrelated pull requests. Dependabot checks npm and GitHub Actions weekly.

### 9. Link check is a project script

`scripts/check-doc-links.ts` runs through `tsx`, with its logic in `scripts/doc-links.ts` so the unit test can import it. It needs no network, and reads the Markdown files at the repository root, in `docs/`, and in `openspec/`. It checks relative links and their anchors, using GitHub's heading rules, and skips code blocks and external URLs. `docs/ai-conversations/` and `openspec/changes/archive/` are excluded because they hold history, and archiving a change moves it without updating its relative links. It runs locally as `npm run check:links`, which `docs/07-SECURITY-AND-TESTING.md` §2.5 lists.

Alternatives rejected: a third-party link checker would add a tool outside §1.6, and checking external URLs would make a required check depend on outside websites. A unit test with small fixtures covers the heading rules, since a wrong rule would either fail good links or pass bad ones.

### 10. Hooks

Both are Python, standard library only, like `protect-branches.py`, and each has a test script in the same style.

**`check-before-pr.py` (PreToolUse, on Bash and GitHub MCP tools).** It loads `protect-branches.py` with `importlib` to reuse its tokenizer and wrapper handling. Those already handle chains, `bash -c`, `env`, and quoted text, and a second parser would drift from them. It detects `gh pr create`, its alias `gh pr new`, REST `POST` to `/pulls`, the GraphQL `createPullRequest` mutation, and MCP tools named `create_pull_request`.

If there's no match, it exits immediately. On a match, it runs the three checks from the project root, in order, and reports every failure rather than only the first. Exit code 2 sends the output to Claude, trimmed to the last lines of each failure. Its settings entry has a timeout of 600 seconds, and `onFailure: block`, so a timeout or crash blocks.

It runs alongside `protect-branches.py`, which is unchanged. Claude Code runs matching hooks in parallel, so the two don't depend on each other's result.

**`lint-edited-file.py` (PostToolUse, on `Edit`, `Write`, and `NotebookEdit`).** It reads the file path from the input, skips anything without a JavaScript or TypeScript extension or outside the project, and runs the project's local ESLint with `--no-warn-ignored`. Errors exit 2, which shows them to Claude. It skips quietly if ESLint isn't installed, so edits before `npm ci` aren't reported as failures. It reports problems but never undoes an edit, since the tool has already run.

### 11. Documents change first

Following [Work tickets §1](../../../docs/08-WORK-TICKETS.md#1-how-tickets-work), the changes below come before any code. [tasks.md](tasks.md) lists them first.

| Document | Change |
| --- | --- |
| `docs/06-INFRASTRUCTURE.md` §3 | Step 2 adds the dependency audit; step 3 states the protection rule from decision 7 |
| `docs/08-WORK-TICKETS.md` T-01 | Scope states the review decision, and adds the audit and Dependabot |
| `docs/03-ARCHITECTURE.md` §1.6 | Version exceptions for TypeScript and ESLint, with the reason and when to revisit them |
| `docs/07-SECURITY-AND-TESTING.md` §2.3, §2.5 | Browser tests use the test database; adds `check:links` |

Later in the ticket, `readme.md` §1.4 and `CLAUDE.md` "Commands" change from planned to confirmed, and Architecture §2 adds `.github/`, `.claude/`, and the new scripts.

## Risks / Trade-offs

- **[`npm test` needs Postgres, so the pull request hook needs it too]** → The hook blocks with a message saying how to start it. This matches §2.5 and is better than skipping integration tests silently.
- **[The pull request hook tests the working tree, not the pushed commit]** → Uncommitted changes could differ from what's in the pull request. CI runs on the actual commit and is the final check.
- **[The hook recognizes `gh` and GitHub MCP tools, not every program that can call GitHub]** → `curl`, a script file, or a `gh` alias can still open a failing pull request. Recognizing them would need guesses that also block legitimate commands. The hook stops the normal paths, and CI and branch protection stop a failing pull request from merging, whichever way it was opened.
- **[The hook only governs Claude Code]** → A person can still open a failing pull request by hand. Branch protection stops it from merging, which is the guarantee that matters.
- **[TypeScript and ESLint are behind current stable]** → Dependabot proposes newer versions, and a check fails if they aren't yet compatible. §1.6 says to remove the exceptions once `eslint-config-next` supports them.
- **[TypeScript 6 has stricter defaults than earlier versions, such as how global type packages load]** → The probe saw a JSX type error without Next's generated types. `tsconfig.json` follows what `next build` generates, and `tsc --noEmit` on the scaffold confirms it.
- **[A new advisory can fail `audit` on an unrelated pull request, and a required check blocks merging]** → This is the intended behavior under Security §1. The fix is usually a Dependabot update. A high-severity advisory with no fix needs a decision by the owner when it happens.
- **[Vercel may not offer Node.js 26 yet]** → T-06 checks this when it creates the project. If it isn't offered, `.nvmrc` and §1.6 are adjusted together. CI and local setup aren't affected.
- **[Required checks with `enforce_admins` can block an urgent merge if CI is down]** → The owner can relax the rule in GitHub's settings for that merge and restore it afterwards. It's an accepted cost of having no bypass.
- **[WebKit browser download is slow in CI]** → It's limited to the `e2e` job. Caching can be added if it becomes a problem.

## Migration Plan

Nothing is deployed, and no data exists. The order inside the ticket matters only for branch protection:

1. Merge nothing until T-01's pull request shows all checks passing.
2. Limit the `require-pull-request` ruleset to `main`, and add the six required checks.
3. The owner merges the pull request under the new rule, which shows it works.

Rollback: revert the merge commit through a pull request. The ruleset stays, and T-01's jobs would need removing from it if the workflow is reverted.

## Open Questions

None. The project owner confirmed the review rule, adding the audit and Dependabot to this ticket with a high audit level, and the version exceptions on November 8, 2026. Other settings in these decisions are open to change in this change's review.
