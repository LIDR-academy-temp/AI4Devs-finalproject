# bug-tracking Specification

## Purpose

Tracks the defects found while testing: bugs with a severity and status lifecycle, optionally tied to the test run and test case that exposed them, keeping a snapshot of the script as it was when the bug was filed.

## Requirements

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

### Requirement: A bug filed from a run keeps the run's snapshot
When a bug is filed against a test run, the system SHALL link it to that run and to the run's test case, and SHALL store the test case name and Gherkin script as the run recorded them when its execution started. The snapshot SHALL come from the run, never from the request. Only runs of started executions SHALL be accepted.

#### Scenario: Filing from a run
- **WHEN** a Contributor files a bug against a run of an In Progress execution
- **THEN** the bug links to that run and its test case, and its snapshot equals the run's recorded test case name and script

#### Scenario: Later test case edits do not change the bug
- **WHEN** the linked test case's name and script are edited after the bug is filed
- **THEN** the bug still reports the snapshot taken when it was filed

#### Scenario: A run of an unstarted execution is rejected
- **WHEN** a Contributor files a bug against a run of a Draft or Ready execution, or against a run of another project
- **THEN** the request is rejected with HTTP 400

### Requirement: A bug can name the failed step from its snapshot
A bug filed from a run MAY record a failed step. The failed step SHALL be exactly one non-blank line of the bug's Gherkin snapshot; any other value SHALL be rejected with HTTP 400. A bug with no snapshot SHALL NOT have a failed step.

#### Scenario: Recording the failed step
- **WHEN** a Contributor files a bug from a run whose script contains the line "Then the total is $10" and names that line as the failed step
- **THEN** the bug reports that line as its failed step

#### Scenario: A step not in the script is rejected
- **WHEN** a Contributor names a failed step that is not a line of the run's script
- **THEN** the request is rejected with HTTP 400

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

### Requirement: An existing bug can be linked to a run
The system SHALL allow a caller with at least `Contributor` access to link a bug that has no run to a run of a started execution in the same project, taking that run's snapshot as if the bug had been filed from it. Linking a bug that already has a run SHALL be refused with HTTP 409.

#### Scenario: Linking an unlinked bug
- **WHEN** a Contributor links a manually filed bug to a run of a Completed execution
- **THEN** the bug links to that run and its test case and reports the run's snapshot

#### Scenario: A linked bug cannot be relinked
- **WHEN** a Contributor links a bug that is already linked to a run
- **THEN** the request is rejected with HTTP 409 and the bug keeps its original run

### Requirement: An Admin can delete a bug
The system SHALL allow a caller with at least `Admin` access to delete a bug. Deletion is a soft delete: the bug is excluded from list and detail afterwards. Contributors and Viewers SHALL be denied with HTTP 403.

#### Scenario: Deleting a bug
- **WHEN** an Admin deletes a bug
- **THEN** it no longer appears in the list and retrieving it returns HTTP 404

#### Scenario: A Contributor cannot delete
- **WHEN** a Contributor deletes a bug
- **THEN** the request is denied with HTTP 403

### Requirement: Failing a run auto-creates a bug when the execution asks for it
When a run's outcome is set to `Fail` on an execution with auto-create-bug-on-failure enabled, the system SHALL create a bug in the same operation: titled with the run's test case name, carrying the run's snapshot, severity `Medium`, status `Open`, reported by the user who set the outcome, and marked as automatically created. At most one bug SHALL be auto-created per run.

#### Scenario: Auto-created on failure
- **WHEN** a Contributor sets a run to `Fail` on an execution with auto-create enabled
- **THEN** one Open, Medium bug titled with the test case name exists for that run, marked automatically created

#### Scenario: Not created when disabled
- **WHEN** a Contributor sets a run to `Fail` on an execution with auto-create disabled
- **THEN** no bug is created

#### Scenario: Only once per run
- **WHEN** a run is set to `Fail`, then `Pass`, then `Fail` again on an execution with auto-create enabled
- **THEN** exactly one auto-created bug exists for that run

### Requirement: Bug changes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction as the change, when a bug is created (manually or automatically), edited, linked to a run, or deleted. A manual creation entry SHALL name the tags the bug was filed with, and an edit entry SHALL record the names of tags added and removed.

#### Scenario: Status change is logged
- **WHEN** a Contributor changes a bug's status
- **THEN** an activity entry for that bug recording the old and new status and the acting user exists

#### Scenario: Tag changes are logged
- **WHEN** a Contributor adds "checkout" to a bug and removes "legacy"
- **THEN** the bug's activity entry records "checkout" added and "legacy" removed
