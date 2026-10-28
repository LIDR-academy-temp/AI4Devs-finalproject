# Spec Delta

## MODIFIED Requirements

### Requirement: An Admin can delete a test case
The system SHALL allow a caller with at least `Admin` access to a project to delete a test case in it. Deletion is a soft delete: the test case is marked deleted rather than physically removed, and a deleted test case is excluded from the list and detail requirements of this capability. Deletion SHALL be refused with HTTP 409 while the test case belongs to an execution whose status is `Ready`, `InProgress`, or `Paused`.

#### Scenario: An Admin deletes a test case
- **WHEN** an Admin deletes a test case in a project
- **THEN** the test case no longer appears in that project's test case list, and its detail is no longer retrievable

#### Scenario: A test case in an active execution cannot be deleted
- **WHEN** an Admin deletes a test case that has a run in an execution whose status is `Ready`, `InProgress`, or `Paused`
- **THEN** the request is rejected with HTTP 409 and the test case is not deleted

#### Scenario: A test case only in Draft or finished executions can be deleted
- **WHEN** an Admin deletes a test case whose runs belong only to executions in `Draft`, `Completed`, or `Done` status
- **THEN** the test case is deleted

#### Scenario: A Contributor cannot delete a test case
- **WHEN** a caller with only `Contributor` access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

#### Scenario: A Viewer cannot delete a test case
- **WHEN** a caller with only `Viewer` access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

#### Scenario: A caller with no access cannot delete a test case
- **WHEN** a caller with no effective access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403
