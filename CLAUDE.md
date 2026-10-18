# CLAUDE.md

Guidance for AI coding agents working in this repository.

**Project:** ComproParaTi ("I buy for you"), an assisted shopping platform. Families keep shared lists; invited buyers reserve, buy, and ship the items.

## Read before working

| Task | Read first |
| --- | --- |
| Any change to behavior | [docs/01-PRD.md](docs/01-PRD.md): business rules (§12), requirements (§13), acceptance criteria (§17), traceability (§19) |
| Screens, text, or messages | [docs/02-UX-DESIGN.md](docs/02-UX-DESIGN.md) |
| Code structure, dependencies, layering | [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) |
| Schema, migrations, seed data | [docs/04-DATA-MODEL.md](docs/04-DATA-MODEL.md) |
| API endpoints and errors | [docs/05-API.md](docs/05-API.md) |
| CI, deployment, environment variables | [docs/06-INFRASTRUCTURE.md](docs/06-INFRASTRUCTURE.md) |
| Security or tests | [docs/07-SECURITY-AND-TESTING.md](docs/07-SECURITY-AND-TESTING.md) |
| Picking up work | [docs/08-WORK-TICKETS.md](docs/08-WORK-TICKETS.md): scope, dependencies, and acceptance criteria per ticket, and how tickets are tracked in GitHub Issues |

Use the traceability table (PRD §19) to find every story, rule, endpoint, and entity related to a requirement.

## Rules

- **The docs are the source of truth.** If a task needs behavior the docs don't define, or the code and docs disagree, stop and ask instead of choosing.
- **One source per fact.** When behavior changes, update the document that owns it, in the same pull request. Refer to rules by ID (for example `BR-23`); don't copy rule text into other documents or code comments.
- **Spec first:** every ticket starts as an OpenSpec change, reviewed before implementation, following [docs/08-WORK-TICKETS.md §1](docs/08-WORK-TICKETS.md#1-how-tickets-work). The PRD stays the source of truth for rules; specs cite its IDs.
- **Dependencies:** install only packages listed in [Architecture §1.6](docs/03-ARCHITECTURE.md#16-dependencies). If a task needs another one, stop and ask.
- **Layering:** pages and route handlers never query the database directly. Business rules and authorization live in the domain services (`src/server/services`).
- **Tests:** every acceptance criterion has at least one automated test whose name starts with its ID, for example `AC-59`. Follow the testing strategy in [docs/07-SECURITY-AND-TESTING.md §2](docs/07-SECURITY-AND-TESTING.md#2-testing-strategy): services take the clock as input, tests never call outside services, and the domain services keep at least 80% line coverage.
- **Text:** all interface text, emails, and WhatsApp messages come from the translation files; never hard-code strings.
- **Documentation:** written in English, with no notes to the author and no references to earlier versions. Each document's version and date go in its header, never in its file name. After changing any document, check that every link, anchor, and ID resolves, that the Mermaid diagrams parse, and that the OpenAPI definition validates.
- **Naming:** branches, OpenSpec changes, pull requests, and GitHub issues are named as described in [docs/08-WORK-TICKETS.md §1](docs/08-WORK-TICKETS.md#1-how-tickets-work) and [§2](docs/08-WORK-TICKETS.md#2-tracking-in-github).
- **AI usage record:** at the end of each work session, add the session's most representative prompts to [prompts.md](prompts.md) under the matching section, at most 3 per section as the course template asks, labeled with the ticket ID and model, and copied as written.

## Commands (planned)

`npm run setup` · `npm run dev` · `npm test` · `npm run test:e2e` · `npm run test:coverage` · `npm run lint` · `npm run db:migrate` · `npm run db:seed` (all test commands: [docs/07-SECURITY-AND-TESTING.md §2.5](docs/07-SECURITY-AND-TESTING.md#25-running-tests-locally-and-in-ci))
