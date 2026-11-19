# Tasks

T-01 has no acceptance criteria, so no task or test carries an `AC-` ID. Each task states how it is verified against the specs.

## 1. Documents first

- [x] 1.1 Update `docs/06-INFRASTRUCTURE.md` §3: add the dependency audit to step 2, and state the protection rule in step 3 (design decision 7). Update the header's version and date. Verify by reading the result against the `pull-request-checks` spec.
- [x] 1.2 Update T-01 in `docs/08-WORK-TICKETS.md`: state the review decision, and add the audit and Dependabot to its scope. Update the header. Verify that the ticket no longer requires an approval and that it names both additions.
- [x] 1.3 Add the TypeScript and ESLint exceptions to `docs/03-ARCHITECTURE.md` §1.6, with the reason and when to remove them. Update the header. Verify that the versions match the versions confirmed in design.md.
- [x] 1.4 Update `docs/07-SECURITY-AND-TESTING.md`: §2.3 says browser tests use the test database, and §2.5 lists `npm run check:links`. Update the header. Verify that both sections agree with design decisions 4 and 9.
- [x] 1.5 Edit issue #27 so that its "Done when" matches the ticket, which adds the Claude Code clause. Verify with `gh issue view 27`.

## 2. Application scaffold

- [x] 2.1 Install Node.js 26 on the development machine and add `.nvmrc` with `26`. Verify that `node -v` reports 26.
- [x] 2.2 Create `package.json` with `engines`, and install the milestone 1 packages in Architecture §1.6 plus the `@types/*` packages they need, leaving out anything not listed. Verify with `npm ls --depth=0` against §1.6, including Zod 4, TypeScript 6.0.3, and ESLint 9.39.5, and with no peer dependency errors from `npm ci`.
- [x] 2.3 Add `tsconfig.json` in strict mode with the `@/*` alias, and `next.config.ts`. Extend `.gitignore` with `node_modules`, `.next`, `.env`, the test reports, and coverage. Verify with `git check-ignore .env`.
- [x] 2.4 Add `src/app/layout.tsx`, `src/app/(public)/page.tsx`, and `src/i18n/es.json` and `en.json`, with all visible text and the title taken from the message file (design decision 2). Verify that `next build` succeeds and that a search of `src/app` finds no hard-coded interface text.

## 3. Code quality tools

- [x] 3.1 Add the ESLint configuration using `eslint-config-next`, including its accessibility rules, ignoring `.claude/`, `design/`, and generated folders. Add the Prettier configuration with its Tailwind plugin and a `.prettierignore` that protects documents and mockups. Verify that a deliberate rule violation and a missing `alt` both fail, then remove them.
- [x] 3.2 Add the `lint` script, running ESLint and a Prettier check. Verify that `npm run lint` and `npx tsc --noEmit` pass on the scaffold, that an unformatted file fails linting, and that an implicit `any` fails the type check, then remove both.

## 4. Local environment

- [x] 4.1 Add `docker-compose.yml` with Postgres, a named volume, and a health check. Verify that `docker compose up -d --wait` reports healthy.
- [x] 4.2 Add `.env.example` with every variable in Infrastructure §7, using working local values or clear placeholders. Verify by comparing its variable names with §7, and that it contains no real secret.
- [x] 4.3 Add `drizzle.config.ts`, the Drizzle client, an empty schema, and the migrations folder. Add `db:migrate` and `db:seed`, and confirm whether an empty journal is enough (design decision 6). Verify that both commands succeed and change nothing in an empty database, including when run twice.
- [x] 4.4 Add `scripts/setup.mjs` and the `setup` and `dev` scripts (design decision 3). Verify that `npm run setup` succeeds twice in a row, that an edited `.env` survives, that a development database row survives, and that stopping Docker produces the message naming the prerequisite.

## 5. Tests

- [x] 5.1 Add the helper that derives the test database URL and refuses non-local hosts, with a unit test covering both, in the Vitest `unit` project. Verify that `npm run test:unit` passes with Postgres stopped.
- [x] 5.2 Add the Vitest `integration` project and global setup, with an example test that confirms it's connected to `comproparati_test`. Verify that `npm run test:integration` passes, and that a remote `DATABASE_URL` stops it before connecting.
- [x] 5.3 Add `test` and `test:coverage`, with coverage limited to `src/server/services/**` and a line threshold of 80. Verify that `npm test` and `npm run test:coverage` pass, and that a temporary uncovered service file fails coverage, then remove it.
- [x] 5.4 Add the Playwright configuration with both projects and `test:e2e`, and an example test that opens the placeholder page, checks its text against the message file, and runs axe with the WCAG 2.1 AA tags. Verify that `npm run test:e2e` passes in Chromium and WebKit.

## 6. Documentation link check

- [x] 6.1 Add `scripts/check-doc-links.ts`, the `check:links` script, and a unit test with fixtures covering valid links, broken files, broken anchors, code blocks, and external links (design decision 9). Verify that the unit test passes and that the check makes no network request.
- [x] 6.2 Run `npm run check:links` on the repository and fix any real broken link it finds. Verify that it passes.

## 7. Pull request checks

- [x] 7.1 Add `.github/workflows/ci.yml` with the jobs `lint`, `typecheck`, `test`, `e2e`, `doc-links`, and `audit` (design decision 8). Verify that `npm audit --audit-level=high` passes locally, and fails in a scratch copy with a known vulnerable package.
- [x] 7.2 Add `.github/dependabot.yml` for npm and GitHub Actions, weekly. Verify that the file has the keys GitHub's Dependabot documentation requires; the effect can only be seen after the merge (see Workflow follow-up).

## 8. Claude Code hooks

- [x] 8.1 Add `.claude/hooks/check-before-pr.py` and `test_check_before_pr.py`, covering each scenario in the `agent-guardrails` spec: passing checks, each failure, Postgres down, unrelated commands, chains, `bash -c`, wrappers, `gh pr new`, the REST and GraphQL forms, the MCP tool, and an internal error. Verify that its tests pass using stand-in check commands, with no call to GitHub.
- [x] 8.2 Add `.claude/hooks/lint-edited-file.py` and `test_lint_edited_file.py`, covering errors, a clean file, a skipped file, an ignored file, a file outside the project, and missing ESLint. Verify that its tests pass.
- [x] 8.3 Add both hooks to `.claude/settings.json`, keeping the branch-protection entries, with a 600-second timeout and `onFailure: block` on the pull request hook. Verify that the JSON is valid and that `python3 .claude/hooks/test_protect_branches.py` still passes.
- [x] 8.4 Add the hooks to the "Rules and skills" table in `prompts.md`. Verify that its links resolve with `npm run check:links`.

## 9. Documents that confirm the build

- [x] 9.1 Update `readme.md` §1.4 with the confirmed prerequisites and commands, including Node.js 26 and setup creating `.env`. Update `CLAUDE.md` "Commands" so they're no longer planned. Verify by following the readme in task 10.1.
- [x] 9.2 Update the layout in `docs/03-ARCHITECTURE.md` §2 with `.github/`, `.claude/`, and the new scripts. Update the header. Verify that every link, anchor, and ID resolves, and that the Mermaid diagrams still parse, as `CLAUDE.md` requires.

## 10. End-to-end verification

- [x] 10.1 In a new fresh clone of this branch, with no earlier volume or `.env`, run `npm run setup`, `npm run dev` (the page loads), `npm test`, and `npm run test:e2e`, in the order the readme gives. Verify that each finishes without errors, and record the output for the pull request.
- [x] 10.2 Before opening the pull request, have Claude Code run `gh pr create` with a temporary failure in each of the three checks, and confirm that the hook blocks with the errors, then remove the failures. Run it with the three checks passing only when the owner asks for the pull request. Verify from the hook's output.
- [x] 10.3 Edit a source file to break a rule, and confirm that the lint hook shows the error, then undo the edit. Verify from the hook's output.
- [x] 10.4 When the owner asks for the pull request, open it following `CLAUDE.md`, with `Closes #27`. Verify that all six checks appear and pass.
- [x] 10.5 Push a temporary commit that fails linting, type checks, and tests. Verify that those three checks fail on the pull request (`e2e` also fails, because the type error stops the build), then revert the commit with a new commit and verify that they pass again.
- [x] 10.6 Protect `main` with the repository ruleset `require-pull-request`: limited to the default branch, requiring a pull request with no approvals and the six checks, up to date with `main`, with no bypass actors. The owner created the ruleset and asked Claude Code to apply these settings (design decision 7). Verify by reading the ruleset back with `gh api repos/ojordan0/AI4Devs-finalproject/rulesets/26807721`, and, with a failing check on the pull request, by `gh pr view --json mergeStateStatus` reporting `BLOCKED`.
- [x] 10.7 Run the `adversarial-reviewer` subagent on the pull request, post its findings as a comment, fix what's warranted, and re-run the review at most once, as `CLAUDE.md` describes. Verify that the comment is on the pull request.
- [x] 10.8 Export the session to `docs/ai-conversations/part-<N>-project-scaffold.md`, continuing the numbering, and add its row and representative prompts to `prompts.md`. Verify with `npm run check:links`.

## Workflow follow-up

- Archive this change as part of the merge, as [Work tickets §1](../../../docs/08-WORK-TICKETS.md#1-how-tickets-work) requires, and verify that `openspec/specs/` has the three new capabilities.
- The owner merges the pull request, because `protect-branches.py` blocks Claude Code from merging. A merge with all checks passing confirms the "can be merged without an approval" scenario.
- After the merge, confirm that Dependabot reads its configuration under the repository's Insights, Dependency graph, Dependabot tab. It only reads the file on the default branch.
- Later tickets add to the required checks when they add a job: T-03 adds the OpenAPI check, and it's added to the `require-pull-request` ruleset.
