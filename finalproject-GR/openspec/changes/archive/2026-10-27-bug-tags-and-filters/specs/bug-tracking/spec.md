# Spec Delta

## MODIFIED Requirements

### Requirement: A Contributor or above can file a bug
The system SHALL allow a caller with at least `Contributor` access to a project to create a bug with a title, a severity (`Critical`, `High`, `Medium`, or `Low`), optional description and steps to reproduce, and optional tags of the same project. A new bug SHALL start in status `Open` and record its reporter's name.

#### Scenario: Filing a bug
- **WHEN** a Contributor files a bug titled "Checkout total is wrong" with severity `High`
- **THEN** the bug is returned with status `Open`, severity `High`, and the Contributor as reporter

#### Scenario: Filing a bug with tags
- **WHEN** a Contributor files a bug with the tags "checkout" and "regression"
- **THEN** the bug carries exactly those two tags

#### Scenario: Title and a valid severity are required
- **WHEN** a Contributor files a bug with a blank title or an unknown severity
- **THEN** the request is rejected with HTTP 400 and no bug is created

#### Scenario: Tags must belong to the project
- **WHEN** a Contributor files a bug with a tag of another project or a nonexistent tag id
- **THEN** the request is rejected with HTTP 400 and no bug is created

#### Scenario: A Viewer cannot file a bug
- **WHEN** a caller with only `Viewer` access files a bug
- **THEN** the request is denied with HTTP 403

### Requirement: Any project member can list and view bugs
The system SHALL allow a caller with at least `Viewer` access to list the project's non-deleted bugs and retrieve one. Each bug SHALL include its title, severity, status, reporter name, created and updated times, snapshot, failed step, its linked run (execution id and name, run position and outcome) and test case (id, and whether either has been deleted), and the ids of the tags it carries. The list SHALL be filterable to the bugs linked to one run.

#### Scenario: Viewing a linked bug
- **WHEN** a Viewer retrieves a bug filed from run 2 of execution "Smoke"
- **THEN** the bug reports execution "Smoke", run position 2 and that run's outcome, and its linked test case

#### Scenario: Tags are reported
- **WHEN** a Viewer lists bugs where one carries "checkout" and another none
- **THEN** the first reports the "checkout" tag id and the second an empty tag list

#### Scenario: Bugs for one run
- **WHEN** a Viewer lists bugs filtered to one run
- **THEN** only bugs linked to that run are returned

#### Scenario: Bugs are tenant-isolated
- **WHEN** a caller retrieves a bug id belonging to another workspace through their own project's route
- **THEN** the request returns HTTP 404

### Requirement: Contributors edit a bug's fields, status, and severity
The system SHALL allow a caller with at least `Contributor` access to change a bug's title, description, steps to reproduce, severity, status, and tags. Any status of `Open`, `InProgress`, `Resolved`, `Closed`, or `WontFix` MAY change to any other. Tags are given as the full set of tag ids the bug should carry, each a tag of the same project.

#### Scenario: Moving through the lifecycle
- **WHEN** a Contributor changes a bug from `Open` to `InProgress`, then to `Resolved`, then to `Closed`
- **THEN** each change succeeds and the bug ends `Closed`

#### Scenario: Reopening
- **WHEN** a Contributor changes a `Closed` bug to `Open`
- **THEN** the bug is `Open` again

#### Scenario: Setting tags
- **WHEN** a Contributor sets a bug's tags to "checkout"
- **THEN** a subsequent read of the bug reports exactly that tag

#### Scenario: Unknown values are rejected
- **WHEN** a Contributor sets an unknown status or severity, a blank title, or a tag of another project
- **THEN** the request is rejected with HTTP 400 and the bug is unchanged

#### Scenario: A Viewer cannot edit
- **WHEN** a Viewer changes a bug's status
- **THEN** the request is denied with HTTP 403

### Requirement: Bug changes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction as the change, when a bug is created (manually or automatically), edited, linked to a run, or deleted. A manual creation entry SHALL name the tags the bug was filed with, and an edit entry SHALL record the names of tags added and removed.

#### Scenario: Status change is logged
- **WHEN** a Contributor changes a bug's status
- **THEN** an activity entry for that bug recording the old and new status and the acting user exists

#### Scenario: Tag changes are logged
- **WHEN** a Contributor adds "checkout" to a bug and removes "legacy"
- **THEN** the bug's activity entry records "checkout" added and "legacy" removed
