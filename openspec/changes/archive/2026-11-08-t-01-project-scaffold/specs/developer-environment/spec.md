# Spec Delta

## Purpose

Lets any developer go from a fresh clone to a running, tested app with one setup command, using only Node.js and Docker, and with no accounts on outside services.

## ADDED Requirements

### Requirement: One-command setup

`npm run setup` SHALL prepare a fresh clone for development and testing, needing only Node.js and Docker, as described in Security and testing §2.5 and the local setup requirement in PRD §15.

#### Scenario: Fresh clone is set up

- **GIVEN** a fresh clone, with Node.js and Docker available
- **WHEN** the developer runs `npm run setup`
- **THEN** the command finishes without errors
- **AND** dependencies are installed, Postgres is running, the development and test databases exist, migrations and seed data have been applied, and the Chromium and WebKit browsers are installed

#### Scenario: Environment file is created once

- **GIVEN** a clone with no `.env` file
- **WHEN** the developer runs `npm run setup`
- **THEN** `.env` is created from `.env.example`
- **AND** running the command again leaves an edited `.env` unchanged

#### Scenario: Setup can run again

- **GIVEN** a clone where `npm run setup` has already succeeded
- **WHEN** the developer runs it again
- **THEN** it finishes without errors and without losing data in the development database

#### Scenario: A prerequisite is missing

- **GIVEN** a machine where Docker isn't running, Docker Compose isn't available, or Node.js is older than the version the project requires
- **WHEN** the developer runs `npm run setup`
- **THEN** the command stops with a message naming the missing prerequisite

### Requirement: Configuration template

The repository SHALL include an `.env.example` listing every variable in Infrastructure §7, with values that work locally or are clearly placeholders, and SHALL never track a real secret or a developer's `.env`.

#### Scenario: Every variable is listed

- **WHEN** `.env.example` is compared with the variables in Infrastructure §7
- **THEN** each variable appears in the file

#### Scenario: The environment file stays out of Git

- **GIVEN** a clone with a `.env` file
- **WHEN** the developer checks the working tree's status
- **THEN** Git ignores `.env`

### Requirement: Running the app locally

`npm run dev` SHALL start the app on localhost after setup, without credentials for any outside service.

#### Scenario: The app runs in development

- **GIVEN** a clone where `npm run setup` has succeeded, with `.env` unchanged
- **WHEN** the developer runs `npm run dev` and opens the local address
- **THEN** the placeholder page loads without errors

### Requirement: Test commands

The test commands SHALL each do what Security and testing §2.5 describes, and each level SHALL include at least one passing example test.

#### Scenario: Default tests pass

- **GIVEN** the local Postgres is running
- **WHEN** the developer runs `npm test`
- **THEN** the unit and integration tests run and pass

#### Scenario: Unit tests need nothing else

- **GIVEN** Postgres isn't running
- **WHEN** the developer runs `npm run test:unit`
- **THEN** the unit tests run and pass

#### Scenario: Integration tests use the test database

- **GIVEN** the local Postgres is running
- **WHEN** the developer runs `npm run test:integration`
- **THEN** the tests connect to `comproparati_test`, as Security and testing §2.3 requires, and the development database isn't touched

#### Scenario: Integration tests refuse a remote database

- **GIVEN** `DATABASE_URL` points to a host other than the local machine, where the CI service container also runs, in its host or through a connection parameter
- **WHEN** the integration tests start
- **THEN** they stop with an error before connecting

#### Scenario: Browser tests pass in both browsers

- **GIVEN** the local Postgres is running
- **WHEN** the developer runs `npm run test:e2e`
- **THEN** the app is built and started on localhost, and the example test passes in Chromium on a phone-size screen and in WebKit on an iPhone-size screen
- **AND** the example test reports no automated accessibility violations

#### Scenario: Coverage report is produced

- **GIVEN** the local Postgres is running
- **WHEN** the developer runs `npm run test:coverage`
- **THEN** a line coverage report for the domain services is produced, and the command fails if coverage is below the target in Security and testing §2.6

### Requirement: Code quality commands

`npm run lint` SHALL fail when the code breaks an ESLint rule, including the accessibility rules in Architecture §1.6, or isn't formatted by Prettier. TypeScript SHALL run in strict mode.

#### Scenario: Clean code passes

- **WHEN** the developer runs `npm run lint` and `npx tsc --noEmit` on the scaffold
- **THEN** both finish without errors

#### Scenario: A lint violation fails

- **GIVEN** a source file that breaks an ESLint rule
- **WHEN** the developer runs `npm run lint`
- **THEN** the command fails and names the file and rule

#### Scenario: Unformatted code fails

- **GIVEN** a source file that Prettier would change
- **WHEN** the developer runs `npm run lint`
- **THEN** the command fails and names the file

#### Scenario: A type error fails

- **GIVEN** a source file with an implicit `any`
- **WHEN** the developer runs `npx tsc --noEmit`
- **THEN** the command fails and names the file

### Requirement: Database commands

`npm run db:migrate` and `npm run db:seed` SHALL exist and succeed against the local database, including before T-02 adds tables and seed data.

#### Scenario: Commands succeed with nothing to apply

- **GIVEN** the local Postgres is running and no migration or seed data exists yet
- **WHEN** the developer runs `npm run db:migrate` and then `npm run db:seed`
- **THEN** both finish without errors and change nothing

### Requirement: Interface text from translation files

The placeholder page SHALL take all its visible text from the translation files, following FR-37. T-05 owns the translation setup and FR-37 as a whole.

#### Scenario: Placeholder text comes from the message files

- **WHEN** the placeholder page is rendered
- **THEN** its visible text and title match the entries in the Spanish message file, and the document language is Spanish
