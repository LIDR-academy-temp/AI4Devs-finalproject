# Spec Delta

## MODIFIED Requirements

### Requirement: Checks run on every pull request

Every pull request into `main` SHALL run the checks in Infrastructure §3 step 2, each reported as its own named check, whichever files the pull request changes. The check that migrations match the schema is the one exception: it reports through the tests' named check, so it needs no required check of its own.

#### Scenario: A pull request shows all checks

- **WHEN** a pull request into `main` is opened or updated
- **THEN** it shows a separate result for linting, type checks, unit and integration tests with coverage, browser tests, the OpenAPI document check, the documentation link check, and the dependency audit

#### Scenario: A documentation-only pull request is still checked

- **WHEN** a pull request changes only Markdown files
- **THEN** every check still runs and reports a result, so required checks never stay pending

## ADDED Requirements

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
