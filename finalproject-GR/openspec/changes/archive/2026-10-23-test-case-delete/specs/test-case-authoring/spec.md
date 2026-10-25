# Spec Delta

## ADDED Requirements

### Requirement: An Admin can delete a test case
The system SHALL allow a caller with at least `Admin` access to a project to delete a test case in it. Deletion is a soft delete: the test case is marked deleted rather than physically removed, and a deleted test case is excluded from the list and detail requirements of this capability.

#### Scenario: An Admin deletes a test case
- **WHEN** an Admin deletes a test case in a project
- **THEN** the test case no longer appears in that project's test case list, and its detail is no longer retrievable

#### Scenario: A Contributor cannot delete a test case
- **WHEN** a caller with only `Contributor` access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

#### Scenario: A Viewer cannot delete a test case
- **WHEN** a caller with only `Viewer` access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

#### Scenario: A caller with no access cannot delete a test case
- **WHEN** a caller with no effective access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403
