# Agent guidance

Guidance for AI coding agents working in this repository.

**Project:** ComproParaTi ("I buy for you"), an assisted shopping platform. Families keep shared lists; invited buyers reserve, buy, and ship the items.

## Read before working

| Task | Read first |
| --- | --- |
| Any change to behavior | [docs/01-PRD.md](docs/01-PRD.md): business rules (§12), requirements (§13), acceptance criteria (§17), traceability (§19) |
| Screens, text, or messages | [docs/02-UX-DESIGN.md](docs/02-UX-DESIGN.md) |
| Design trade-offs between roles, or what the product must not claim | [PRODUCT.md](PRODUCT.md): role priority, positioning, and product principles |
| Visual design, styling, or a screen's layout | [DESIGN.md](DESIGN.md): tokens, components, and how to use the Stitch screens in `design/stitch/`; then [design/screens.md](design/screens.md): each screen's route, components, Stitch folder, and design ticket |
| Code structure, dependencies, layering | [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) |
| Schema, migrations, seed data | [docs/04-DATA-MODEL.md](docs/04-DATA-MODEL.md) |
| API endpoints and errors | [docs/05-API.md](docs/05-API.md) |
| CI, deployment, environment variables | [docs/06-INFRASTRUCTURE.md](docs/06-INFRASTRUCTURE.md) |
| Security or tests | [docs/07-SECURITY-AND-TESTING.md](docs/07-SECURITY-AND-TESTING.md) |
| Picking up work | [docs/08-WORK-TICKETS.md](docs/08-WORK-TICKETS.md): scope, dependencies, acceptance criteria, and branch name per ticket, and how tickets are tracked in GitHub Issues; then the OpenSpec configuration and existing specs in `openspec/` |

Use the traceability table (PRD §19) to find every story, rule, endpoint, and entity related to a requirement.

## Rules

- **The docs are the source of truth.** If a task needs behavior the docs don't define, or the code and docs disagree, stop and ask instead of choosing.
- **One source per fact.** When behavior changes, update the document that owns it, in the same pull request. Refer to rules by ID (for example `BR-23`); don't copy rule text into other documents or code comments.
- **Spec first:** every ticket except design tickets starts as an OpenSpec change, reviewed before implementation, following [docs/08-WORK-TICKETS.md §1](docs/08-WORK-TICKETS.md#1-how-tickets-work). The PRD stays the source of truth for rules; specs cite its IDs.
- **Design tickets:** a ticket that restyles built screens to DESIGN.md and the Stitch screens changes no behavior, so it skips the OpenSpec steps: no /opsx:propose, /opsx:apply or /opsx:archive, no tasks.md, and no OpenSpec link in the PR. Before starting, summarize the screens in scope and wait for approval, as with a proposal. If the work needs a behavior change, stop: that is a separate ticket with an OpenSpec change.
- **Dependencies:** install only packages listed in [Architecture §1.6](docs/03-ARCHITECTURE.md#16-dependencies). If a task needs another one, stop and ask.
- **Layering:** pages and route handlers never query the database directly. Business rules and authorization live in the domain services (`src/server/services`).
- **Tests:** every acceptance criterion has at least one automated test whose name starts with its ID, for example `AC-59`. Tickets without acceptance criterion IDs follow [docs/07-SECURITY-AND-TESTING.md §2.6](docs/07-SECURITY-AND-TESTING.md#26-coverage-targets). Follow the testing strategy in [docs/07-SECURITY-AND-TESTING.md §2](docs/07-SECURITY-AND-TESTING.md#2-testing-strategy): services take the clock as input, tests never call outside services, and the domain services keep at least 80% line coverage.
- **Text:** all interface text, emails, and WhatsApp messages come from the translation files; never hard-code strings.
- **Documentation:** written in English, with no notes to the author and no references to earlier versions. Each document's version and date go in its header, never in its file name. After changing any document, check that every link, anchor, and ID resolves, that the Mermaid diagrams parse, and that the OpenAPI definition validates.
- **Naming:** branches, OpenSpec changes, pull requests, and GitHub issues are named as described in [docs/08-WORK-TICKETS.md §1](docs/08-WORK-TICKETS.md#1-how-tickets-work) and [§2](docs/08-WORK-TICKETS.md#2-tracking-in-github).
- **AI usage record:** when the user ends a work session, and always in step 5 of finishing a ticket or work outside one (below), before that step's commit:
  1. Export the session to `docs/ai-conversations/part-<N>-<short-name>.md`, continuing the numbering of the existing parts, for example `part-5-project-scaffold.md`. Follow the format of the existing exports: a title, the export date, and an "About this export" list with the model, the effort, and what is included and left out; then one section per turn with the prompt copied as written and the visible text of the response. Summarize tool activity in one line per turn, and name files instead of embedding them. If earlier turns are no longer in context, say which ones in "About this export" instead of reconstructing them.
  2. Add a row for the session to the Build table in [prompts.md, Sessions](prompts.md#sessions): part, tickets (or "—" for work outside a ticket), name, tool, model, and a link to the export.
  3. Add the session's most representative prompts to [prompts.md](prompts.md) under the matching section, at most 3 per section as the course template asks, labeled like `(Part 5, turn 3 · T-01 · Claude Opus 5.5)`, and copied as written.

## Branches, commits and PRs

Work is organized by tickets (see `/docs/08-WORK-TICKETS.md`). One ticket = one branch = one PR, merged into `main`.

- **Protected branches:** `main`, `feature/entrega-1-OJE`, `feature/entrega-2-OJE` and `final-project-OJE`. Never commit directly to any of them, and never check them out to work on them.
- **Branches are per ticket, not per request.** Before touching code, check the current branch:
  - On a protected branch: switch to `main`, update it (`git pull --ff-only`), then create the ticket's branch with `git checkout -b <branch>`, using the name in the [ticket overview](docs/08-WORK-TICKETS.md#3-ticket-overview) (e.g. `feat/t-07-groups-api`).
  - On a ticket branch: stay on it if the request belongs to that ticket. If it belongs to a different ticket, or the branch's PR is already merged or closed, go back to `main` and create the right ticket branch from there (never branch off another ticket branch).
  - If the request doesn't clearly map to a ticket, ask which one before starting. Work outside a ticket happens only when the user agrees to it, following [docs/08-WORK-TICKETS.md §1](docs/08-WORK-TICKETS.md#1-how-tickets-work).
  - For work outside a ticket, create a branch with `git checkout -b <type>/<slug>`, where `<type>` is `feat`, `fix`, `chore`, `docs` or `refactor` (e.g. `docs/ticket-workflow`).
- **Starting a ticket**, right after creating its branch:
  1. Move the ticket's issue to In Progress in the GitHub Project. If `gh` can't do it, tell the user and continue.
  2. Run `/opsx:propose <change-name>`, where the change name is the branch name without the type prefix (e.g. `t-07-groups-api`).
  3. Stop and give the user a short summary of the proposal: the scope as you understood it, your assumptions, and anything the documents leave open or contradict. Don't run `/opsx:apply` until the user approves the proposal.
  4. Commit the approved proposal on its own with `/commit`, then run `/opsx:apply`. If the plan changes later, update the change with `/opsx:update` instead of letting the code drift from the specs.

  A design ticket replaces steps 2–4 with the summary of screens in scope.
- **Commits are per request:** when you finish each request, use the `/commit` skill. If the branch already has an open PR, push after committing.
- **Finishing a ticket.** The user decides when the ticket is done (e.g. "open the PR"); don't open one on your own. Then, in this order:
  1. Check that every task in the change's `tasks.md` is done, and that `npm run lint`, `npx tsc --noEmit`, and `npm test` pass.
  2. `git push -u origin HEAD`, then `gh pr create --base main`, titled `T-NN <ticket title>`, with a full description of the changes, a link to the OpenSpec change, and `Closes #<issue>` with the ticket's issue from the [ticket overview](docs/08-WORK-TICKETS.md#3-ticket-overview).
  3. Run the `adversarial-reviewer` subagent on the PR and post its findings as a PR comment. While the PR has no CI check runs, run `npm test` first, include its output in the subagent's prompt, and post that output in the same comment, below the findings. If `npm test` can't run yet, say so in the comment.
  4. Fix what's warranted, commit, push. Re-run the review at most once. Then reply with the PR URL plus one line on any unresolved review findings. Don't repeat the PR summary in chat: the session will be lost; the PR won't.
  5. When the user says the PR is ready to merge: run `/opsx:archive`, point the PR description's OpenSpec link to the archived change, record the session (AI usage record, above), commit, and push. This is the last commit before the merge.
  6. The user merges the PR. Don't merge it yourself.

  A design ticket skips `tasks.md` in step 1, has no OpenSpec link in step 2, and only records the session in step 5.
- **Finishing work outside a ticket** follows the same steps, with these differences: step 1 has no `tasks.md` to check; the PR in step 2 has a descriptive title, with no ticket ID, OpenSpec link, or `Closes`; and step 5 only records the session.

## Course deliveries

Only when the user explicitly asks for a delivery:
- Delivery branches: D1 → `feature/entrega-1-OJE`, D2 → `feature/entrega-2-OJE`, D3 → `final-project-OJE`.
- First check that local `main` is up to date with `origin/main` and that no ticket PR meant for this delivery is still open. Report anything pending and wait for confirmation.
- Push with `git push origin main:<delivery-branch>`. Never force-push; if the push is rejected as non-fast-forward, stop and tell the user.

## Commands

`npm run setup` · `npm run dev` · `npm test` · `npm run test:e2e` · `npm run test:coverage` · `npm run lint` · `npx tsc --noEmit` · `npm run check:links` · `npm run db:migrate` · `npm run db:seed` (all test commands: [docs/07-SECURITY-AND-TESTING.md §2.5](docs/07-SECURITY-AND-TESTING.md#25-running-tests-locally-and-in-ci))
