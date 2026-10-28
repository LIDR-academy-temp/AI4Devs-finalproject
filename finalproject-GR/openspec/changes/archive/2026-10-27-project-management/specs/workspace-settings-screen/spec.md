# Spec Delta

## Purpose

The Workspace Settings screen, where a Workspace Owner renames the workspace and manages its projects: creating, opening their settings, deleting and restoring them.

## ADDED Requirements

### Requirement: Workspace Settings is available to Workspace Owners only
The web app SHALL offer a Workspace Settings screen, reachable from the project switcher's menu by Workspace Owners. A Collaborator who opens its address SHALL see an access-denied state.

#### Scenario: Owner opens Workspace Settings
- **WHEN** an Owner chooses Workspace settings in the project switcher's menu
- **THEN** the Workspace Settings screen is shown

#### Scenario: Collaborator opens the address directly
- **WHEN** a Collaborator opens the Workspace Settings address
- **THEN** an access-denied state is shown

### Requirement: The workspace name is editable inline
The screen SHALL show the workspace name at the top as an inline-editable field that saves when confirmed and shows validation errors inline.

#### Scenario: Renaming the workspace
- **WHEN** an Owner changes the workspace name to "Acme QA" and confirms
- **THEN** the new name is saved and shown

### Requirement: The screen lists the workspace's projects
The screen SHALL list every live project with its name, test case count and execution count. Each row SHALL offer a Settings action that makes that project active and opens its Project Settings.

#### Scenario: Opening another project's settings
- **WHEN** an Owner chooses Settings on a project other than the active one
- **THEN** that project becomes active and its Project Settings screen opens

### Requirement: An Owner can create a project from the screen
The screen SHALL offer a New project button that opens a dialog asking for the project name, with validation errors shown in the dialog. Creating SHALL add the project to the list and make it the active project.

#### Scenario: Creating a project
- **WHEN** an Owner chooses New project, enters "Mobile App" and saves
- **THEN** "Mobile App" appears in the projects list and becomes the active project in the switcher

### Requirement: An Owner can delete a project after confirming
Each project row SHALL offer Delete, which asks for confirmation stating that the project and everything in it move to the trash for 30 days. On the only live project the action SHALL be unavailable, with an explanation. Deleting the active project SHALL switch the app to another accessible project.

#### Scenario: Deleting a project
- **WHEN** an Owner chooses Delete on "Old App" and confirms
- **THEN** "Old App" leaves the projects list and appears under Recently deleted

#### Scenario: The only project cannot be deleted
- **WHEN** an Owner views the list of a workspace with a single live project
- **THEN** its Delete action is unavailable and says the last project cannot be deleted

### Requirement: Recently deleted projects can be restored
The screen SHALL show a Recently deleted list with each project in the trash, who deleted it, when, and the days left, and a Restore action that returns the project to the projects list.

#### Scenario: Restoring a project
- **WHEN** an Owner chooses Restore on "Old App" under Recently deleted
- **THEN** "Old App" returns to the projects list and to the project switcher
