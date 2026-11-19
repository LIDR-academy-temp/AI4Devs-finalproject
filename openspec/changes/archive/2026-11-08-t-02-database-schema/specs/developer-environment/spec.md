# Spec Delta

## MODIFIED Requirements

### Requirement: Database commands

`npm run db:migrate` SHALL apply every migration to the local database, and `npm run db:seed` SHALL load the seed data, so that `npm run setup` creates the database from scratch with seed data.

#### Scenario: Setup creates the database from scratch

- **GIVEN** a fresh clone and a Postgres volume with no data
- **WHEN** the developer runs `npm run setup`
- **THEN** the development database has every table and the seed data

#### Scenario: Commands succeed with nothing to apply

- **GIVEN** a local database where both commands have already succeeded
- **WHEN** the developer runs `npm run db:migrate` and then `npm run db:seed`
- **THEN** both finish without errors and change nothing

## ADDED Requirements

### Requirement: Tests start from freshly seeded data

Each integration test file and each browser test run SHALL start with the test database emptied and the seed loaded again, as Security and testing §2.3 requires. Emptying SHALL only ever reach the test database.

#### Scenario: Integration test files don't see each other's data

- **GIVEN** an integration test file that adds and changes rows
- **WHEN** the next integration test file starts
- **THEN** the database holds exactly the seed data

#### Scenario: Browser test runs don't see earlier data

- **GIVEN** a test database with rows left by an earlier test run
- **WHEN** the developer runs `npm run test:e2e`
- **THEN** the app starts against a database holding exactly the seed data

#### Scenario: Development data is never emptied

- **GIVEN** a development database with data, and `DATABASE_URL` pointing to it
- **WHEN** the developer runs `npm test` or `npm run test:e2e`
- **THEN** the development database is unchanged
