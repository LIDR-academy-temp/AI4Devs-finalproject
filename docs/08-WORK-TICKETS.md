# Work tickets

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.25 · **Date:** November 15, 2026

Part of the project documentation ([readme](../readme.md)). IDs (`BR`, `FR`, `E`, `US`, `AC`) are defined in the [PRD](01-PRD.md).

---

## 1. How tickets work

- **Scope:** these tickets cover milestone 1 ([PRD §8.1](01-PRD.md#81-milestone-1-core-cycle-end-to-end)). Milestone 2 tickets are written when milestone 1 is delivered.
- **Rules live in the PRD.** A ticket says what to build and which requirements, rules, and acceptance criteria it covers. It does not restate them.
- **Epic and stories:** each ticket belongs to one epic and implements one or more user stories ([PRD §14](01-PRD.md#14-epics-and-user-stories)). The first story listed is the ticket's main story. Tickets with no story are foundation work in E-08.
- **Delivery** is the course deadline the ticket must meet: D2 or D3 ([PRD §8.1](01-PRD.md#81-milestone-1-core-cycle-end-to-end)).
- **Size:** S (up to half a day), M (one to two days), L (three to five days).
- **Spec first:** each ticket except design tickets (below) is built as one OpenSpec change, named like its branch without the type prefix (branch `feat/t-07-groups-api`, change `t-07-groups-api`). The change is generated from the ticket and the documents it references; its proposal links the ticket's issue, its requirements cite the PRD IDs instead of copying rule text, and each scenario is named after the acceptance criterion it verifies, for example `AC-59`. A ticket without acceptance criterion IDs names its scenarios as described in [Security and testing §2.6](07-SECURITY-AND-TESTING.md#26-coverage-targets). The change is reviewed before implementation, and archived in the ticket's pull request as its last commit before the merge. If the documents leave a question open, they are updated first.
- **Branching:** one branch and one pull request per ticket, merged into `main`. The branch is named `<type>/t-<NN>-<slug>`, after the ticket ID, where `<type>` is `feat`, `fix`, `chore`, `docs`, or `refactor`; for example `feat/t-07-groups-api`. Each ticket's branch name is in the [ticket overview](#3-ticket-overview).
- **Work outside a ticket** happens only when agreed with the project owner, on a branch named `<type>/<slug>`, through a pull request, and without an OpenSpec change.
- **Design tickets** (type Design) restyle screens that are already built to [DESIGN.md](../DESIGN.md) and the Stitch screens in `design/stitch/`, and change no behavior. The Group and Invitation screens are the exception: the tickets that build them (T-08 and T-15) build them to DESIGN.md and their Stitch screens, and their design tickets (T-28 and T-23) check the finished screens against both, changing no behavior either. Design tickets have no OpenSpec change. Before work starts, the screens in scope are summarized and approved. A design ticket depends on the tickets that build its screens. If the work needs a behavior change, that change is a separate ticket with an OpenSpec change. The pull request says how each "Done when" condition was checked.
- **Course deliveries:** at each deadline, the state of `main` is pushed to the delivery branch: `feature/entrega-1-OJE` for D1, `feature/entrega-2-OJE` for D2, and `final-project-OJE` for D3.

**Definition of done** for every ticket:

1. The ticket's OpenSpec change was reviewed before implementation, and is archived in the pull request before the merge. Design tickets have no OpenSpec change ([above](#1-how-tickets-work)).
2. The listed acceptance criteria have automated tests named with their IDs. A ticket without acceptance criterion IDs has each of its conditions verified instead ([Security and testing §2.6](07-SECURITY-AND-TESTING.md#26-coverage-targets)). All tests pass in CI.
3. Linting and type checks pass, and the generated OpenAPI document is up to date.
4. Interface text comes from the translation files, in Spanish and English.
5. Any change in behavior or design is reflected in the document that owns it.
6. The work session is recorded in [prompts.md](../prompts.md).
7. The pull request passes the adversarial review ([CLAUDE.md](../CLAUDE.md#branches-commits-and-prs)) and is merged to `main`.

## 2. Tracking in GitHub

User stories and tickets are tracked as issues in the project's repository, [ojordan0/AI4Devs-finalproject](https://github.com/ojordan0/AI4Devs-finalproject/issues), and moved across a board in a GitHub Project linked to the repository. GitHub Issues keeps the work next to the code: issues link to branches and pull requests, and merging a pull request closes its ticket. Only features available on a personal account are used.

| Item | How it is tracked |
| --- | --- |
| User story | An issue titled with its ID and story, for example "US-10 Add an item by typing only its name", labeled `story` and `m1`, `m2`, or both, for the milestones of its acceptance criteria. All 26 stories have an issue, including those only in milestone 2. |
| Work ticket | An issue titled with its ID and title, labeled `task`, and added as a sub-issue of its main story. Its description lists any other stories it implements. Tickets with no story have no parent. |
| Epic | Not tracked in GitHub. Epics are defined in [PRD §14.1](01-PRD.md#141-epics). |
| Delivery | A GitHub milestone for each course delivery (D1, D2, and D3) and for milestone 2 (M2), due on the dates in [PRD §8](01-PRD.md#8-release-plan-and-launch-criteria). Each ticket is assigned to its delivery. |
| Board | A GitHub Project, [ComproParaTi](https://github.com/users/ojordan0/projects/1), linked to the repository and holding the tickets, in the board layout with its default columns: Todo, In Progress, and Done. A ticket moves to In Progress when its branch is created, and to Done when its issue is closed. |
| Pull request | One per ticket ([section 1](#1-how-tickets-work)). Its description includes `Closes #<issue>`, so merging it closes the ticket. |

Issue descriptions contain the goal, the related stories, and the acceptance criteria IDs, and link back to this document. The scope and the rules stay here and in the PRD. The labels, milestones, issues, sub-issue links, and project are created from these documents by [`scripts/setup-github-issues.py`](../scripts/setup-github-issues.py), which can be run again without creating duplicates.

**Story issues.** Each story's text, requirements, and acceptance criteria are in [PRD §14.2](01-PRD.md#142-user-stories). Each ticket's issue is in the [ticket overview](#3-ticket-overview).

| Story | Issue | Story | Issue |
| --- | --- | --- | --- |
| US-01 | [#1](https://github.com/ojordan0/AI4Devs-finalproject/issues/1) | US-14 | [#14](https://github.com/ojordan0/AI4Devs-finalproject/issues/14) |
| US-02 | [#2](https://github.com/ojordan0/AI4Devs-finalproject/issues/2) | US-15 | [#15](https://github.com/ojordan0/AI4Devs-finalproject/issues/15) |
| US-03 | [#3](https://github.com/ojordan0/AI4Devs-finalproject/issues/3) | US-16 | [#16](https://github.com/ojordan0/AI4Devs-finalproject/issues/16) |
| US-04 | [#4](https://github.com/ojordan0/AI4Devs-finalproject/issues/4) | US-17 | [#17](https://github.com/ojordan0/AI4Devs-finalproject/issues/17) |
| US-05 | [#5](https://github.com/ojordan0/AI4Devs-finalproject/issues/5) | US-18 | [#18](https://github.com/ojordan0/AI4Devs-finalproject/issues/18) |
| US-06 | [#6](https://github.com/ojordan0/AI4Devs-finalproject/issues/6) | US-19 | [#19](https://github.com/ojordan0/AI4Devs-finalproject/issues/19) |
| US-07 | [#7](https://github.com/ojordan0/AI4Devs-finalproject/issues/7) | US-20 | [#20](https://github.com/ojordan0/AI4Devs-finalproject/issues/20) |
| US-08 | [#8](https://github.com/ojordan0/AI4Devs-finalproject/issues/8) | US-21 | [#21](https://github.com/ojordan0/AI4Devs-finalproject/issues/21) |
| US-09 | [#9](https://github.com/ojordan0/AI4Devs-finalproject/issues/9) | US-22 | [#22](https://github.com/ojordan0/AI4Devs-finalproject/issues/22) |
| US-10 | [#10](https://github.com/ojordan0/AI4Devs-finalproject/issues/10) | US-23 | [#23](https://github.com/ojordan0/AI4Devs-finalproject/issues/23) |
| US-11 | [#11](https://github.com/ojordan0/AI4Devs-finalproject/issues/11) | US-24 | [#24](https://github.com/ojordan0/AI4Devs-finalproject/issues/24) |
| US-12 | [#12](https://github.com/ojordan0/AI4Devs-finalproject/issues/12) | US-25 | [#25](https://github.com/ojordan0/AI4Devs-finalproject/issues/25) |
| US-13 | [#13](https://github.com/ojordan0/AI4Devs-finalproject/issues/13) | US-26 | [#26](https://github.com/ojordan0/AI4Devs-finalproject/issues/26) |

## 3. Ticket overview

| ID | Issue | Title | Epic | Stories | Type | Increment | Delivery | Size | Depends on | Branch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | [#27](https://github.com/ojordan0/AI4Devs-finalproject/issues/27) | Repository, project scaffold, and CI | E-08 | None | DevOps | 1 | D2 | M | None | `chore/t-01-project-scaffold` |
| T-02 | [#28](https://github.com/ojordan0/AI4Devs-finalproject/issues/28) | Database schema, migrations, and seed data | E-08 | None | Database | 1 | D2 | L | T-01 | `feat/t-02-database-schema` |
| T-03 | [#29](https://github.com/ojordan0/AI4Devs-finalproject/issues/29) | API foundation and baseline security | E-08 | US-26 | Backend | 1 | D2 | M | T-02 | `feat/t-03-api-foundation` |
| T-04 | [#30](https://github.com/ojordan0/AI4Devs-finalproject/issues/30) | Sign-in, onboarding, and basic profile | E-01 | US-01, US-02 | Full stack | 1 | D2 | L | T-03 | `feat/t-04-sign-in-onboarding` |
| T-05 | [#31](https://github.com/ojordan0/AI4Devs-finalproject/issues/31) | App shell, navigation, and translations | E-08 | US-25, US-07 | Frontend | 1 | D2 | M | T-04 | `feat/t-05-app-shell` |
| T-06 | [#32](https://github.com/ojordan0/AI4Devs-finalproject/issues/32) | Production deployment | E-08 | None | DevOps | 1 | D3 | M | T-04 | `chore/t-06-production-deployment` |
| T-07 | [#33](https://github.com/ojordan0/AI4Devs-finalproject/issues/33) | Groups, memberships, and access | E-02 | US-07, US-01, US-04 | Backend | 2 | D2 | M | T-03 | `feat/t-07-groups-api` |
| T-08 | [#34](https://github.com/ojordan0/AI4Devs-finalproject/issues/34) | Invitations | E-02 | US-04 | Full stack | 2 | D3 | L | T-07, T-05, T-20 | `feat/t-08-invitations` |
| T-09 | [#35](https://github.com/ojordan0/AI4Devs-finalproject/issues/35) | Lists and items API | E-04 | US-10, US-07, US-11, US-12, US-13 | Backend | 3 | D2 | M | T-07 | `feat/t-09-lists-items-api` |
| T-10 | [#36](https://github.com/ojordan0/AI4Devs-finalproject/issues/36) | Lists screen, item form, and item page | E-04 | US-10, US-07 | Frontend | 3 | D2 | L | T-09, T-05 | `feat/t-10-lists-screens` |
| T-11 | [#37](https://github.com/ojordan0/AI4Devs-finalproject/issues/37) | Status changes: reserve, release, purchase | E-05 | US-15, US-14, US-16 | Backend | 4 | D2 | M | T-09 | `feat/t-11-status-changes-api` |
| T-12 | [#38](https://github.com/ojordan0/AI4Devs-finalproject/issues/38) | To buy, My purchases, and buyer actions | E-05 | US-14, US-15 | Frontend | 4 | D3 | M | T-11, T-10 | `feat/t-12-buyer-screens` |
| T-13 | [#39](https://github.com/ojordan0/AI4Devs-finalproject/issues/39) | People and their details | E-03 | US-09 | Full stack | 3 | D3 | M | T-10 | `feat/t-13-people` |
| T-14 | [#40](https://github.com/ojordan0/AI4Devs-finalproject/issues/40) | Couldn't buy it and the item timeline | E-05 | US-16, US-13 | Full stack | 4 | D3 | M | T-12 | `feat/t-14-couldnt-buy-timeline` |
| T-15 | [#41](https://github.com/ojordan0/AI4Devs-finalproject/issues/41) | Delivery addresses | E-06 | US-18 | Full stack | 5 | D3 | M | T-08 | `feat/t-15-delivery-addresses` |
| T-16 | [#42](https://github.com/ojordan0/AI4Devs-finalproject/issues/42) | Marking items as shipped | E-06 | US-19, US-21 | Full stack | 5 | D3 | L | T-12, T-15 | `feat/t-16-shipments` |
| T-17 | [#43](https://github.com/ojordan0/AI4Devs-finalproject/issues/43) | End-to-end test of the core cycle and test suite completion | E-08 | None | QA | All | D3 | M | T-16 | `chore/t-17-e2e-core-cycle` |
| T-18 | [#44](https://github.com/ojordan0/AI4Devs-finalproject/issues/44) | Deployment evidence and final documentation | E-08 | None | Documentation | All | D3 | S | T-17, T-21, T-22, T-23, T-24, T-25, T-26, T-27, T-28, T-29, T-30, T-31, T-32, T-33, T-34, T-35 | `docs/t-18-final-documentation` |
| T-19 | [#62](https://github.com/ojordan0/AI4Devs-finalproject/issues/62) | Tests that survive a restyle | E-08 | None | Design | All | D2 | S | None | `chore/t-19-restyle-safe-tests` |
| T-20 | [#63](https://github.com/ojordan0/AI4Devs-finalproject/issues/63) | Design tokens and base components | E-08 | None | Design | All | D2 | M | T-19, T-05 | `feat/t-20-design-foundation` |
| T-21 | [#64](https://github.com/ojordan0/AI4Devs-finalproject/issues/64) | Welcome design | E-08 | None | Design | 1 | D2 | S | T-20, T-04 | `feat/t-21-design-welcome` |
| T-22 | [#65](https://github.com/ojordan0/AI4Devs-finalproject/issues/65) | One last step design | E-08 | None | Design | 1 | D2 | S | T-20, T-04 | `feat/t-22-design-one-last-step` |
| T-23 | [#66](https://github.com/ojordan0/AI4Devs-finalproject/issues/66) | Invitation design | E-08 | None | Design | 2 | D3 | S | T-20, T-08 | `feat/t-23-design-invitation` |
| T-24 | [#67](https://github.com/ojordan0/AI4Devs-finalproject/issues/67) | Lists design | E-08 | None | Design | 3 | D2 | M | T-20, T-10 | `feat/t-24-design-lists` |
| T-25 | [#68](https://github.com/ojordan0/AI4Devs-finalproject/issues/68) | Item form design | E-08 | None | Design | 3 | D3 | M | T-20, T-10, T-13 | `feat/t-25-design-item-form` |
| T-26 | [#69](https://github.com/ojordan0/AI4Devs-finalproject/issues/69) | Item page design | E-08 | None | Design | 5 | D3 | M | T-20, T-12, T-13, T-14, T-16 | `feat/t-26-design-item-page` |
| T-27 | [#70](https://github.com/ojordan0/AI4Devs-finalproject/issues/70) | People design | E-08 | None | Design | 3 | D3 | M | T-20, T-13 | `feat/t-27-design-people` |
| T-28 | [#71](https://github.com/ojordan0/AI4Devs-finalproject/issues/71) | Group design | E-08 | None | Design | 5 | D3 | S | T-20, T-08, T-15 | `feat/t-28-design-group` |
| T-29 | [#72](https://github.com/ojordan0/AI4Devs-finalproject/issues/72) | To buy design | E-08 | None | Design | 4 | D3 | S | T-20, T-12, T-13 | `feat/t-29-design-to-buy` |
| T-30 | [#73](https://github.com/ojordan0/AI4Devs-finalproject/issues/73) | My purchases design | E-08 | None | Design | 5 | D3 | S | T-20, T-12, T-13, T-16 | `feat/t-30-design-my-purchases` |
| T-31 | [#74](https://github.com/ojordan0/AI4Devs-finalproject/issues/74) | Mark as shipped design | E-08 | None | Design | 5 | D3 | S | T-20, T-16 | `feat/t-31-design-mark-as-shipped` |
| T-32 | [#75](https://github.com/ojordan0/AI4Devs-finalproject/issues/75) | Profile design | E-08 | None | Design | 1 | D2 | S | T-20, T-04 | `feat/t-32-design-profile` |
| T-33 | [#76](https://github.com/ojordan0/AI4Devs-finalproject/issues/76) | Design for screens and states without a Stitch screen | E-08 | None | Design | 5 | D3 | M | T-20, T-14 | `feat/t-33-design-unstitched-states` |
| T-34 | [#83](https://github.com/ojordan0/AI4Devs-finalproject/issues/83) | Bottom bar height | E-08 | None | Design | All | D2 | S | T-20 | `fix/t-34-bottom-bar-height` |
| T-35 | [#86](https://github.com/ojordan0/AI4Devs-finalproject/issues/86) | Custom text sizes in cn() | E-08 | None | Design | All | D2 | S | T-20 | `fix/t-35-text-size-classes` |

## 4. Tickets

### T-01 Repository, project scaffold, and CI

**Epic:** E-08 · **Stories:** None · **Type:** DevOps · **Increment:** 1 · **Delivery:** D2 · **Size:** M · **Depends on:** none

**Goal:** a repository where any developer can clone, run one command, and work, with every pull request checked automatically.

**Scope:**

- Next.js (App Router) with TypeScript in strict mode, following the project structure in [Architecture §2](03-ARCHITECTURE.md#2-project-structure).
- Milestone 1 packages from [Architecture §1.6](03-ARCHITECTURE.md#16-dependencies); package manager npm.
- ESLint and Prettier; Vitest with the coverage report, and Playwright with Chromium and WebKit, each with one passing example test ([Security and testing §2](07-SECURITY-AND-TESTING.md#2-testing-strategy)).
- `docker-compose.yml` with Postgres; `.env.example` with every variable in [Infrastructure §7](06-INFRASTRUCTURE.md#7-configuration).
- npm scripts: `setup`, `dev`, `lint`, `db:migrate`, `db:seed`, and the test commands in [Security and testing §2.5](07-SECURITY-AND-TESTING.md#25-running-tests-locally-and-in-ci).
- GitHub Actions workflow running the checks in [Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process), step 2, including the documentation link check and the dependency audit. T-03 adds the OpenAPI check.
- Dependabot pull requests for npm packages and GitHub Actions ([Security and testing §1](07-SECURITY-AND-TESTING.md#1-security)).
- Branch protection on `main`, as described in [Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process), step 3: a pull request and passing checks are required, with no approvals and no bypass for administrators.
- Claude Code hooks for the checks, configured in `.claude/settings.json` with their scripts in `.claude/hooks/`, next to the branch-protection hook:
  - before `gh pr create`, run `npm run lint`, the type check (`tsc --noEmit`), and `npm test`, and block the pull request with the errors when any of them fails;
  - after Claude edits or writes a file, run ESLint on that file and show Claude the errors.
- The application is added around the documentation already in the repository: `readme.md`, `CLAUDE.md`, `prompts.md`, `docs/`, and `scripts/`.

**Done when:** a fresh clone runs `npm run setup`, `npm run dev`, `npm test`, and `npm run test:e2e` without errors, a pull request shows all checks, and Claude Code can't open a pull request while linting, type checks, or tests fail.

### T-02 Database schema, migrations, and seed data

**Epic:** E-08 · **Stories:** None · **Type:** Database · **Increment:** 1 · **Delivery:** D2 · **Size:** L · **Depends on:** T-01

**Goal:** the complete data model in Postgres, versioned with migrations, with seed data that covers every status and permission case.

**Scope:**

- Drizzle schema for every table, enumeration, constraint, and index in [Data model §2](04-DATA-MODEL.md#2-entities). Milestone 2 tables (`job_runs`) are included now. Later tickets add migrations as the model changes.
- Check constraints, as [Data model §2](04-DATA-MODEL.md#2-entities) lists them: quantity range, a buyer exactly when the status isn't pending, shipment present only when shipped, a note when unavailable, link scheme, phone number format, and country format.
- Partial unique index: at most one default delivery address per group.
- First migration generated with drizzle-kit and applied by `npm run db:migrate`.
- Seed script loading the data in [Data model §3](04-DATA-MODEL.md#3-seed-data), safe to run again.
- A check in the CI workflow that the migrations match the schema ([Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process), step 2).

**Acceptance criteria:** integration tests prove that each constraint rejects invalid data, and that the seed loads into an empty database.

**Done when:** `npm run setup` creates the database from scratch with seed data, and the tests pass in CI against a Postgres service container.

### T-03 API foundation and baseline security

**Epic:** E-08 · **Stories:** US-26 · **Type:** Backend · **Increment:** 1 · **Delivery:** D2 · **Size:** M · **Depends on:** T-02

**Goal:** the shared building blocks every endpoint uses, so later tickets only add business logic.

**Scope:**

- Route handler structure under `/api/v1` and the error format in [API §1](05-API.md#1-conventions).
- Request validation with Zod schemas shared with the interface, enforcing BR-32.
- Authorization guard that resolves the user's membership in the group that owns the data (BR-12), returning the same "not available" response for missing and inaccessible resources (BR-13).
- Origin check for requests that change data, rate limiter, and security headers ([Security and testing §1](07-SECURITY-AND-TESTING.md#1-security)).
- OpenAPI generation into `docs/openapi.yaml`, checked in CI.

**Acceptance criteria:** AC-97.

### T-04 Sign-in, onboarding, and basic profile

**Epic:** E-01 · **Stories:** US-01, US-02 · **Type:** Full stack · **Increment:** 1 · **Delivery:** D2 · **Size:** L · **Depends on:** T-03

**Goal:** a new user signs in with Google, completes onboarding, and lands in the app.

**Scope:**

- Better Auth with the Google provider, the Drizzle adapter, and database sessions (FR-01, BR-02, BR-03).
- Development-only sign-in by email, as a seed user or a new user ([Architecture §3](03-ARCHITECTURE.md#3-technical-decisions)).
- Welcome and "One last step" screens (FR-02, FR-03), with WhatsApp validation (BR-04). Completing onboarding runs getting started from T-07, so the user gets their group and first list (BR-06).
- Profile: language, WhatsApp number, email setting, and sign out (FR-04, without account deletion).
- What these screens need from the interface foundation: page translations choosing the language from the user, the Welcome choice, or the browser (FR-37); Tailwind CSS with the design tokens ([DESIGN.md](../DESIGN.md)); and the shadcn/ui components the screens use.
- A placeholder at the Lists address, where a new user lands until T-10 builds Lists.

**Acceptance criteria:** AC-02, AC-03, AC-04, AC-05, AC-06, AC-98.

### T-05 App shell, navigation, and translations

**Epic:** E-08 · **Stories:** US-25, US-07 · **Type:** Frontend · **Increment:** 1 · **Delivery:** D2 · **Size:** M · **Depends on:** T-04

**Goal:** the frame every screen lives in, in both languages.

**Scope:**

- Bottom navigation and header with group selector and Refresh ([UX design §2.2](02-UX-DESIGN.md#22-navigation)), showing only the tabs the user's memberships allow (FR-08).
- Date and number formatting by language (FR-38), on the translation setup from T-04 (FR-37).
- The shadcn/ui components the shell needs, on the Tailwind CSS setup from T-04.
- Shared components for the design principles, empty states, loading, and errors ([UX design §2.1](02-UX-DESIGN.md#21-design-principles), [§2.7](02-UX-DESIGN.md#27-empty-states-loading-and-errors)).
- Mobile-first layout from 360 px wide, with a desktop layout.

**Acceptance criteria:** AC-99.

**Done when:** the shell renders in both languages on a phone-size screen with no accessibility violations reported by the automated checks.

### T-06 Production deployment

**Epic:** E-08 · **Stories:** None · **Type:** DevOps · **Increment:** 1 · **Delivery:** D3 · **Size:** M · **Depends on:** T-04

**Goal:** the app live on a public URL, deploying automatically from `main`.

**Scope:**

- Vercel project linked to the repository, Neon production database, and Google OAuth production client.
- Environment variables set in Vercel ([Infrastructure §7](06-INFRASTRUCTURE.md#7-configuration)).
- Build command that applies migrations before building ([Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process)).
- Setup checklist in the repository for the manual steps.

**Done when:** merging to `main` deploys, and a person can sign in with Google on the public URL.

### T-07 Groups, memberships, and access

**Epic:** E-02 · **Stories:** US-07, US-01, US-04 · **Type:** Backend · **Increment:** 2 · **Delivery:** D2 · **Size:** M · **Depends on:** T-03

**Goal:** every user belongs to the right groups, and can reach only their data.

**Scope:**

- Getting started: a new user without an invitation gets a group and a first list (BR-06).
- `GET /me`, `GET /groups`, `GET /groups/{groupId}` ([API §2](05-API.md#2-endpoints)).
- Permission tests across two groups using the seed data.

**Acceptance criteria:** AC-01, AC-24, AC-26.

### T-08 Invitations

**Epic:** E-02 · **Stories:** US-04 · **Type:** Full stack · **Increment:** 2 · **Delivery:** D3 · **Size:** L · **Depends on:** T-07, T-05, T-20

**Goal:** a member invites a member or a buyer with a link sent on WhatsApp, and the invitee joins.

**Scope:**

- Create, list, and cancel invitations, and the preview, accept, and decline endpoints, for both types, with the optional invitee name (FR-06, BR-08, BR-09, BR-32). This includes the migration that adds `invitee_name` and the `declined` status, and the name and a declined invitation in the seed data ([Data model](04-DATA-MODEL.md#2-entities)). A user who signs up through an invitation skips getting started, through the optional invitation code on `POST /me/onboarding`, unless they decline it (BR-06).
- Members' emails and buyers' WhatsApp numbers in `GET /groups/{groupId}` (FR-07, BR-12).
- The Toast component in `src/components/ui` ([DESIGN.md, Toast](../DESIGN.md#toast)).
- Group screen with **Invite a member** and **Invite a buyer**, members, buyers, and pending invitations, replacing the placeholder from T-05 ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)), built to [DESIGN.md](../DESIGN.md) and `design/stitch/08-group`.
- Invitation screen at `/invitations/{code}` with sign-in, One last step, Accept, and Decline ([UX design §1](02-UX-DESIGN.md#1-user-flows), flow C), built to DESIGN.md and `design/stitch/03-invitation`.
- Share on WhatsApp and copy link, with the invitation message in [UX design §2.6](02-UX-DESIGN.md#26-whatsapp-and-email-content).

**Acceptance criteria:** AC-10, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16, AC-100, AC-101, AC-102.

### T-09 Lists and items API

**Epic:** E-04 · **Stories:** US-10, US-07, US-11, US-12, US-13 · **Type:** Backend · **Increment:** 3 · **Delivery:** D2 · **Size:** M · **Depends on:** T-07

**Goal:** members create lists and items, and edit or delete them within the rules.

**Scope:**

- List and create lists, without the archived lists, which come with archiving in milestone 2 (FR-12); list the items in a list ([API §2](05-API.md#2-endpoints)).
- Create, read, edit, and delete items, including moving an item to another list (FR-13, FR-16), with the status limits in BR-19 and the item version (BR-20).
- Creation and status changes written to the status history (BR-26).

**Acceptance criteria:** AC-25, AC-27, AC-38, AC-39, AC-40, AC-41, AC-45, AC-47, AC-48, AC-50, AC-51.

### T-10 Lists screen, item form, and item page

**Epic:** E-04 · **Stories:** US-10, US-07 · **Type:** Frontend · **Increment:** 3 · **Delivery:** D2 · **Size:** L · **Depends on:** T-09, T-05

**Goal:** a member requests an item in seconds and sees it in the list.

**Scope:**

- Lists screen with quick add, list switcher, and filters ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)), replacing the placeholder from T-04.
- Item form with the fields in FR-13 except the recipient, which T-13 adds, validated as the user types (FR-39). The link is stored and opens in the store (FR-23); the lookup of title and image comes in milestone 2.
- Item page for members, with the actions for each status ([UX design §2.5](02-UX-DESIGN.md#25-item-statuses-and-actions)). "I'll buy it" calls the reservation endpoint from T-11; T-12 verifies the tap.
- Refresh, and the "This item changed" handling (AC-67, AC-68 are verified in T-12).

**Acceptance criteria:** AC-23, AC-38 (interface), AC-40 (interface), AC-95.

### T-11 Status changes: reserve, release, purchase

**Epic:** E-05 · **Stories:** US-15, US-14, US-16 · **Type:** Backend · **Increment:** 4 · **Delivery:** D2 · **Size:** M · **Depends on:** T-09

**Goal:** the buying part of the core cycle, safe against double purchases.

**Scope:**

- Reserve as a single conditional update, so the first of two requests wins (BR-23); release; purchase with an optional buyer note (FR-24, FR-25).
- Only the transitions in BR-22 for these actions, each recorded in the status history.
- `GET /me/to-buy` and `GET /me/purchases` (FR-21).

**Acceptance criteria:** AC-58 (API), AC-59, AC-60, AC-61, AC-62 (API).

### T-12 To buy, My purchases, and buyer actions

**Epic:** E-05 · **Stories:** US-14, US-15 · **Type:** Frontend · **Increment:** 4 · **Delivery:** D3 · **Size:** M · **Depends on:** T-11, T-10

**Goal:** a buyer finds what to buy, reserves it, and marks it as purchased.

**Scope:**

- To buy, grouped by person with group and list filters; My purchases ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)). Both replace the placeholders from T-05.
- Buyer's item page: notes first, then the person's details, "Open in store", "I'll buy it", "I bought it", and release (FR-15, FR-22, FR-23).
- Reservation conflict and changed-item messages, and Refresh.

**Acceptance criteria:** AC-56, AC-57, AC-58 (interface), AC-67, AC-68.

### T-13 People and their details

**Epic:** E-03 · **Stories:** US-09 · **Type:** Full stack · **Increment:** 3 · **Delivery:** D3 · **Size:** M · **Depends on:** T-10

**Goal:** members keep each person's sizes and preferences, and buyers see them on items.

**Scope:**

- Recipients and their free-form details: create, read, and edit (FR-09, FR-10). Deleting people is milestone 2.
- People screen, replacing the placeholder from T-05, and person page; recipient selection on the item form.
- Recipient details shown to buyers only inside items (FR-22, BR-12).

**Acceptance criteria:** AC-35, AC-36, AC-37.

### T-14 Couldn't buy it and the item timeline

**Epic:** E-05 · **Stories:** US-16, US-13 · **Type:** Full stack · **Increment:** 4 · **Delivery:** D3 · **Size:** M · **Depends on:** T-12

**Goal:** buyers can report what they couldn't buy, and everyone sees each item's history.

**Scope:**

- "Couldn't buy it" with a required note (FR-26, BR-25); a member's edit returns the item to pending (BR-19).
- Timeline on the item page (FR-32, BR-26).

**Acceptance criteria:** AC-50 (interface), AC-62 (interface), AC-63.

### T-15 Delivery addresses

**Epic:** E-06 · **Stories:** US-18 · **Type:** Full stack · **Increment:** 5 · **Delivery:** D3 · **Size:** M · **Depends on:** T-08

**Goal:** each group keeps the addresses its items can be sent to.

**Scope:**

- Add, edit, delete, and make default (FR-27, BR-27); buyers can view them.
- Delivery addresses in the Group screen and the address form ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)), built to [DESIGN.md](../DESIGN.md) and `design/stitch/08-group`, the form from its `addAddressModal` sheet. Saving, deleting, and making an address the default show the toast ([UX design §2.7](02-UX-DESIGN.md#27-empty-states-loading-and-errors)).

**Acceptance criteria:** AC-77, AC-78, AC-79.

### T-16 Marking items as shipped

**Epic:** E-06 · **Stories:** US-19, US-21 · **Type:** Full stack · **Increment:** 5 · **Delivery:** D3 · **Size:** L · **Depends on:** T-12, T-15

**Goal:** the buyer records one shipment for one or several items, and everyone sees when, how, and where they were sent.

**Scope:**

- `POST /groups/{groupId}/shipments` with the rules in BR-28, copying the delivery address into the shipment.
- Mark as shipped sheet: select several purchased items, the default address preselected, copy address, form starting with the last agency and service (FR-28, FR-29).
- Shipping block on shipped items, with the other items in the same shipment (FR-30).

**Acceptance criteria:** AC-69, AC-70, AC-71, AC-72, AC-73, AC-74, AC-75, AC-76.

### T-17 End-to-end test of the core cycle and test suite completion

**Epic:** E-08 · **Stories:** None · **Type:** QA · **Increment:** all of milestone 1 · **Delivery:** D3 · **Size:** M · **Depends on:** T-16

**Goal:** proof that the core cycle works end to end, and that every milestone 1 acceptance criterion is tested.

**Scope:**

- Browser test of flows A, B, C, E, and F in one scenario, in Spanish and in English, on a phone-size screen in Chromium and in WebKit: sign-up, add an item, invite a buyer, reserve, purchase, and ship ([Security and testing §2](07-SECURITY-AND-TESTING.md#2-testing-strategy)).
- Report listing every milestone 1 acceptance criterion and the test that covers it.
- Automated accessibility checks on every milestone 1 screen.

**Done when:** every acceptance criterion tagged M1 has a passing test, and the domain services meet the coverage target ([Security and testing §2.6](07-SECURITY-AND-TESTING.md#26-coverage-targets)).

### T-18 Deployment evidence and final documentation

**Epic:** E-08 · **Stories:** None · **Type:** Documentation · **Increment:** all of milestone 1 · **Delivery:** D3 · **Size:** S · **Depends on:** T-17 and the design tickets, T-21 to T-35

**Goal:** everything the final course delivery requires, besides the code.

**Scope:**

- Public URL, screenshots, and a short video of the core cycle on the deployed app.
- README updated: project and repository URLs, installation commands as built, design screenshots, and work tickets and pull requests sections.
- `prompts.md` complete for the build.

### T-19 Tests that survive a restyle

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** all of milestone 1 · **Delivery:** D2 · **Size:** S · **Depends on:** none

**Goal:** the tests check behavior rather than markup or styling, so the design tickets can change how screens look without breaking tests that still hold.

**Scope:**

- Review the unit and browser tests for checks that depend on markup, class names, or styling. Change them to find elements by role, label, or translated text.
- The AC-95 browser test checks the notes element for injected markup, instead of counting every `b`, `img`, and `script` in the main area, which a restyle can add.
- Keep the layout checks that come from [DESIGN.md](../DESIGN.md): sidebar width, content width, and no sideways scroll at 360 px. The restyle has to keep these rules.
- Run the automated accessibility checks on every screen built so far in each of its main states, such as each item status, so a token that fails contrast also fails a test. Screens built later get their checks in their own tickets and in T-17.

**Done when:** no test depends on markup or styling that a restyle may change, and all tests pass.

### T-20 Design tokens and base components

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** all of milestone 1 · **Delivery:** D2 · **Size:** M · **Depends on:** T-19, T-05

**Goal:** every screen draws on the tokens and components in DESIGN.md.

**Scope:**

- The Tailwind theme in `src/app/globals.css`: colors, status colors, typography (Plus Jakarta Sans), radius, and spacing, from the front matter of [DESIGN.md](../DESIGN.md).
- The components in `src/components/ui`, restyled to [DESIGN.md, Components](../DESIGN.md#components): buttons, inputs, checkbox, switch, dialog, dropdown menu, and skeleton, with the focus ring and touch targets it defines.
- The app shell in `src/components/app-shell` (header, group selector, Refresh, and navigation) and the status chip, which appear on every screen ([DESIGN.md, Navigation](../DESIGN.md#navigation) and [Status Chips](../DESIGN.md#status-chips)).

**Done when:** the theme, the components, the app shell, and the status chip follow DESIGN.md, and all tests pass.

### T-21 Welcome design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 1 · **Delivery:** D2 · **Size:** S · **Depends on:** T-20, T-04

**Goal:** Welcome looks like its approved Stitch screen.

**Screens:** Welcome (screen 1) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/01-welcome`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-22 One last step design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 1 · **Delivery:** D2 · **Size:** S · **Depends on:** T-20, T-04

**Goal:** One last step looks like its approved Stitch screen.

**Screens:** One last step (screen 2) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/02-one-last-step`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-23 Invitation design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 2 · **Delivery:** D3 · **Size:** S · **Depends on:** T-20, T-08

**Goal:** check that the Invitation screen built by T-08 follows DESIGN.md and its Stitch screen, `03-invitation`.

**Screens:** Invitation (screen 3), in each of its states ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/03-invitation`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-24 Lists design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 3 · **Delivery:** D2 · **Size:** M · **Depends on:** T-20, T-10

**Goal:** Lists looks like its approved Stitch screen.

**Screens:** Lists (screen 4), with its loading and empty states and the New list sheet ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/04-lists`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Sheet test:** New list opens as the dialog's `sheet` variant, the first screen to use it, and this ticket adds the sheet's first browser test, following [DESIGN.md, Collapsible Groups & Sheets](../DESIGN.md#collapsible-groups--sheets): the close button has first focus at every screen size, it and Escape close the sheet, its label comes from the translation files in Spanish and English, the actions stay at the bottom edge below 768 px, and the sheet opens as a centered dialog from 768 px.

**Done when:** the screen follows DESIGN.md and its Stitch screen, the sheet test passes, and all tests pass.

### T-25 Item form design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 3 · **Delivery:** D3 · **Size:** M · **Depends on:** T-20, T-10, T-13

**Goal:** The item form looks like its approved Stitch screen.

**Screens:** Add or edit item (screen 5) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/05-item-form`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-26 Item page design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 5 · **Delivery:** D3 · **Size:** M · **Depends on:** T-20, T-12, T-13, T-14, T-16

**Goal:** The item page looks like its approved Stitch screen.

**Screens:** Item page (screen 6), for each status and role, with its loading state and the delete item confirmation ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/06-item-page`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-27 People design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 3 · **Delivery:** D3 · **Size:** M · **Depends on:** T-20, T-13

**Goal:** People looks like its approved Stitch screen.

**Screens:** People (screen 7): the list of people and the person page ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/07-person-list`, `design/stitch/07-person-detail`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-28 Group design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 5 · **Delivery:** D3 · **Size:** S · **Depends on:** T-20, T-08, T-15

**Goal:** check that the Group screen built by T-08 and T-15 follows DESIGN.md and its Stitch screen, `08-group`.

**Screens:** Group (screen 8), with delivery addresses and the address form ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/08-group` only, with the address form as its `addAddressModal` sheet, and the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** at 360 px, 390 px, and desktop, in Spanish and English, the screen follows DESIGN.md and `08-group` in every state: no buyers, no pending invitations, an invitation with and without a name, no addresses, 10 addresses, the address form when adding and when editing, an owner and a non-owner member, and the toast shown. The Group rows in `design/screens.md` are Restyled, and all tests pass.

### T-29 To buy design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 4 · **Delivery:** D3 · **Size:** S · **Depends on:** T-20, T-12, T-13

**Goal:** To buy looks like its approved Stitch screen.

**Screens:** To buy (screen 9) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/09-to-buy`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-30 My purchases design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 5 · **Delivery:** D3 · **Size:** S · **Depends on:** T-20, T-12, T-13, T-16

**Goal:** My purchases looks like its approved Stitch screen.

**Screens:** My purchases (screen 10) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/10-my-purchases`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-31 Mark as shipped design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 5 · **Delivery:** D3 · **Size:** S · **Depends on:** T-20, T-16

**Goal:** The Mark as shipped sheet looks like its approved Stitch screen.

**Screens:** Mark as shipped (screen 11) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/11-mark-as-shipped`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Sheet test:** the screen opens as the dialog's `sheet` variant, and this ticket adds a browser test that runs the checks of [T-24's sheet test](#t-24-lists-design) on the Mark as shipped sheet.

**Done when:** the screen follows DESIGN.md and its Stitch screen, the sheet test passes, and all tests pass.

### T-32 Profile design

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 1 · **Delivery:** D2 · **Size:** S · **Depends on:** T-20, T-04

**Goal:** Profile looks like its approved Stitch screen.

**Screens:** Profile (screen 12) ([UX design §2.3](02-UX-DESIGN.md#23-screens)).

**Stitch folders:** `design/stitch/12-profile`, with the differences to ignore listed in [DESIGN.md, Using the Stitch Screens](../DESIGN.md#using-the-stitch-screens).

**Done when:** the screen follows DESIGN.md and its Stitch screen, and all tests pass.

### T-33 Design for screens and states without a Stitch screen

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** 5 · **Delivery:** D3 · **Size:** M · **Depends on:** T-20, T-14

**Goal:** the parts of the app with no Stitch screen match the rest of the design.

**Screens:** the "No lo pude comprar" sheet (T-14), and the shared empty, loading, and error states (T-05), built from [UX design §2.4](02-UX-DESIGN.md#24-key-screens) and [§2.7](02-UX-DESIGN.md#27-empty-states-loading-and-errors).

**Stitch folders:** none. The ticket uses the components in [DESIGN.md](../DESIGN.md).

**Done when:** these screens and states follow DESIGN.md, and all tests pass.

### T-34 Bottom bar height

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** all of milestone 1 · **Delivery:** D2 · **Size:** S · **Depends on:** T-20

**Goal:** the bottom bar never covers **+ Agregar**.

**Problem:** at 360 px with four tabs, "My purchases" wraps onto three lines, the bar grows past the 64 px that **+ Agregar**'s position assumes, and it covers the button. Found in T-24; it was already there before.

**Done when:** in Spanish and English at 360 px and 390 px, with three, four, and five tabs: tab labels take at most two lines without breaking a word, going below 16 px, or being cut short; labels in neighboring tabs are at least 10 px apart and every tab is at least 48 px wide; **+ Agregar** is placed from the bar's real height and is fully visible; it isn't covered before the page's JavaScript runs; and all tests pass.

### T-35 Custom text sizes in cn()

**Epic:** E-08 · **Stories:** None · **Type:** Design · **Increment:** all of milestone 1 · **Delivery:** D2 · **Size:** S · **Depends on:** T-20

**Goal:** every component renders the text size, color, spacing, and shadow [DESIGN.md](../DESIGN.md) gives it.

**Problem:** tailwind-merge in `cn()` doesn't know the theme's own text sizes, spacing, and shadows in `src/app/globals.css`, so it sorts their classes into the wrong groups:

- **Text sizes:** it reads the custom text-size classes (`text-body-md`, `text-label-lg`, and the other sizes in DESIGN.md) as text colors, so when a size and a color meet in one `cn()` call, the later class drops the other. The size is dropped, and the text takes its parent's size instead, in `Button` (every variant), `Input`, `Textarea`, and the selects that share their classes, `Label`, `DialogDescription`, `DropdownMenuLabel`, `DropdownMenuItem` when given a color (the item menu's delete action), `StatusChip`, the language switch, and the Lists filter chips. One color is dropped: the onboarding terms label passes `text-body-lg` to `Label`, which drops `Label`'s `text-foreground`; the label inherits the same color, so its contrast is unchanged. Found in T-34, which works around it in the tab bar only.
- **Shadows:** it reads `shadow-card`, `shadow-floating`, and `shadow-dialog` as shadow colors, so a later `shadow-none` doesn't replace them and the result depends on the order of the CSS. The dashed "choose an item" slot on Lists keeps both `shadow-card` and `shadow-none`. Found in T-24's review.
- **Spacing:** it doesn't recognize the spacing classes (`px-margin`, `gap-gutter-desktop`, and the other spacing tokens), so a later spacing class next to one doesn't replace it.

**Done when:** `cn()` keeps both the custom text sizes and the colors, and a later class replaces an earlier one of the same kind for the theme's text sizes, spacing, and shadows; every place where a merge gives a different result is listed in the pull request; the dashed "choose an item" slot has no shadow; the tab bar's workaround is removed; a unit test covers the merge and fails if a text size, spacing, or shadow in `src/app/globals.css` isn't registered in `cn()`; Lists, the tab bar, and the New list sheet are checked at 360 px and 1280 px, and the item page's left column at 1280 px; and all tests pass.
