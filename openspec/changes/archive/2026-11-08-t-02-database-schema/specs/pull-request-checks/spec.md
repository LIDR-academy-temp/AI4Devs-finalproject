# Spec Delta

## MODIFIED Requirements

### Requirement: Checks run on every pull request

Every pull request into `main` SHALL run the checks in Infrastructure §3 step 2, each reported as its own named check, whichever files the pull request changes. The OpenAPI check is added by T-03, when the generator exists. The check that migrations match the schema is the one exception: it reports through the tests' named check, so it needs no required check of its own.

#### Scenario: A pull request shows all checks

- **WHEN** a pull request into `main` is opened or updated
- **THEN** it shows a separate result for linting, type checks, unit and integration tests with coverage, browser tests, the documentation link check, and the dependency audit

#### Scenario: A documentation-only pull request is still checked

- **WHEN** a pull request changes only Markdown files
- **THEN** every check still runs and reports a result, so required checks never stay pending

## ADDED Requirements

### Requirement: Migrations match the schema

Every pull request SHALL fail its tests' check when the schema definition has a change that no generated migration includes, so that a change can't reach `main` without reaching the database.

#### Scenario: Schema and migrations agree

- **GIVEN** a pull request whose schema definition matches its latest migration
- **WHEN** the checks run
- **THEN** the migration check passes, and no file is added to the migrations folder

#### Scenario: A schema change with no migration fails

- **GIVEN** a pull request that adds a column, check, or index to the schema definition without generating a migration
- **WHEN** the checks run
- **THEN** the tests' check fails, and its log names the migration check

#### Scenario: A rename with no migration fails

- **GIVEN** a pull request that renames a column in the schema definition without generating a migration
- **WHEN** the checks run
- **THEN** the tests' check fails, even though the migration tool can't ask whether the column was renamed or replaced
