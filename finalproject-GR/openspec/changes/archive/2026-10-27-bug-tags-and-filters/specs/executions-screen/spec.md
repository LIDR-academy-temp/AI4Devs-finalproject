# Spec Delta

## MODIFIED Requirements

### Requirement: The execution list can be sorted and filtered
The Executions screen SHALL let the user sort the list by last updated, creation date, or status, ascending or descending, and filter it by name text, status, environment, browser, and tags. With tags picked, an execution SHALL be listed when at least one of its test cases currently carries any of them (PRD §6.3.2). The default is last updated, newest first.

#### Scenario: Sorting by creation date
- **WHEN** the user sorts by creation date ascending
- **THEN** the oldest execution is listed first

#### Scenario: Filtering by status and name
- **WHEN** the user filters by status `InProgress` and name text "smoke"
- **THEN** only In Progress executions whose name contains "smoke" (case-insensitive) are listed

#### Scenario: Filtering by tags
- **WHEN** the user picks the tag "payments", which one test case of execution "Payments smoke" carries and no test case of "Release regression" does
- **THEN** "Payments smoke" is listed and "Release regression" is not
