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
The system SHALL expose an endpoint that returns the authenticated caller's user id, display name, email, workspace id, and the id of the default project resolved or provisioned for them.

#### Scenario: Fetching one's own profile
- **WHEN** an authenticated user requests their own profile
- **THEN** the response contains their user id, display name, email, the workspace id, and the project id resolved or provisioned for them
