# identity-provisioning Specification

## Purpose

Resolves a verified Clerk identity to exactly one user, one workspace, and one Owner membership — created on first contact, found on every request after.

## Requirements

### Requirement: Requests require a valid Clerk session
The system SHALL reject a request to any endpoint other than the health check with HTTP 401 unless it carries a valid, unexpired Clerk session token.

#### Scenario: Missing token
- **WHEN** a request to a protected endpoint carries no `Authorization` header
- **THEN** the system responds 401

#### Scenario: Invalid or expired token
- **WHEN** a request carries a token that fails JWKS verification or has expired
- **THEN** the system responds 401

#### Scenario: Valid token is accepted
- **WHEN** a request carries a valid, unexpired Clerk session token
- **THEN** the system resolves the request's Clerk user id and proceeds

### Requirement: First contact provisions a user, a workspace, and an Owner membership
The system SHALL, on the first authenticated request from a given Clerk identity, create exactly one `user` row, one `workspace`, one `workspace_membership` row with role `Owner`, and one default `project` in that workspace, all in a single transaction.

#### Scenario: New identity gets provisioned
- **WHEN** a request authenticates with a Clerk user id never seen before
- **THEN** afterward exactly one `user`, one `workspace`, one `Owner` `workspace_membership` row, and one `project` exist for that identity

### Requirement: Provisioning is idempotent
The system SHALL NOT create a second user, workspace, membership, or default project row for a Clerk identity that has already been provisioned.

#### Scenario: Repeat request for an already-provisioned identity
- **WHEN** a second (or later) authenticated request arrives for a Clerk user id that was already provisioned
- **THEN** no new `user`, `workspace`, `workspace_membership`, or `project` row is created, and the same workspace id and project id are resolved as before

### Requirement: An authenticated user can retrieve their own resolved identity
The system SHALL expose an endpoint that returns the authenticated caller's user id, display name, email, their active project's id, and that project's workspace id, workspace name and the caller's workspace role.

#### Scenario: Fetching one's own profile
- **WHEN** an authenticated user requests their own profile
- **THEN** the response contains their user id, display name, email, the active project id, its workspace id and name, and their workspace role

### Requirement: The active project is the user's last active project
The system SHALL resolve a user's active project as the project they last switched to, while it is live and grants them a role. Otherwise it SHALL be the oldest live project they can access in their workspace, and failing that the workspace's oldest live project. The active project SHALL persist across sign-outs and devices.

#### Scenario: Returning to the last project
- **WHEN** a user who switched to "Mobile App" signs out and signs in again on another device
- **THEN** their active project is "Mobile App"

#### Scenario: Last project was deleted
- **WHEN** the project a user last switched to is moved to the trash
- **THEN** their active project becomes the oldest live project they can access

#### Scenario: Collaborator without a membership on the oldest project
- **WHEN** a Collaborator whose only membership is on the workspace's second-oldest project has never switched projects
- **THEN** their active project is that second-oldest project

### Requirement: A user can switch their active project
The system SHALL let a user set their active project to any live project that grants them a role. A project that grants them no role, is in the trash, or does not exist SHALL be refused with 403, leaving the active project unchanged.

#### Scenario: Switching projects
- **WHEN** a user switches to another project they are a member of
- **THEN** their profile reports that project as active

#### Scenario: Switching to an inaccessible project
- **WHEN** a Collaborator tries to switch to a project where they have no membership
- **THEN** the request is refused with HTTP 403 and their active project is unchanged
