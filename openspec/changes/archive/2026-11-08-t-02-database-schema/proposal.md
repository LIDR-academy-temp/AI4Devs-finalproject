# T-02 Database schema, migrations, and seed data

**Issue:** [#28](https://github.com/ojordan0/AI4Devs-finalproject/issues/28) · **Ticket:** [docs/08-WORK-TICKETS.md, T-02](../../../docs/08-WORK-TICKETS.md#t-02-database-schema-migrations-and-seed-data) · **Branch:** `feat/t-02-database-schema`

**Covers:** Epic E-08. Stories: none. Functional requirements: none. Acceptance criteria: none with an ID; this is foundation work, verified by the ticket's criteria and "Done when" statement. Business rules whose data this schema stores or partly enforces: BR-02, BR-03, BR-04, BR-05, BR-07, BR-08, BR-11, BR-15, BR-17, BR-19, BR-20, BR-22, BR-23, BR-25, BR-26, BR-27, BR-28, BR-31, BR-32. The services that apply these rules belong to later tickets.

## Why

The database has no tables, so no ticket that stores data can start: T-03 depends directly on this one, and every backend ticket depends on it through T-03. D2 is due on November 19, 2026. Later tests also need the same known data to start from, covering each item status and each kind of access.

## What Changes

- **Schema:** every table, enumeration, constraint, and index in [Data model §2](../../../docs/04-DATA-MODEL.md#2-entities), defined with Drizzle, including the milestone 2 table `job_runs`, so later increments add no structural migrations.
- **Database checks:** every rule in §2's Constraints column that can be decided from one row without the current time: quantity range, buyer and status, shipment and status, the required "unavailable" note, phone format, link scheme, and country format.
- **Partial unique index:** at most one default delivery address per group.
- **First migration:** generated with drizzle-kit and applied by `npm run db:migrate`.
- **Seed data:** the data in [Data model §3](../../../docs/04-DATA-MODEL.md#3-seed-data), safe to load again, and refused on any database that isn't local.
- **Clean test data:** each integration test file and each browser test run starts from a freshly seeded test database, as [Security and testing §2.3](../../../docs/07-SECURITY-AND-TESTING.md#23-test-data-and-isolation) requires. Until now there was nothing to reset.
- **Integration tests** proving that each constraint rejects invalid data and that the seed loads into an empty database.
- **Migration check in CI:** every pull request fails when the schema has a change with no generated migration. Without it, a changed check or a new index that no test exercises would never reach a database, with no error. The ticket doesn't ask for this; it was added during review, and the ticket and [Infrastructure §3](../../../docs/06-INFRASTRUCTURE.md#3-deployment-process) will list it.
- **Documents updated first**, because reviewing this ticket found two places where they can't be followed as written:
  - **Which rules are database checks.** The ticket's list names three checks, while its scope says "every constraint" and [Data model §2](../../../docs/04-DATA-MODEL.md#2-entities) also lists formats and the required note. §2 will state which rules are database checks and which stay in the services, and the ticket's list will match. The ship date stays in the services, because a check can't use the clock they receive as input.
  - **Seed coverage.** [Data model §3](../../../docs/04-DATA-MODEL.md#3-seed-data) and the ticket claim every status and permission case, but the list has no ended membership (BR-11) and no cancelled invitation. §3 will add a former buyer who still has a purchased item, and a cancelled invitation.

## Capabilities

### New Capabilities

- `database-schema`: the tables and the rules the database itself enforces, and building them from migrations.
- `seed-data`: the known data for development and tests, and how it can be loaded.

### Modified Capabilities

- `developer-environment`: the database commands now create real tables and load real data, and tests start from freshly seeded data.
- `pull-request-checks`: pull requests also check that migrations match the schema.

## Non-goals

| Left out | Owner |
| --- | --- |
| Domain services, including the rules the database doesn't enforce: field limits' minimums, the ship date, the 10-address and 20-detail limits, and owners being active members | T-03 onward |
| Zod schemas and shared field limits in `src/shared/` | T-03 onward |
| Better Auth configuration, including plural table names and database-generated IDs, and the development-only sign-in | T-04 |
| Seed sign-in identities and sessions; integration tests create sessions directly, as [Security and testing §2.4](../../../docs/07-SECURITY-AND-TESTING.md#24-sign-in-outside-services-and-time) describes | T-04 |
| Applying migrations in production | T-06 |
| Drizzle relation definitions for relational queries | The first service that needs them |

## Impact

- **New files:** the first migration in `src/server/db/migrations/`, `scripts/seed-data.ts`, `scripts/reset-test-database.ts`, `tests/support/reset-database.ts`, `tests/support/factories.ts`, and integration tests.
- **Changed code:** `src/server/db/schema.ts`, `scripts/seed.ts`, `tests/support/integration-env.ts`, `playwright.config.ts`, and `.github/workflows/ci.yml`.
- **Changed documents:** `docs/04-DATA-MODEL.md`, `docs/06-INFRASTRUCTURE.md`, `docs/08-WORK-TICKETS.md`, and `prompts.md`.
- **Developer machines:** the next `npm run setup` or `npm run db:migrate` adds the tables to the existing empty database.
- **No new dependencies**, and no effect on the API or interface. Neither exists yet.
