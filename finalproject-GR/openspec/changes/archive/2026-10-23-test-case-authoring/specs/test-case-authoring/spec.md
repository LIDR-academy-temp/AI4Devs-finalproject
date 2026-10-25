# Spec Delta

## Purpose

Lets a project member author and read test cases — the fundamental content unit of the platform (PRD §2.5) — within a project they have access to, with source type always consistent with content and status explicitly settable.

## ADDED Requirements

### Requirement: A Contributor or above can create a test case
The system SHALL allow a caller with at least `Contributor` access to a project to create a test case in it, with an optional initial Gherkin script, defaulting its status to `Draft`.

#### Scenario: Creating a test case with a script
- **WHEN** a Contributor creates a test case in a project, supplying a name and a Gherkin script
- **THEN** the test case is created with that script, status `Draft`, and is retrievable afterward

#### Scenario: Creating a test case with no script
- **WHEN** a Contributor creates a test case supplying only a name
- **THEN** the test case is created with no script and status `Draft`

#### Scenario: A Viewer cannot create a test case
- **WHEN** a caller with only `Viewer` access to a project attempts to create a test case in it
- **THEN** the request is denied with HTTP 403

### Requirement: Source type is derived from script content, never stored
The system SHALL treat a test case as Gherkin-sourced when it has a non-empty script and Manual otherwise, without persisting that classification as its own field.

#### Scenario: A test case with a script reports as Gherkin
- **WHEN** a test case with a non-empty Gherkin script is read
- **THEN** its source type is reported as Gherkin

#### Scenario: A test case with no script reports as Manual
- **WHEN** a test case with no Gherkin script is read
- **THEN** its source type is reported as Manual

### Requirement: A Contributor or above can update a test case's name, script, and status
The system SHALL allow a caller with at least `Contributor` access to a project to update a test case's name, Gherkin script, and status in one request.

#### Scenario: Updating name and script together
- **WHEN** a Contributor updates a test case's name and Gherkin script
- **THEN** both changes are persisted and reflected in a subsequent read

#### Scenario: Updating status
- **WHEN** a Contributor changes a test case's status to `Ready`
- **THEN** the test case's status is `Ready` afterward, with no additional approval step

#### Scenario: A Viewer cannot update a test case
- **WHEN** a caller with only `Viewer` access attempts to update a test case
- **THEN** the request is denied with HTTP 403

### Requirement: Any project member can list and view test cases
The system SHALL allow a caller with at least `Viewer` access to a project to list its test cases and view any individual test case's detail.

#### Scenario: Viewer lists test cases in a project
- **WHEN** a caller with `Viewer` access to a project requests its test case list
- **THEN** the response includes every non-deleted test case in that project

#### Scenario: Caller with no access cannot list or view
- **WHEN** a caller with no effective access to a project requests its test case list or a test case's detail
- **THEN** the request is denied with HTTP 403
