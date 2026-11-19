# Tasks

T-02 has no acceptance criteria with an ID, so no task or test carries an `AC-` prefix. Its two criteria are covered by groups 2 and 3: each constraint rejects invalid data, and the seed loads into an empty database. Of the definition of done, the OpenAPI document and translation files don't apply, because this ticket adds no endpoint and no interface text.

## 1. Documents first

- [x] 1.1 Update `docs/04-DATA-MODEL.md` §2: state which single-row rules are database checks and which stay in the services (design decision 2), and give the column details for `job_runs` and `rate_limits` (design decision 5). Update the header's version and date. Verify by reading the result against the check table in design.md, and that no rule's text is copied from the PRD.
- [x] 1.2 Update `docs/04-DATA-MODEL.md` §3: narrow the opening sentence to every item, membership, and invitation status and every permission case; add Pedro, a former buyer in the García Group whose membership has ended and who still has a purchased item; and add a cancelled invitation. Verify that each `seed-data` scenario can be traced to a line in §3.
- [x] 1.3 Update T-02 in `docs/08-WORK-TICKETS.md`: list every check from §2 in the check constraints bullet, add the migration check to its scope, and update the header. Verify that the ticket and §2 name the same checks, and that issue #28 needs no edit because it links to the ticket for its scope.
- [x] 1.4 Add the migration check to `docs/06-INFRASTRUCTURE.md` §3 step 2, saying that it runs with the tests, and update the header. Verify by reading the result against design decision 13 and the `pull-request-checks` spec.
- [x] 1.5 Verify the documents with `npm run check:links`, and confirm that the Mermaid diagrams in `docs/04-DATA-MODEL.md` still match the unchanged tables.

## 2. Schema, migration, and constraint tests

- [x] 2.1 Add the enumerations and the sign-in tables (`users`, `accounts`, `sessions`, `verifications`) to `src/server/db/schema.ts`, with the Better Auth columns and the `users` format check (design decisions 1, 2, 5). Verify with `npx tsc --noEmit`.
- [x] 2.2 Add `groups`, `memberships`, `invitations`, `recipients`, `recipient_details`, `lists`, and `delivery_addresses`, including the partial unique index and the address format checks (design decisions 2, 4). Verify with `npx tsc --noEmit`.
- [x] 2.3 Add `shipments`, `items`, and `status_history`, including the item checks, the shipment format checks, and the indexes in §2 (design decisions 2, 3, 4). Verify with `npx tsc --noEmit`, and compare each column with §2.
- [x] 2.4 Add `job_runs` and `rate_limits` (design decision 5). Verify by comparing the list of tables in the schema with §2.
- [x] 2.5 Generate the first migration with `npx drizzle-kit generate`. Verify that running it again reports no changes, that `npm run db:migrate` applies it and a second run changes nothing, that the SQL contains each named check, the partial unique index, and the delete actions in design decision 4, and that `npm run lint` passes.
- [x] 2.6 Add `tests/support/factories.ts` with small factories for valid rows, and a helper asserting the constraint name or Postgres error code of a rejected statement (design decision 12). Verify with a passing test that each factory's row is accepted.
- [x] 2.7 Test the item status rules in `tests/integration/database-schema.test.ts`, covering the requirements "Item buyer follows its status", "Item shipment follows its status", "Unavailable items keep their note", and "Item quantity range". Verify that each rejection names its check, and that temporarily removing one check from the database makes its test fail.
- [x] 2.8 Test the requirement "Stored formats", for each column it lists. Verify that each rejection names that column's check.
- [x] 2.9 Test the requirement "Unique values", including several users with no email and the default address cases. Verify that each rejection gives the unique-violation code and names the expected constraint.
- [x] 2.10 Test the requirement "Required values, enumerations, and text limits" with a table of cases covering every not-null column, enumeration, length-limited column, and foreign key in §2. Verify that each rejection gives the expected error code.
- [x] 2.11 Test the requirements "Deleting a group", "Deleting a recipient, address, or shipment", and "Users stay in the database". Verify that the group test includes shipped items in a shipment, and that a second group and the users are untouched.
- [x] 2.12 Add the migration check to the `test` job in `.github/workflows/ci.yml` (design decision 13). Verify locally by running its commands: they pass on the finished schema, and fail after temporarily adding a column and after temporarily renaming one, with neither change generating a migration. Then remove those changes and any files they generated, and confirm that `git status` shows nothing left over.

- [x] 2.13 Test the defaults in Data model §2 with minimal rows (adversarial review, finding 2). Verify that the test asserts each defaulted column, and that changing one default in the test database makes it fail.
- [x] 2.14 Make the migration check print the tool's output when the tool itself fails (adversarial review, finding 3). Verify locally that a failing command still prints its output and exits 1.

## 3. Seed data

- [x] 3.1 Add `scripts/seed-data.ts` with the fixed IDs and `loadSeedData(db)`, inserting the data in §3 in one transaction with `ON CONFLICT (id) DO NOTHING` (design decision 8), and with the details in design decisions 9 and 10. Verify with `npx tsc --noEmit`, and that the WhatsApp numbers pass `libphonenumber-js`.
- [x] 3.2 Rewrite `scripts/seed.ts` as the command in design decision 7, with the guard against a remote database. Verify that `npm run db:seed` loads the data locally, that a second run succeeds, and that a remote `DATABASE_URL`, given in the host or through a `host` parameter, stops it before connecting.
- [x] 3.3 Test the requirement "Seed contents" in `tests/integration/seed-data.test.ts`, starting from emptied tables. Verify that the test named for loading into an empty database passes, and that each scenario has a test.
- [x] 3.4 Test the requirement "Seed data is consistent". Verify that the timeline test walks each item's rows against the transitions in BR-22 and ends in the item's status.
- [x] 3.5 Test the requirement "Seed is safe to load again", comparing every table's rows before and after a second load, keeping an added group and an edited item, and stopping with no seed rows added when a developer's user already has a seed email. Verify that a deliberate change to one seed row makes the comparison fail, then remove the change.

## 4. Clean test data

- [x] 4.1 Add `tests/support/reset-database.ts` (design decision 11) and call it from a `beforeAll` in `tests/support/integration-env.ts`. Add a test that the next file starts from exactly the seed data, using two test files. Verify with `npm run test:integration`, and that the `drizzle` schema's migration records survive.
- [x] 4.2 Add `scripts/reset-test-database.ts` and use it in the server command in `playwright.config.ts`. Verify that `npm run test:e2e` passes, and that a row added to the test database beforehand is gone after the run.
- [x] 4.3 Verify by hand the scenario "Development data is never emptied": add a row to the development database, run `npm test` and `npm run test:e2e`, and confirm that the row is still there.

- [x] 4.4 Add `tests/integration/reset-database.test.ts`, proving that the reset reaches the test database whatever `DATABASE_URL` holds and that emptying refuses any other database (adversarial review, finding 1). Verify that it fails when `resetDatabase` connects through `DATABASE_URL` without the guard.

## 5. Whole ticket

- [x] 5.1 Demonstrate the "Done when" statement: on a fresh clone with a new, empty Postgres volume, `npm run setup` creates every table and the seed data, and a second `npm run setup` keeps them. Use a separate Compose project for the new volume, so the development database isn't deleted; it only stops while the clone uses its port. Verify by querying the row counts.
- [x] 5.2 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:coverage`, `npm run test:e2e`, and `npm run check:links`. Verify that all pass, and that no package was added outside [Architecture §1.6](../../../docs/03-ARCHITECTURE.md#16-dependencies).
- [x] 5.3 Record the session as CLAUDE.md describes: the export in `docs/ai-conversations/`, the row in `prompts.md`, and the representative prompts. Verify with `npm run check:links`.

## Workflow follow-up

- Open the pull request when the developer asks, with `Closes #28`, and verify that the `test` and `e2e` checks pass against the Postgres service containers.
- On that pull request, push a temporary schema change with no migration, confirm that the `test` check fails at the migration step, and revert it, as T-01 did for its checks.
- Run the adversarial review on the pull request, as CLAUDE.md describes.
- Archive this change with the merge, as the definition of done requires.
