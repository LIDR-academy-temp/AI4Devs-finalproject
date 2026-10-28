# Spec Delta

## ADDED Requirements

### Requirement: A project in the trash grants no access
The system SHALL treat a deleted project as granting no effective role to anyone, Workspace Owners included, so every endpoint scoped to it is denied with 403 until it is restored. Restoring it SHALL bring back the access each user had before.

#### Scenario: Owner requests a deleted project's test cases
- **WHEN** a Workspace Owner requests the test cases of a project in the trash
- **THEN** the request is denied with HTTP 403

#### Scenario: Access returns after restore
- **WHEN** a project in which a Collaborator has `Contributor` membership is restored
- **THEN** that Collaborator again has `Contributor` access to it
