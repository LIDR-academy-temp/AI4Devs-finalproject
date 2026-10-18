# Work tickets

**Assisted Shopping Platform: ComproParaTi** · **Version:** 1.4 (draft) · **Date:** October 17, 2026

Part of the project documentation ([readme](../readme.md)). IDs (`BR`, `FR`, `E`, `US`, `AC`) are defined in the [PRD](01-PRD.md).

---

## 1. How tickets work

- **Scope:** these tickets cover milestone 1 ([PRD §8.1](01-PRD.md#81-milestone-1-core-cycle-end-to-end)). Milestone 2 tickets are written when milestone 1 is delivered.
- **Rules live in the PRD.** A ticket says what to build and which requirements, rules, and acceptance criteria it covers. It does not restate them.
- **Epic and stories:** each ticket belongs to one epic and implements one or more user stories ([PRD §14](01-PRD.md#14-epics-and-user-stories)). The first story listed is the ticket's main story. Tickets with no story are foundation work in E-08.
- **Delivery** is the course deadline the ticket must meet: D2 or D3 ([PRD §8.1](01-PRD.md#81-milestone-1-core-cycle-end-to-end)).
- **Size:** S (up to half a day), M (one to two days), L (three to five days).
- **Spec first:** each ticket is built as one OpenSpec change, named like its branch. The change is generated from the ticket and the documents it references; its proposal links the ticket's issue, its requirements cite the PRD IDs instead of copying rule text, and each scenario is named after the acceptance criterion it verifies, for example `AC-59`. The change is reviewed before implementation and archived when the pull request is merged. If the documents leave a question open, they are updated first.
- **Branching:** one branch and one pull request per ticket, named after the ticket ID, for example `t-07-groups-api`, and merged into `main`.
- **Course deliveries:** at each deadline, the state of `main` is pushed to the delivery branch: `feature/entrega-1-OJE` for D1, `feature/entrega-2-OJE` for D2, and `final-project-OJE` for D3.

**Definition of done** for every ticket:

1. The ticket's OpenSpec change was reviewed before implementation, and is archived with the merge.
2. The listed acceptance criteria have automated tests named with their IDs ([Security and testing §2](07-SECURITY-AND-TESTING.md#2-testing-strategy)), and all tests pass in CI.
3. Linting and type checks pass, and the generated OpenAPI document is up to date.
4. Interface text comes from the translation files, in Spanish and English.
5. Any change in behavior or design is reflected in the document that owns it.
6. The work session is recorded in [prompts.md](../prompts.md).
7. The pull request is reviewed and merged to `main`.

## 2. Tracking in GitHub

User stories and tickets are tracked as issues in the project's repository, [ojordan0/AI4Devs-finalproject](https://github.com/ojordan0/AI4Devs-finalproject/issues), and moved across a board in a GitHub Project linked to the repository. GitHub Issues keeps the work next to the code: issues link to branches and pull requests, and merging a pull request closes its ticket. Only features available on a personal account are used.

| Item | How it is tracked |
| --- | --- |
| User story | An issue titled with its ID and story, for example "US-10 Add an item by typing only its name", labeled `story` and `m1`, `m2`, or both, for the milestones of its acceptance criteria. All 26 stories have an issue, including those only in milestone 2. |
| Work ticket | An issue titled with its ID and title, labeled `task`, and added as a sub-issue of its main story. Its description lists any other stories it implements. Tickets with no story have no parent. |
| Epic | Not tracked in GitHub. Epics are defined in [PRD §14.1](01-PRD.md#141-epics). |
| Delivery | A GitHub milestone for each course delivery (D1, D2, and D3) and for milestone 2 (M2), due on the dates in [PRD §8](01-PRD.md#8-release-plan-and-launch-criteria). Each ticket is assigned to its delivery. |
| Board | A GitHub Project linked to the repository, holding the tickets, in the board layout with its default columns: Todo, In Progress, and Done. |
| Pull request | One per ticket ([section 1](#1-how-tickets-work)). Its description includes `Closes #<issue>`, so merging it closes the ticket. |

Issue descriptions contain the goal, the related stories, and the acceptance criteria IDs, and link back to this document. The scope and the rules stay here and in the PRD. The labels, milestones, issues, sub-issue links, and project are created from these documents by [`scripts/setup-github-issues.py`](../scripts/setup-github-issues.py), which can be run again without creating duplicates.

## 3. Ticket overview

| ID | Title | Epic | Stories | Type | Increment | Delivery | Size | Depends on |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-01 | Repository, project scaffold, and CI | E-08 | None | DevOps | 1 | D2 | M | None |
| T-02 | Database schema, migrations, and seed data | E-08 | None | Database | 1 | D2 | L | T-01 |
| T-03 | API foundation and baseline security | E-08 | US-26 | Backend | 1 | D2 | M | T-02 |
| T-04 | Sign-in, onboarding, and basic profile | E-01 | US-01, US-02 | Full stack | 1 | D2 | L | T-03 |
| T-05 | App shell, navigation, and translations | E-08 | US-25, US-07 | Frontend | 1 | D2 | M | T-01 |
| T-06 | Production deployment | E-08 | None | DevOps | 1 | D2 | M | T-04 |
| T-07 | Groups, memberships, and access | E-02 | US-07, US-01, US-04 | Backend | 2 | D2 | M | T-03 |
| T-08 | Buyer invitations | E-02 | US-04 | Full stack | 2 | D2 | L | T-07, T-05 |
| T-09 | Lists and items API | E-04 | US-10, US-07, US-11, US-12, US-13 | Backend | 3 | D2 | M | T-07 |
| T-10 | Lists screen, item form, and item page | E-04 | US-10, US-07 | Frontend | 3 | D2 | L | T-09, T-05 |
| T-11 | Status changes: reserve, release, purchase | E-05 | US-15, US-14, US-16 | Backend | 4 | D2 | M | T-09 |
| T-12 | To buy, My purchases, and buyer actions | E-05 | US-14, US-15 | Frontend | 4 | D2 | M | T-11, T-10 |
| T-13 | People and their details | E-03 | US-09 | Full stack | 3 | D3 | M | T-10 |
| T-14 | Couldn't buy it and the item timeline | E-05 | US-16, US-13 | Full stack | 4 | D3 | M | T-12 |
| T-15 | Delivery addresses | E-06 | US-18 | Full stack | 5 | D3 | M | T-07, T-05 |
| T-16 | Marking items as shipped | E-06 | US-19, US-21 | Full stack | 5 | D3 | L | T-12, T-15 |
| T-17 | End-to-end test of the core cycle and test suite completion | E-08 | None | QA | All | D3 | M | T-16 |
| T-18 | Deployment evidence and final documentation | E-08 | None | Documentation | All | D3 | S | T-17 |

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
- GitHub Actions workflow running the checks in [Infrastructure §3](06-INFRASTRUCTURE.md#3-deployment-process), step 2, including the documentation link check.
- Branch protection on `main`: checks must pass and a review is required.
- The application is added around the documentation already in the repository: `readme.md`, `CLAUDE.md`, `prompts.md`, `docs/`, and `scripts/`.

**Done when:** a fresh clone runs `npm run setup`, `npm run dev`, `npm test`, and `npm run test:e2e` without errors, and a pull request shows all checks.

### T-02 Database schema, migrations, and seed data

**Epic:** E-08 · **Stories:** None · **Type:** Database · **Increment:** 1 · **Delivery:** D2 · **Size:** L · **Depends on:** T-01

**Goal:** the complete data model in Postgres, versioned with migrations, with seed data that covers every status and permission case.

**Scope:**

- Drizzle schema for every table, enumeration, constraint, and index in [Data model §2](04-DATA-MODEL.md#2-entities). Milestone 2 tables (`job_runs`) are included now, so later increments add no structural migrations.
- Check constraints: quantity range, buyer present only when the status requires it, shipment present only when shipped.
- Partial unique index: at most one default delivery address per group.
- First migration generated with drizzle-kit and applied by `npm run db:migrate`.
- Seed script loading the data in [Data model §3](04-DATA-MODEL.md#3-seed-data), safe to run again.

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

**Acceptance criteria:** AC-95, AC-97.

### T-04 Sign-in, onboarding, and basic profile

**Epic:** E-01 · **Stories:** US-01, US-02 · **Type:** Full stack · **Increment:** 1 · **Delivery:** D2 · **Size:** L · **Depends on:** T-03

**Goal:** a new user signs in with Google, completes onboarding, and lands in the app.

**Scope:**

- Better Auth with the Google provider, the Drizzle adapter, and database sessions (FR-01, BR-02, BR-03).
- Development-only sign-in as a seed user ([Architecture §3](03-ARCHITECTURE.md#3-technical-decisions)).
- Welcome and "One last step" screens (FR-02, FR-03), with WhatsApp validation (BR-04).
- Profile: language, WhatsApp number, email setting, and sign out (FR-04, without account deletion).

**Acceptance criteria:** AC-02, AC-03, AC-04, AC-05, AC-06, AC-98.

### T-05 App shell, navigation, and translations

**Epic:** E-08 · **Stories:** US-25, US-07 · **Type:** Frontend · **Increment:** 1 · **Delivery:** D2 · **Size:** M · **Depends on:** T-01

**Goal:** the frame every screen lives in, in both languages.

**Scope:**

- Bottom navigation and header with group selector and Refresh ([UX design §2.2](02-UX-DESIGN.md#22-navigation)), showing only the tabs the user's memberships allow (FR-08).
- Translation setup with Spanish and English message files, and date and number formatting by language (FR-37, FR-38).
- Tailwind CSS and shadcn/ui set up, with the components the shell needs.
- Shared components for the design principles, empty states, loading, and errors ([UX design §2.1](02-UX-DESIGN.md#21-design-principles), [§2.7](02-UX-DESIGN.md#27-empty-states-loading-and-errors)).
- Mobile-first layout from 360 px wide, with a desktop layout.

**Acceptance criteria:** AC-99.

**Done when:** the shell renders in both languages on a phone-size screen with no accessibility violations reported by the automated checks.

### T-06 Production deployment

**Epic:** E-08 · **Stories:** None · **Type:** DevOps · **Increment:** 1 · **Delivery:** D2 · **Size:** M · **Depends on:** T-04

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

**Acceptance criteria:** AC-01, AC-24, AC-25, AC-26.

### T-08 Buyer invitations

**Epic:** E-02 · **Stories:** US-04 · **Type:** Full stack · **Increment:** 2 · **Delivery:** D2 · **Size:** L · **Depends on:** T-07, T-05

**Goal:** a member invites a buyer with a link sent on WhatsApp, and the buyer joins.

**Scope:**

- Create, list, and cancel invitations, and the preview and accept endpoints, for the buyer type (FR-06, BR-08, BR-09).
- Group screen with members, buyers, and pending invitations; invitation screen with sign-in ([UX design §1](02-UX-DESIGN.md#1-user-flows), flow C).
- Share on WhatsApp and copy link.

**Acceptance criteria:** AC-10, AC-11, AC-12, AC-13, AC-15, AC-16.

### T-09 Lists and items API

**Epic:** E-04 · **Stories:** US-10, US-07, US-11, US-12, US-13 · **Type:** Backend · **Increment:** 3 · **Delivery:** D2 · **Size:** M · **Depends on:** T-07

**Goal:** members create lists and items, and edit or delete them within the rules.

**Scope:**

- Create lists; list the items in a list ([API §2](05-API.md#2-endpoints)).
- Create, read, edit, and delete items, including moving an item to another list (FR-13, FR-16), with the status limits in BR-19 and the item version (BR-20).
- Creation and status changes written to the status history (BR-26).

**Acceptance criteria:** AC-27, AC-38, AC-39, AC-40, AC-41, AC-45, AC-47, AC-48, AC-50, AC-51.

### T-10 Lists screen, item form, and item page

**Epic:** E-04 · **Stories:** US-10, US-07 · **Type:** Frontend · **Increment:** 3 · **Delivery:** D2 · **Size:** L · **Depends on:** T-09, T-05

**Goal:** a member requests an item in seconds and sees it in the list.

**Scope:**

- Lists screen with quick add, list switcher, and filters ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)).
- Item form with the fields in FR-13, validated as the user types (FR-39). The link is stored and opens in the store (FR-23); the lookup of title and image comes in milestone 2.
- Item page for members, with the actions for each status ([UX design §2.5](02-UX-DESIGN.md#25-item-statuses-and-actions)).
- Refresh, and the "This item changed" handling (AC-67, AC-68 are verified in T-12).

**Acceptance criteria:** AC-23, AC-38 (interface), AC-40 (interface).

### T-11 Status changes: reserve, release, purchase

**Epic:** E-05 · **Stories:** US-15, US-14, US-16 · **Type:** Backend · **Increment:** 4 · **Delivery:** D2 · **Size:** M · **Depends on:** T-09

**Goal:** the buying part of the core cycle, safe against double purchases.

**Scope:**

- Reserve as a single conditional update, so the first of two requests wins (BR-23); release; purchase with an optional buyer note (FR-24, FR-25).
- Only the transitions in BR-22 for these actions, each recorded in the status history.
- `GET /me/to-buy` and `GET /me/purchases` (FR-21).

**Acceptance criteria:** AC-58, AC-59, AC-60, AC-61, AC-62.

### T-12 To buy, My purchases, and buyer actions

**Epic:** E-05 · **Stories:** US-14, US-15 · **Type:** Frontend · **Increment:** 4 · **Delivery:** D2 · **Size:** M · **Depends on:** T-11, T-10

**Goal:** a buyer finds what to buy, reserves it, and marks it as purchased.

**Scope:**

- To buy, grouped by person with group and list filters; My purchases ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)).
- Buyer's item page: notes first, then the person's details, "Open in store", "I'll buy it", "I bought it", and release (FR-15, FR-22, FR-23).
- Reservation conflict and changed-item messages, and Refresh.

**Acceptance criteria:** AC-56, AC-57, AC-67, AC-68.

### T-13 People and their details

**Epic:** E-03 · **Stories:** US-09 · **Type:** Full stack · **Increment:** 3 · **Delivery:** D3 · **Size:** M · **Depends on:** T-10

**Goal:** members keep each person's sizes and preferences, and buyers see them on items.

**Scope:**

- Recipients and their free-form details: create, read, and edit (FR-09, FR-10). Deleting people is milestone 2.
- People screen and person page; recipient selection on the item form.
- Recipient details shown to buyers only inside items (FR-22, BR-12).

**Acceptance criteria:** AC-35, AC-36, AC-37.

### T-14 Couldn't buy it and the item timeline

**Epic:** E-05 · **Stories:** US-16, US-13 · **Type:** Full stack · **Increment:** 4 · **Delivery:** D3 · **Size:** M · **Depends on:** T-12

**Goal:** buyers can report what they couldn't buy, and everyone sees each item's history.

**Scope:**

- "Couldn't buy it" with a required note (FR-26, BR-25); a member's edit returns the item to pending (BR-19).
- Timeline on the item page (FR-32, BR-26).

**Acceptance criteria:** AC-50 (interface), AC-63.

### T-15 Delivery addresses

**Epic:** E-06 · **Stories:** US-18 · **Type:** Full stack · **Increment:** 5 · **Delivery:** D3 · **Size:** M · **Depends on:** T-07, T-05

**Goal:** each group keeps the addresses its items can be sent to.

**Scope:**

- Add, edit, delete, and make default (FR-27, BR-27); buyers can view them.
- Delivery addresses in the Group screen ([UX design §2.4](02-UX-DESIGN.md#24-key-screens)).

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

**Epic:** E-08 · **Stories:** None · **Type:** Documentation · **Increment:** all of milestone 1 · **Delivery:** D3 · **Size:** S · **Depends on:** T-17

**Goal:** everything the final course delivery requires, besides the code.

**Scope:**

- Public URL, screenshots, and a short video of the core cycle on the deployed app.
- README updated: project and repository URLs, installation commands as built, design screenshots, and work tickets and pull requests sections.
- `prompts.md` complete for the build.
