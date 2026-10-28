# project-authorization Specification

## Purpose

Decides what an authenticated user may do with a specific project, combining their workspace role and any explicit project membership into one effective project role, and lets endpoints require a minimum role before proceeding.

## Requirements

### Requirement: Workspace Owner has implicit Admin access to every project in their workspace
The system SHALL treat a user with an `Owner` `workspace_membership` row for a project's workspace as having `Admin` access to that project, whether or not an explicit `project_membership` row exists for them.

#### Scenario: Owner accesses a project with no explicit membership row
- **WHEN** a workspace Owner requests a project in their own workspace, and no `project_membership` row exists for them on that project
- **THEN** the request is treated as having `Admin`-level access

### Requirement: A Collaborator's project access comes only from an explicit membership
The system SHALL grant a workspace Collaborator access to a project only through an explicit `project_membership` row for that specific project, at the role recorded on that row.

#### Scenario: Collaborator with an explicit role
- **WHEN** a workspace Collaborator with a `Contributor` `project_membership` row requests that project
- **THEN** the request is treated as having `Contributor`-level access

#### Scenario: Collaborator with no membership row for this project
- **WHEN** a workspace Collaborator with no `project_membership` row for a given project requests it
- **THEN** the request is denied with HTTP 403, even though the project is visible to them at the workspace level

### Requirement: Endpoints can require a minimum project role
The system SHALL support gating an endpoint behind a minimum required project role (`Viewer` < `Contributor` < `Admin`), denying the request with 403 when the caller's effective role for the target project is below that minimum or absent.

#### Scenario: Caller meets the minimum role
- **WHEN** a caller with `Contributor`-level (or higher) effective access requests an endpoint requiring at least `Viewer`
- **THEN** the request proceeds

#### Scenario: Caller is below the minimum role
- **WHEN** a caller with no effective access to a project requests an endpoint requiring at least `Viewer` on that project
- **THEN** the request is denied with HTTP 403

### Requirement: A project response exposes the caller's effective role
The system SHALL include the caller's own effective project role in the response of an endpoint that returns a single project, so a client can gate its own UI without a second request.

#### Scenario: A project response includes the caller's role
- **WHEN** an authenticated caller with effective access to a project requests that project
- **THEN** the response includes their effective role (`Viewer`, `Contributor`, or `Admin`) for that project

### Requirement: A project in the trash grants no access
The system SHALL treat a deleted project as granting no effective role to anyone, Workspace Owners included, so every endpoint scoped to it is denied with 403 until it is restored. Restoring it SHALL bring back the access each user had before.

#### Scenario: Owner requests a deleted project's test cases
- **WHEN** a Workspace Owner requests the test cases of a project in the trash
- **THEN** the request is denied with HTTP 403

#### Scenario: Access returns after restore
- **WHEN** a project in which a Collaborator has `Contributor` membership is restored
- **THEN** that Collaborator again has `Contributor` access to it
