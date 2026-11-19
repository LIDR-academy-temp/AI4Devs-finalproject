# pull-request-checks Specification

## Purpose
Checks every pull request automatically and keeps `main` from receiving code that fails those checks, so problems surface before a merge and not in production.

## Requirements

### Requirement: Checks run on every pull request

Every pull request into `main` SHALL run the checks in Infrastructure §3 step 2, each reported as its own named check, whichever files the pull request changes. The check that migrations match the schema is the one exception: it reports through the tests' named check, so it needs no required check of its own.

#### Scenario: A pull request shows all checks

- **WHEN** a pull request into `main` is opened or updated
- **THEN** it shows a separate result for linting, type checks, unit and integration tests with coverage, browser tests, the OpenAPI document check, the documentation link check, and the dependency audit

#### Scenario: A documentation-only pull request is still checked

- **WHEN** a pull request changes only Markdown files
- **THEN** every check still runs and reports a result, so required checks never stay pending

### Requirement: CI matches local commands

CI SHALL run the same commands as a developer's machine, as Security and testing §2.5 describes, using a Postgres service container in place of Docker Compose and only placeholder credentials.

#### Scenario: Integration tests run against the service container

- **WHEN** the tests with coverage run in CI
- **THEN** they connect to a `comproparati_test` database in a Postgres service container, with no repository secrets

#### Scenario: Browser tests run against a production build

- **WHEN** the browser tests run in CI
- **THEN** they run in Chromium and WebKit against a production build on localhost
- **AND** a failed test is retried once, and the report lists every retried test

#### Scenario: A failing check fails the pull request

- **GIVEN** a pull request where a lint rule, a type check, a test, or the coverage target fails
- **WHEN** the checks finish
- **THEN** the matching check is reported as failed

### Requirement: Documentation link check

A documentation link check SHALL fail when a link in the project's Markdown documents points to a file or heading anchor that doesn't exist in the repository. It SHALL run without network access. Exported session records and archived OpenSpec changes are excluded, because they are history.

#### Scenario: Valid links pass

- **WHEN** the check runs on documents whose repository links and anchors all resolve
- **THEN** it passes

#### Scenario: A broken file link fails

- **GIVEN** a document that links to a file that doesn't exist
- **WHEN** the check runs
- **THEN** it fails and names the document and the link

#### Scenario: A broken anchor fails

- **GIVEN** a document that links to a heading that doesn't exist in an existing file
- **WHEN** the check runs
- **THEN** it fails and names the document and the link

#### Scenario: External links are not requested

- **GIVEN** a document with a link to an outside website
- **WHEN** the check runs
- **THEN** the link is skipped and no network request is made

### Requirement: Dependency audit

Every pull request SHALL run a dependency audit, as Security and testing §1 requires, that fails on a known high or critical vulnerability.

#### Scenario: A vulnerable dependency fails the build

- **GIVEN** an installed package with a known high or critical vulnerability
- **WHEN** the audit runs
- **THEN** the audit check fails and names the package

### Requirement: Automated dependency updates

The repository SHALL open dependency update pull requests automatically, as Security and testing §1 requires, for npm packages and GitHub Actions.

#### Scenario: Updates are proposed on a schedule

- **WHEN** a newer version of a dependency is available at the weekly check
- **THEN** a pull request proposing the update is opened against `main`, and it runs the same checks as any other pull request

### Requirement: Merging into main is protected

`main` SHALL accept changes only through a pull request whose required checks pass, with no bypass for administrators, as Infrastructure §3 step 3 describes. Approvals are not required; the adversarial review stays a required step of the pull request process in CLAUDE.md.

#### Scenario: A failing pull request can't be merged

- **GIVEN** a pull request with a failed required check
- **WHEN** anyone, including the repository owner, tries to merge it
- **THEN** GitHub refuses the merge

#### Scenario: A passing pull request can be merged without an approval

- **GIVEN** a pull request whose required checks pass, up to date with `main`, opened by the only collaborator
- **WHEN** the owner merges it
- **THEN** GitHub allows the merge

#### Scenario: A direct push is refused

- **WHEN** anyone pushes directly to `main`
- **THEN** GitHub refuses the push

#### Scenario: Force pushes and deletion are refused

- **WHEN** anyone force-pushes to `main` or tries to delete it
- **THEN** GitHub refuses the request

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

### Requirement: The OpenAPI document is up to date

Every pull request SHALL fail its OpenAPI check when the committed `docs/openapi.yaml` differs from the document the generator produces from the code, so the published API description never drifts from the endpoints. The check SHALL be a required check on `main`.

#### Scenario: T-03 an up-to-date document passes

- **GIVEN** a pull request whose `docs/openapi.yaml` matches the generator's output
- **WHEN** the checks run
- **THEN** the OpenAPI check passes
- Verified by the CI run of this ticket's pull request.

#### Scenario: T-03 a stale document fails

- **GIVEN** a pull request that changes a documented schema without regenerating `docs/openapi.yaml`
- **WHEN** the checks run
- **THEN** the OpenAPI check fails, and its log shows the difference
- Verified once in this ticket's pull request with a temporary commit that is then reverted, as T-01 and T-02 did for their checks.
