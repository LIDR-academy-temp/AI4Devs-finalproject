# bugs-screen Specification

## Purpose

Gives project members a web screen to track bugs: the bug list, each bug's detail with its linked run, test case and script snapshot, inline editing of its fields and status, and filing new bugs.

## Requirements

### Requirement: The Bugs screen lists the project's bugs
The Bugs screen SHALL list every non-deleted bug of the user's project, showing each bug's title, a color-coded severity indicator, and its status.

#### Scenario: Listing bugs
- **WHEN** a project member opens the Bugs screen in a project with two bugs
- **THEN** both are listed with their title, severity indicator, and status

#### Scenario: No bugs yet
- **WHEN** a project member opens the Bugs screen in a project with no bugs
- **THEN** an empty state is shown, with a way to file one if the user is a Contributor or above

### Requirement: The bug list can be sorted and filtered
The Bugs screen SHALL let the user sort the list by last updated, creation date, status, or severity, ascending or descending, and filter it by title text, status, and severity. The default is last updated, newest first.

#### Scenario: Sorting by severity
- **WHEN** the user sorts by severity descending
- **THEN** Critical bugs are listed first and Low bugs last

#### Scenario: Filtering by status
- **WHEN** the user filters by status Open
- **THEN** only Open bugs are listed

### Requirement: Selecting a bug shows its detail
Selecting a bug SHALL show its title, status, severity, reporter, description, steps to reproduce, linked test run (execution name, run position, run outcome, with a link to the execution), linked test case (with a link to it), and its Gherkin snapshot with the failed step highlighted. Links to deleted items SHALL be shown as deleted instead of navigable.

#### Scenario: A bug filed from a run
- **WHEN** a project member selects a bug filed from run 2 of execution "Smoke" with failed step "Then the total is $10"
- **THEN** the detail links to execution "Smoke" with run 2, links to the test case, and shows the snapshot with that line highlighted

#### Scenario: A manually filed bug
- **WHEN** a project member selects a bug filed without a run
- **THEN** the linked run, linked test case and snapshot sections say there is none

#### Scenario: Linked test case was deleted
- **WHEN** the bug's linked test case has been deleted
- **THEN** the test case is shown as deleted and is not a link

### Requirement: Contributors edit a bug inline
For Contributors and Admins, the detail SHALL allow changing the title, status (Open, In Progress, Resolved, Closed, Won't Fix — any to any), and severity inline, and editing description and steps to reproduce, saved when the field loses focus. Viewers SHALL see the same fields read-only.

#### Scenario: Changing status
- **WHEN** a Contributor changes a bug's status from Open to In Progress
- **THEN** the detail and the list show In Progress

#### Scenario: Viewer sees read-only fields
- **WHEN** a Viewer selects a bug
- **THEN** no field can be edited

### Requirement: Contributors file bugs from the Bugs screen
Contributors and Admins SHALL be able to file a bug from the Bugs screen with a title (required), severity (default Medium), description, and steps to reproduce. The new bug opens selected.

#### Scenario: Filing from the Bugs screen
- **WHEN** a Contributor files a bug with a title and severity High
- **THEN** the new bug is selected, Open, and shown in the list

#### Scenario: Title is required
- **WHEN** a Contributor saves the form without a title
- **THEN** the form shows the title is required and nothing is saved

### Requirement: An Admin can delete a bug after confirming
Deleting SHALL be offered only to Admins, ask for confirmation, then remove the bug from the list and clear the selection.

#### Scenario: Deleting a bug
- **WHEN** an Admin deletes a bug and confirms
- **THEN** it disappears from the list and the detail panel is cleared
