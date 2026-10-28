# Spec Delta

## Purpose

Lets project members plan a test execution — its run conditions and the ordered set of test cases it will run — and manage that plan while it is still a Draft.

## ADDED Requirements

### Requirement: A Contributor or above can create an execution in Draft
The system SHALL allow a caller with at least `Contributor` access to a project to create an execution with a name, optional description, and one or more of the project's test cases in `Ready` status. The execution SHALL start in `Draft` status with one `Pending` run per selected test case, in the order given.

#### Scenario: Creating an execution
- **WHEN** a Contributor creates an execution named "Smoke" with test cases A, B, C in that order
- **THEN** the execution is returned with status `Draft` and three `Pending` runs at positions 1, 2, 3 for A, B, C

#### Scenario: Name is required
- **WHEN** a Contributor creates an execution with a missing or blank name
- **THEN** the request is rejected with HTTP 400

#### Scenario: Test cases must belong to the project and not be deleted
- **WHEN** a Contributor creates an execution referencing a test case from another project, a deleted test case, or a nonexistent id
- **THEN** the request is rejected with HTTP 400 and no execution is created

#### Scenario: Only Ready test cases can be selected
- **WHEN** a Contributor creates an execution, or replaces a Draft execution's run list, including a test case whose status is `Draft` or `Deprecated`
- **THEN** the request is rejected with HTTP 400 and nothing is created or changed

#### Scenario: The same test case cannot appear twice
- **WHEN** a Contributor creates an execution listing the same test case more than once
- **THEN** the request is rejected with HTTP 400

#### Scenario: A Viewer cannot create an execution
- **WHEN** a caller with only `Viewer` access attempts to create an execution
- **THEN** the request is denied with HTTP 403

### Requirement: An execution records its run conditions
The system SHALL store an execution's environment (optional, one of the project's environments), browser (`Chromium`, `Firefox`, or `WebKit`), viewport width and height, locale, timezone, and an auto-create-bug-on-failure flag, and return them with the execution.

#### Scenario: Run conditions are stored and returned
- **WHEN** a Contributor creates an execution with an environment, browser `Firefox`, viewport 1280×720, locale `pt-BR`, and timezone `Europe/Paris`
- **THEN** retrieving the execution returns exactly those values, including the environment's id and name

#### Scenario: Invalid run conditions are rejected
- **WHEN** a Contributor submits an unknown browser, a non-positive viewport dimension, a locale that is not a valid language tag, a timezone that is not a valid IANA zone, or an environment from another project
- **THEN** the request is rejected with HTTP 400

#### Scenario: Environment is optional
- **WHEN** a Contributor creates an execution without an environment
- **THEN** the execution is created with no environment

### Requirement: An execution keeps its environment name after the environment is deleted
The system SHALL keep an execution's environment name when the linked environment is deleted, while clearing the link itself.

#### Scenario: Deleting a linked environment
- **WHEN** an Admin deletes an environment that an execution references
- **THEN** the execution reports no environment id but still reports the environment's name

### Requirement: Any project member can list and view executions
The system SHALL allow a caller with at least `Viewer` access to list the project's non-deleted executions and retrieve one with its runs in position order. The list SHALL include each execution's status, total run count, done run count, and Pass, Fail, and Needs Review counts.

#### Scenario: Listing executions with counts
- **WHEN** a Viewer lists executions in a project with one execution of 3 runs, one `Pass` and two `Pending`
- **THEN** that execution is listed with total 3, done 1, Pass 1, Fail 0, Needs Review 0

#### Scenario: Viewing an execution's runs
- **WHEN** a Viewer retrieves an execution
- **THEN** its runs are returned ordered by position, each with its test case name and outcome

#### Scenario: A caller with no access cannot view executions
- **WHEN** a caller with no effective access to the project lists or retrieves its executions
- **THEN** the request is denied with HTTP 403

#### Scenario: Executions are tenant-isolated
- **WHEN** a caller retrieves an execution id that belongs to another workspace's project through their own project's route
- **THEN** the request returns HTTP 404

### Requirement: A Contributor or above can edit a Draft execution
The system SHALL allow a caller with at least `Contributor` access to change a `Draft` execution's name, description, and run conditions, and to replace its run list with a new ordered list of test cases. Editing an execution in any other status SHALL be refused with HTTP 409.

#### Scenario: Reordering and changing runs in Draft
- **WHEN** a Contributor replaces a Draft execution's test case list A, B, C with C, A, D
- **THEN** the execution's runs are C, A, D at positions 1, 2, 3, and B's run no longer exists

#### Scenario: Editing outside Draft is refused
- **WHEN** a Contributor edits an execution whose status is `Ready`
- **THEN** the request is rejected with HTTP 409 and nothing changes

### Requirement: An Admin can delete a Draft execution
The system SHALL allow a caller with at least `Admin` access to delete an execution in `Draft` status. Deletion is a soft delete: the execution is excluded from list and detail afterwards. Deleting an execution in any other status SHALL be refused with HTTP 409.

#### Scenario: An Admin deletes a Draft execution
- **WHEN** an Admin deletes a Draft execution
- **THEN** it no longer appears in the list and retrieving it returns HTTP 404

#### Scenario: A Contributor cannot delete an execution
- **WHEN** a caller with only `Contributor` access deletes an execution
- **THEN** the request is denied with HTTP 403

#### Scenario: Deleting a non-Draft execution is refused
- **WHEN** an Admin deletes an execution whose status is `InProgress`
- **THEN** the request is rejected with HTTP 409 and the execution is unchanged

### Requirement: Execution authoring changes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction as the change, when an execution is created, edited, or deleted.

#### Scenario: Creating an execution is logged
- **WHEN** a Contributor creates an execution
- **THEN** an activity entry naming that execution and the acting user exists for the project
