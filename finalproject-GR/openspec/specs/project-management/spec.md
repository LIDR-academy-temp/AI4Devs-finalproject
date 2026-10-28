# project-management Specification

## Purpose

A workspace's projects: creating them, listing the ones a user can access, renaming them, and moving them to and restoring them from the trash, with role rules and activity logging.

## Requirements

### Requirement: A Workspace Owner can create a project
The system SHALL let a Workspace Owner create a project in their active workspace from a name of 1 to 100 characters after trimming. A Collaborator's attempt SHALL be denied with 403, and an empty or too-long name SHALL be rejected with 400. The Owner SHALL have Admin access to the new project through their Owner role, with no membership row needed.

#### Scenario: Owner creates a project
- **WHEN** a Workspace Owner creates a project named "Mobile App"
- **THEN** the project exists in their workspace and they have Admin access to it

#### Scenario: Collaborator cannot create a project
- **WHEN** a workspace Collaborator tries to create a project
- **THEN** the request is denied with HTTP 403 and no project is created

#### Scenario: Blank name is rejected
- **WHEN** an Owner tries to create a project whose name is only spaces
- **THEN** the request is rejected with HTTP 400

### Requirement: A project's slug is derived once from its name
The system SHALL set a project's slug at creation by lowercasing its name and turning each run of characters other than letters and digits into one hyphen, with no leading or trailing hyphen. A slug that would come out empty SHALL be `project`. If the slug is already used in the workspace, including by a project in the trash, a numeric suffix (`-2`, `-3`, …) SHALL make it unique. A slug SHALL never change after creation.

#### Scenario: Slug from a name
- **WHEN** an Owner creates a project named "Mobile App (iOS)"
- **THEN** its slug is `mobile-app-ios`

#### Scenario: Slug collision
- **WHEN** an Owner creates a second project named "Mobile App" in a workspace that already has the slug `mobile-app`
- **THEN** the new project's slug is `mobile-app-2`

#### Scenario: Renaming keeps the slug
- **WHEN** a project with slug `mobile-app` is renamed to "Android App"
- **THEN** its slug is still `mobile-app`

### Requirement: A user can list the projects they can access
The system SHALL return the live projects in the caller's active workspace that grant the caller an effective role, each with its id, name, slug and the caller's role, ordered by name. Projects in the trash SHALL NOT be listed.

#### Scenario: Owner sees every live project
- **WHEN** a Workspace Owner lists projects in a workspace with three live projects and one in the trash
- **THEN** the three live projects are returned, each with role `Admin`

#### Scenario: Collaborator sees only their memberships
- **WHEN** a Collaborator with a `Viewer` membership on one of three projects lists projects
- **THEN** only that project is returned, with role `Viewer`

### Requirement: A Project Admin can rename a project
The system SHALL let a caller with Admin access rename a project, subject to the same name rules as creation. A Contributor or Viewer SHALL be denied with 403.

#### Scenario: Admin renames
- **WHEN** a Project Admin renames "Mobile App" to "Mobile App v2"
- **THEN** the project's name is "Mobile App v2"

#### Scenario: Contributor cannot rename
- **WHEN** a Contributor tries to rename the project
- **THEN** the request is denied with HTTP 403 and the name is unchanged

### Requirement: A Workspace Owner can move a project to the trash
The system SHALL let a Workspace Owner delete a project, which records who deleted it and when and keeps all of its content. A caller who is not an Owner, including a Project Admin, SHALL be denied with 403.

#### Scenario: Owner deletes a project
- **WHEN** an Owner deletes one of two live projects
- **THEN** the project is in the trash, no longer listed among accessible projects, and its test cases, executions and bugs still exist

#### Scenario: Project Admin who is not Owner cannot delete
- **WHEN** a Collaborator with an `Admin` membership on a project tries to delete it
- **THEN** the request is denied with HTTP 403

### Requirement: The last live project cannot be deleted
The system SHALL refuse with 409 a request to delete the only live project in a workspace, so a workspace always has a project to open.

#### Scenario: Deleting the only project
- **WHEN** an Owner tries to delete the only live project in their workspace
- **THEN** the request is refused with HTTP 409 and the project stays live

### Requirement: A Workspace Owner can restore a project from the trash
The system SHALL let a Workspace Owner restore a project in the trash with all of its content, keeping its name and slug. Restoring a project that is not in the trash SHALL be rejected with 409, and a non-Owner SHALL be denied with 403.

#### Scenario: Owner restores a project
- **WHEN** an Owner restores a project from the trash
- **THEN** it is live again, listed among accessible projects, and its test cases are reachable as before

### Requirement: Project changes are activity-logged
The system SHALL write an activity entry, in the same transaction, when a project is created, renamed (with the old and new name), deleted or restored, under category `Projects`, attributed to the acting user.

#### Scenario: Rename is logged
- **WHEN** an Admin renames "Mobile App" to "Mobile App v2"
- **THEN** an activity entry records the rename with both names and the actor
