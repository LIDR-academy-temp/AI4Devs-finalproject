# Spec Delta

## MODIFIED Requirements

### Requirement: Any project member can list and view executions
The system SHALL allow a caller with at least `Viewer` access to list the project's non-deleted executions and retrieve one with its runs in position order. The list SHALL include each execution's status, total run count, done run count, Pass, Fail, and Needs Review counts, and the ids of the tags currently carried by the test cases of its runs.

#### Scenario: Listing executions with counts
- **WHEN** a Viewer lists executions in a project with one execution of 3 runs, one `Pass` and two `Pending`
- **THEN** that execution is listed with total 3, done 1, Pass 1, Fail 0, Needs Review 0

#### Scenario: Listing executions with their test cases' tags
- **WHEN** an execution has runs for a test case tagged "smoke" and one tagged "smoke" and "checkout"
- **THEN** the execution is listed with the "smoke" and "checkout" tag ids, each once

#### Scenario: Viewing an execution's runs
- **WHEN** a Viewer retrieves an execution
- **THEN** its runs are returned ordered by position, each with its test case name and outcome

#### Scenario: A caller with no access cannot view executions
- **WHEN** a caller with no effective access to the project lists or retrieves its executions
- **THEN** the request is denied with HTTP 403

#### Scenario: Executions are tenant-isolated
- **WHEN** a caller retrieves an execution id that belongs to another workspace's project through their own project's route
- **THEN** the request returns HTTP 404
