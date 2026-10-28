# Spec Delta

## MODIFIED Requirements

### Requirement: Provisioning is idempotent
The system SHALL NOT create a second user, workspace, membership, or default project row for a Clerk identity that has already been provisioned.

#### Scenario: Repeat request for an already-provisioned identity
- **WHEN** a second (or later) authenticated request arrives for a Clerk user id that was already provisioned
- **THEN** no new `user`, `workspace`, `workspace_membership`, or `project` row is created, and the same workspace id and project id are resolved as before

### Requirement: First contact provisions a user, a workspace, and an Owner membership
The system SHALL, on the first authenticated request from a given Clerk identity, create exactly one `user` row, one `workspace`, one `workspace_membership` row with role `Owner`, and one default `project` in that workspace, all in a single transaction.

#### Scenario: New identity gets provisioned
- **WHEN** a request authenticates with a Clerk user id never seen before
- **THEN** afterward exactly one `user`, one `workspace`, one `Owner` `workspace_membership` row, and one `project` exist for that identity

### Requirement: An authenticated user can retrieve their own resolved identity
The system SHALL expose an endpoint that returns the authenticated caller's user id, display name, email, workspace id, and the id of the default project resolved or provisioned for them.

#### Scenario: Fetching one's own profile
- **WHEN** an authenticated user requests their own profile
- **THEN** the response contains their user id, display name, email, the workspace id, and the project id resolved or provisioned for them
