# Spec Delta

## Purpose

Workspace-wide administration: the active workspace's name and the caller's workspace role, renaming the workspace, and the Owner's overview of all of its projects, live and in the trash.

## ADDED Requirements

### Requirement: A member can read their active workspace
The system SHALL return the caller's active workspace's id, name and the caller's workspace role (`Owner` or `Collaborator`).

#### Scenario: Collaborator reads the workspace
- **WHEN** a Collaborator requests their active workspace
- **THEN** the response contains its name and the role `Collaborator`

### Requirement: A Workspace Owner can rename the workspace
The system SHALL let a Workspace Owner rename the active workspace to a name of 1 to 100 characters after trimming, writing an activity entry under category `Workspace` with the old and new name. A Collaborator SHALL be denied with 403, and an invalid name SHALL be rejected with 400.

#### Scenario: Owner renames
- **WHEN** an Owner renames the workspace "Acme's Workspace" to "Acme QA"
- **THEN** the workspace's name is "Acme QA" and an activity entry records both names

#### Scenario: Collaborator cannot rename
- **WHEN** a Collaborator tries to rename the workspace
- **THEN** the request is denied with HTTP 403

### Requirement: A Workspace Owner can see an overview of all projects
The system SHALL return to a Workspace Owner every live project in the workspace with its name, slug, live test case count and live execution count, and separately every project in the trash with its name, who deleted it, when, and the whole days left before its 30-day removal. A Collaborator SHALL be denied with 403.

#### Scenario: Overview with counts
- **WHEN** an Owner requests the overview of a workspace whose project has 12 live test cases, 1 test case in the trash and 3 live executions
- **THEN** that project is listed with 12 test cases and 3 executions

#### Scenario: Recently deleted projects
- **WHEN** an Owner requests the overview two days after deleting a project
- **THEN** that project is listed among deleted projects with the deleter's name, the deletion time and 28 days left
