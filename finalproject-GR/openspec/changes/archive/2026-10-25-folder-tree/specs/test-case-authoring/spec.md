# Spec Delta

## MODIFIED Requirements

### Requirement: A Contributor or above can create a test case
The system SHALL allow a caller with at least `Contributor` access to a project to create a test case in it, with an optional initial Gherkin script and an optional destination folder of the same project, defaulting its status to `Draft`. Without a folder the test case is created at the root. A new test case SHALL be placed last among its siblings.

#### Scenario: Creating a test case with a script
- **WHEN** a Contributor creates a test case in a project, supplying a name and a Gherkin script
- **THEN** the test case is created with that script, status `Draft`, and is retrievable afterward

#### Scenario: Creating a test case with no script
- **WHEN** a Contributor creates a test case supplying only a name
- **THEN** the test case is created with no script and status `Draft`

#### Scenario: Creating a test case in a folder
- **WHEN** a Contributor creates a test case in folder "Checkout", which already holds two test cases
- **THEN** the test case belongs to "Checkout" and is ordered after the existing two

#### Scenario: The folder must belong to the project
- **WHEN** a Contributor creates a test case in a folder of another project, a deleted folder, or a nonexistent one
- **THEN** the request is rejected with HTTP 400 and no test case is created

#### Scenario: A Viewer cannot create a test case
- **WHEN** a caller with only `Viewer` access to a project attempts to create a test case in it
- **THEN** the request is denied with HTTP 403

### Requirement: Any project member can list and view test cases
The system SHALL allow a caller with at least `Viewer` access to a project to list its test cases and view any individual test case's detail. Each test case SHALL include its folder (or none, for the root), its order among its siblings, and the outcome of its most recent run in a started execution (or none if it has never run).

#### Scenario: Viewer lists test cases in a project
- **WHEN** a caller with `Viewer` access to a project requests its test case list
- **THEN** the response includes every non-deleted test case in that project

#### Scenario: Folder, order and last outcome are reported
- **WHEN** a test case in folder "Checkout" was last run with outcome `Fail`, and another at the root has never run
- **THEN** the first reports folder "Checkout" and last outcome `Fail`, the second reports no folder and no last outcome, and each reports its order key

#### Scenario: Caller with no access cannot list or view
- **WHEN** a caller with no effective access to a project requests its test case list or a test case's detail
- **THEN** the request is denied with HTTP 403
