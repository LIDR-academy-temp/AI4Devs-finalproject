# Spec Delta

## Purpose

Resolves a verified Clerk identity to exactly one user, one workspace, and one Owner membership — created on first contact, found on every request after.

## ADDED Requirements

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
The system SHALL, on the first authenticated request from a given Clerk identity, create exactly one `user` row, one `workspace`, and one `workspace_membership` row with role `Owner`, all in a single transaction.

#### Scenario: New identity gets provisioned
- **WHEN** a request authenticates with a Clerk user id never seen before
- **THEN** afterward exactly one `user`, one `workspace`, and one `Owner` `workspace_membership` row exist for that identity

### Requirement: Provisioning is idempotent
The system SHALL NOT create a second user, workspace, or membership row for a Clerk identity that has already been provisioned.

#### Scenario: Repeat request for an already-provisioned identity
- **WHEN** a second (or later) authenticated request arrives for a Clerk user id that was already provisioned
- **THEN** no new `user`, `workspace`, or `workspace_membership` row is created, and the same workspace id is resolved as before

### Requirement: An authenticated user can retrieve their own resolved identity
The system SHALL expose an endpoint that returns the authenticated caller's user id, display name, email, and workspace id.

#### Scenario: Fetching one's own profile
- **WHEN** an authenticated user requests their own profile
- **THEN** the response contains their user id, display name, email, and the workspace id resolved or provisioned for them
