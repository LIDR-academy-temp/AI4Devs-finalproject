# ComproParaTi: Assisted Shopping Platform

A web application where families keep shared lists of the products they need, and the relatives they invite reserve, buy, and ship those items.

**Documentation:** this README answers each section of the project documentation template and links to the full detail in [`docs/`](docs/). Every rule and requirement lives in one place: the [PRD](docs/01-PRD.md) for the product, and the technical documents for how it is built.

| Document | Contents |
| --- | --- |
| [01-PRD.md](docs/01-PRD.md) | Product overview, business rules, requirements, user stories, acceptance criteria, traceability |
| [02-UX-DESIGN.md](docs/02-UX-DESIGN.md) | User flows, screens, wireframes, messages, Spanish strings |
| [03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) | C4 diagrams, components, technology stack, project structure, technical decisions |
| [04-DATA-MODEL.md](docs/04-DATA-MODEL.md) | Entity diagram, entities, seed data |
| [05-API.md](docs/05-API.md) | API conventions, endpoints, errors, OpenAPI definitions |
| [06-INFRASTRUCTURE.md](docs/06-INFRASTRUCTURE.md) | Environments, deployment, scheduled jobs, backups, configuration |
| [07-SECURITY-AND-TESTING.md](docs/07-SECURITY-AND-TESTING.md) | Security practices, rate limits, testing strategy |
| [08-WORK-TICKETS.md](docs/08-WORK-TICKETS.md) | Work tickets for milestone 1 and their tracking in GitHub Issues |
| [prompts.md](prompts.md) | Record of AI usage: prompts and full conversations |

## Index

0. [Project sheet](#0-project-sheet)
1. [Product overview](#1-product-overview)
2. [System architecture](#2-system-architecture)
3. [Data model](#3-data-model)
4. [API specification](#4-api-specification)
5. [User stories](#5-user-stories)
6. [Work tickets](#6-work-tickets)
7. [Pull requests](#7-pull-requests)

---

## 0. Project sheet

### 0.1. Full name

Odalys Jordan Enriquez

### 0.2. Project name

**ComproParaTi** ("I buy for you"), an assisted shopping platform.

### 0.3. Brief project description

Families keep shared lists of what they need, with each person's sizes and preferences. The relatives they invite as buyers reserve items, buy them, and record each shipment, so everyone sees where each item stands, from the request to the shipment. Conversations stay on WhatsApp, one tap away from any item. Payment and shipping happen outside the platform.

### 0.4. Project URL

Pending the first deployment.

### 0.5. Repository URL or compressed file

[github.com/ojordan0/AI4Devs-finalproject](https://github.com/ojordan0/AI4Devs-finalproject)

---

## 1. Product overview

### 1.1. Objective

Many people, often immigrants, buy products for relatives in countries where those products are hard to find or cannot be bought online. Today the requests are scattered across emails, phone calls, and WhatsApp messages: sizes get lost, two relatives buy the same thing, and nobody is sure what was shipped. The platform gives each family one shared list, prevents duplicate purchases through reservations, and records when, how, and where each item was shipped. It is designed for members and buyers in the United States, Cuba, and Central and South America, including older adults with little digital experience.

**Full documentation:** [PRD §1 Product summary](docs/01-PRD.md#1-product-summary) and [§2 Users](docs/01-PRD.md#2-users)

### 1.2. Main features and functionality

- **Groups and invitations:** a shared space for a family, joined through a link shared on WhatsApp.
- **People:** each recipient's sizes and preferences as free-form details.
- **Lists and items:** a name is enough to request something; a pasted store link fills in the title and image.
- **Reservation:** "I'll buy it" claims an item so nobody else buys it.
- **Shipping:** delivery addresses, and a record of when, how, and where items were sent.
- **Status and timeline:** every item shows its status and who changed it, with undo for mistakes.
- **WhatsApp and email:** one tap to message the right person, and a daily summary email.
- **Spanish and English** throughout.

**Full documentation:** [PRD §3 Main features](docs/01-PRD.md#3-main-features) and [§13 Functional requirements](docs/01-PRD.md#13-functional-requirements)

### 1.3. Design and user experience

The product is built around one cycle: **request → reserve → purchase → ship**. There is one interface for everyone, with no modes: each person sees only the screens and buttons their role allows. Screens are mobile first, with large text and buttons and short flows. The UX design includes the user flows, wireframes of the key screens, the item statuses and actions, and every message in Spanish and English. Screenshots and a walkthrough video will be added after the build.

**Full documentation:** [UX design](docs/02-UX-DESIGN.md)

### 1.4. Installation instructions

Planned local setup (the exact commands are confirmed during the build):

1. Install Node.js and Docker.
2. Clone the repository and copy `.env.example` to `.env`.
3. Run `npm run setup`. It installs dependencies, starts a local Postgres in Docker, applies the migrations, and loads the seed data.
4. Run `npm run dev` and open the app. A development-only sign-in lets you enter as a seed user without Google credentials.

**Full documentation:** [Infrastructure §2 Environments](docs/06-INFRASTRUCTURE.md#2-environments), [§7 Configuration](docs/06-INFRASTRUCTURE.md#7-configuration), and [Data model §3 Seed data](docs/04-DATA-MODEL.md#3-seed-data)

---

## 2. System architecture

### 2.1. Architecture diagram

A **modular monolith** with a **layered architecture**: one Next.js application serves the interface and a REST API, with domain services that enforce the business rules, a data access layer, and adapters for outside services. It was chosen because one codebase and one deployment suit a small team and AI-assisted development, it runs on free hosting plans, and it keeps the business rules testable without the interface. The trade-offs are that the interface and the API scale together, and that the layering needs discipline. The architecture is documented with C4 diagrams: system context (level 1), containers (level 2), and components (level 3).

**Full documentation:** [Architecture §1.1 Architecture and pattern](docs/03-ARCHITECTURE.md#11-architecture-and-pattern), with the diagrams in [§1.2 System context](docs/03-ARCHITECTURE.md#12-system-context-c4-level-1), [§1.3 Containers](docs/03-ARCHITECTURE.md#13-containers-c4-level-2), and [§1.4 Components](docs/03-ARCHITECTURE.md#14-components-c4-level-3)

### 2.2. Description of main components

Web interface (Next.js, React, TypeScript), REST API (Next.js route handlers), authentication (Better Auth with Google), domain services, data access (Drizzle with Postgres on Neon), link lookup, file storage (Vercel Blob), email (Resend), the daily email job (Vercel Cron), translations, and the rate limiter.

**Full documentation:** [Architecture §1.4 Components](docs/03-ARCHITECTURE.md#14-components-c4-level-3), [§1.5 Technology stack](docs/03-ARCHITECTURE.md#15-technology-stack), and [§1.6 Dependencies](docs/03-ARCHITECTURE.md#16-dependencies), the full list of packages

### 2.3. High-level project description and file structure

The code is grouped by layer first and by capability second: pages and API routes under `src/app`, server-only code (services, database, authentication, adapters) under `src/server`, shared validation schemas under `src/shared`, translations under `src/i18n`, and tests under `tests/`.

**Full documentation:** [Architecture §2 Project structure](docs/03-ARCHITECTURE.md#2-project-structure)

### 2.4. Infrastructure and deployment

The app runs on Vercel, with Postgres on Neon, thumbnails on Vercel Blob, and email through Resend, all on free plans. Every pull request runs linting, type checks, and all tests in GitHub Actions; merging to `main` deploys to production after applying database migrations. A daily job sends the summary emails, and a daily backup is stored outside the database provider.

**Full documentation:** [Infrastructure and deployment](docs/06-INFRASTRUCTURE.md)

### 2.5. Security

Google sign-in with no passwords, secure session cookies, authorization checked per group on every request, request validation, protection against cross-site request forgery and server-side request forgery in link lookups, rate limits, security headers, and minimal personal data that is erased when an account is deleted.

**Full documentation:** [Security and testing §1 Security](docs/07-SECURITY-AND-TESTING.md#1-security)

### 2.6. Tests

Unit tests for the business rules, integration tests for every API endpoint against a separate test database, browser tests of the main flows in Spanish and English (Chromium, plus WebKit for the core cycle), automated accessibility checks, and a usability test with older adults before launch. The whole suite runs locally with Docker and no outside services. Every acceptance criterion has at least one automated test named with its ID, and the domain services have at least 80% line coverage.

**Full documentation:** [Security and testing §2 Testing strategy](docs/07-SECURITY-AND-TESTING.md#2-testing-strategy)

---

## 3. Data model

The data is relational and lives in Postgres. Everything a family shares belongs to a group: its members and buyers, the people they buy for, their lists and items, and the shipments that carry those items. Every status change is recorded, so each item keeps its full history from request to shipment.

### 3.1. Data model diagram

The model is drawn as four Mermaid entity diagrams. An overview shows how the data is owned, from users to groups to items. Then one diagram per area (accounts, groups, and access; requests and buying; shipping) shows each entity's attributes, primary keys, foreign keys, unique keys, and relationships.

**Full documentation:** [Data model §1 Data model diagram](docs/04-DATA-MODEL.md#1-data-model-diagram)

### 3.2. Description of main entities

The 14 entities fall into the same three areas as the diagrams:

| Area | Entity | What it holds |
| --- | --- | --- |
| Accounts, groups, and access | `users` | A person with an account: name, email, language, WhatsApp number, and email setting. Kept after account deletion, with the personal data erased, so the history stays intact. |
| | `accounts`, `sessions`, `verifications` | Google sign-in identities, active sessions, and the short-lived values used while signing in. |
| | `groups` | A family's shared space, with one owner. |
| | `memberships` | Who belongs to each group, as a member or a buyer. |
| | `invitations` | Single-use links to join a group as a member or a buyer. |
| Requests and buying | `recipients`, `recipient_details` | The people a group buys for, with their sizes and preferences. |
| | `lists` | A group's lists of what it needs; lists can be archived. |
| | `items` | One requested product: name, notes, link, quantity, recipient, status, and buyer. |
| | `status_history` | Each item's timeline: its creation and every status change, with who made it and when. |
| Shipping | `delivery_addresses` | Where a group's items can be sent, with one default address. |
| | `shipments` | A buyer's shipment: date, agency, maritime or air service, the items it includes, and a copy of the address as shipped. |

**Full documentation:** [Data model §2 Entities](docs/04-DATA-MODEL.md#2-entities), with every attribute, its type, and its constraints

---

## 4. API specification

The web interface works through a REST API, which a native app could reuse later. All endpoints share the same conventions: they live under `/api/v1`, exchange JSON, authenticate with the session cookie, and return errors in one format, with a code the interface acts on and a message in the user's language.

**All endpoints:** [API §2 Endpoints](docs/05-API.md#2-endpoints) lists all 44 endpoints, grouped by resource, with the business rules each one applies. The conventions and error codes are in [API §1](docs/05-API.md#1-conventions).

The three endpoints of the core cycle are also defined in OpenAPI 3.1, with request and response examples:

- `POST /lists/{listId}/items`: request an item.
- `POST /items/{itemId}/reservation`: reserve an item ("I'll buy it").
- `POST /groups/{groupId}/shipments`: mark one or more items as shipped.

**OpenAPI definition:** [API §3 OpenAPI definition of the main endpoints](docs/05-API.md#3-openapi-definition-of-the-main-endpoints)

---

## 5. User stories

**User story 1 (US-10, [#10](https://github.com/ojordan0/AI4Devs-finalproject/issues/10)):** As a member, I want to add an item by typing only its name, so that requesting something takes seconds.

**User story 2 (US-15, [#15](https://github.com/ojordan0/AI4Devs-finalproject/issues/15)):** As a buyer, I want to reserve an item, so that nobody else buys it too.

**User story 3 (US-19, [#19](https://github.com/ojordan0/AI4Devs-finalproject/issues/19)):** As a buyer, I want to record one shipment for several items, with the address ready to copy, so that shipping a box takes one step.

The 26 stories are grouped into 8 epics, which also show what each milestone delivers. Each story is linked to its requirements and acceptance criteria, and is tracked as an issue in GitHub.

**Full documentation:** [PRD §14.1 Epics](docs/01-PRD.md#141-epics) and [§14.2 User stories](docs/01-PRD.md#142-user-stories)

---

## 6. Work tickets

Milestone 1 is split into 18 tickets, each with its epic, user stories, type, increment, course delivery, size, dependencies, scope, and the acceptance criteria it must pass. Stories and tickets are tracked in [GitHub Issues](https://github.com/ojordan0/AI4Devs-finalproject/issues), with a [board](https://github.com/users/ojordan0/projects/1) in a GitHub Project linked to the repository. Three representative tickets:

**Ticket 1 (database), T-02 Database schema, migrations, and seed data ([#28](https://github.com/ojordan0/AI4Devs-finalproject/issues/28)):** the complete data model in Postgres with Drizzle, including every constraint and index, the first migration, and a seed script that covers every status and permission case. Done when `npm run setup` builds the database from scratch with seed data and the constraint tests pass in CI.

**Ticket 2 (backend), T-11 Status changes: reserve, release, purchase ([#37](https://github.com/ojordan0/AI4Devs-finalproject/issues/37)):** reservation as a single conditional update so the first of two buyers wins, release, and purchase with an optional note, each recorded in the item's history, plus the To buy and My purchases endpoints. Verified by AC-58 to AC-62.

**Ticket 3 (frontend), T-10 Lists screen, item form, and item page ([#36](https://github.com/ojordan0/AI4Devs-finalproject/issues/36)):** quick add, the list switcher and filters, the item form validated as the user types, and the member's item page with the actions for each status.

**Full documentation:** [Work tickets](docs/08-WORK-TICKETS.md), including [tracking in GitHub](docs/08-WORK-TICKETS.md#2-tracking-in-github)

---

## 7. Pull requests

Documented during development.
