# Spec Delta

## ADDED Requirements

### Requirement: A project response exposes the caller's effective role
The system SHALL include the caller's own effective project role in the response of an endpoint that returns a single project, so a client can gate its own UI without a second request.

#### Scenario: A project response includes the caller's role
- **WHEN** an authenticated caller with effective access to a project requests that project
- **THEN** the response includes their effective role (`Viewer`, `Contributor`, or `Admin`) for that project
