# Spec Delta

## Purpose

A developer command that fills a real, signed-in user's default project with a consistent, believable demo dataset, so every screen can be demonstrated without hand-entering data.

## ADDED Requirements

### Requirement: The seed targets the default project of an existing user
The seed command SHALL take the target user's email address or Clerk user id and write into that user's default project, the one the app opens on sign-in. The user must have signed in at least once. If no such user exists, the command SHALL exit with a non-zero status and a message naming the problem, and SHALL write nothing.

#### Scenario: Seeding by email
- **WHEN** a developer runs the seed with the email of a user who has signed in
- **THEN** that user's default project contains the demo dataset, and the user sees it after signing in

#### Scenario: Seeding by Clerk user id
- **WHEN** a developer runs the seed with the Clerk user id of a user who has signed in
- **THEN** that user's default project contains the demo dataset

#### Scenario: Unknown user
- **WHEN** a developer runs the seed with an email that matches no Clerk user, or with a Clerk user id that has never signed in to the app
- **THEN** the command exits non-zero with a message saying which user could not be found, and nothing is written

#### Scenario: No target given
- **WHEN** a developer runs the seed with neither an email nor a Clerk user id
- **THEN** the command exits non-zero and prints its usage

### Requirement: The dataset covers every screen with consistent data
The seed SHALL add a Contributor and a Viewer teammate as project members, and a folder tree at least three levels deep. It SHALL add at least 25 test cases with Gherkin scripts in Ready, Draft and Deprecated status, and two environments with credentials. It SHALL add executions in Draft, Ready, In Progress, Paused, Completed and Done status, and bugs in several severities and statuses. Every row SHALL satisfy the rules the app itself enforces.

#### Scenario: Executions at every stage
- **WHEN** the seeded user opens the Executions screen
- **THEN** executions in Draft, Ready, In Progress, Paused, Completed and Done status are listed, and each one's done/total and Pass/Fail/Needs Review counts match its runs

#### Scenario: Started executions look started
- **WHEN** the seeded user opens a seeded execution that has started
- **THEN** its runs show the recorded test case names and scripts, its timer shows a non-zero elapsed time (advancing only for the In Progress one), and the Done execution shows who signed it off

#### Scenario: Bugs filed from runs
- **WHEN** the seeded user opens the Bugs screen
- **THEN** bugs of several severities and statuses are listed, most linked to a failed run with a failed step, and opening that run shows the bug

#### Scenario: Revealable credentials
- **WHEN** the seeded user, as a Contributor or above, reveals a seeded environment credential
- **THEN** the password is shown, so the seeded credential was encrypted with the workspace's key

#### Scenario: Test cases show their last outcome
- **WHEN** the seeded user opens the Test Cases screen
- **THEN** the seeded folders appear in the tree, and test cases that have a recorded outcome show it

### Requirement: The dataset has a believable history
Seeded rows SHALL carry creation and update times spread over the three weeks before the seed runs, in an order that matches the lifecycle: created before started, started before completed. Each seeded change of a kind the app logs (folder creation, execution lifecycle steps, run outcomes, bug filing and updates) SHALL have an activity entry with the matching time and the acting teammate or user, written the way the app writes it.

#### Scenario: History spans weeks and people
- **WHEN** the seeded project's activity entries are listed
- **THEN** they span roughly the last three weeks and name more than one actor

### Requirement: Seeding is additive, idempotent and all-or-nothing
The seed SHALL never modify or remove rows that already exist in the project. Its folders and test cases SHALL be placed after the project's existing root items. Running it again for the same user SHALL add nothing. If any part fails, nothing from that run SHALL remain.

#### Scenario: Existing data is kept
- **WHEN** a developer seeds a project that already has test cases, folders and executions
- **THEN** all of them are unchanged, and the seeded root folders come after the existing root folders

#### Scenario: Running twice
- **WHEN** a developer runs the seed a second time for the same user
- **THEN** the command reports that the demo data is already present, and no row is added or changed

#### Scenario: A clashing folder name
- **WHEN** the project already has a root folder with the same name as a seeded root folder
- **THEN** the command exits non-zero naming that folder, and nothing from this run is written

### Requirement: The seed respects tenant isolation
The seed SHALL write only into the target user's workspace, through the application's database role with that workspace's tenant context, so row-level security applies to every write.

#### Scenario: Other workspaces are untouched
- **WHEN** a developer seeds one user's project
- **THEN** no row in any other workspace is added or changed
