# trash-purge Specification

## Purpose

Permanently removing items that have been in the trash for more than 30 days (PRD §2.11, ADR 0007), deciding what goes with them and what survives, and recording each removal in the activity log.

## Requirements

### Requirement: Items in the trash for more than 30 days are removed permanently
The purge SHALL permanently remove every project, folder, test case, execution and bug whose deletion is more than 30 days old, in every workspace. Items deleted 30 days ago or less, and items that are not deleted, SHALL be untouched.

#### Scenario: An old and a recent deletion
- **WHEN** the purge runs in a project with one bug deleted 31 days ago and one deleted 29 days ago
- **THEN** the first bug no longer exists and the second is still in the trash

#### Scenario: Live items are untouched
- **WHEN** the purge runs in a workspace with no deletions older than 30 days
- **THEN** no row is removed

### Requirement: Purging a project removes everything in it
Purging a project SHALL remove all of its folders, test cases, executions with their runs, bugs, tags, environments with their credentials, and project memberships. A user whose last active project it was SHALL fall back to another project.

#### Scenario: A project 31 days in the trash
- **WHEN** the purge runs 31 days after a project with test cases, an execution and a bug was deleted
- **THEN** the project and all of its content no longer exist, while the workspace's other projects are unchanged

### Requirement: Purging keeps run history and bug records
Purging a test case SHALL keep its runs inside their executions, with the name and script captured when the execution started, and SHALL clear the links to it from those runs and from bugs. Purging an execution SHALL remove its runs and clear the links to them from bugs, and the bugs SHALL remain.

#### Scenario: Purging a test case that was run
- **WHEN** a test case that has a run in a live execution and a bug pointing at it is purged
- **THEN** the run still shows the test case name, and the run and the bug no longer link to the test case

#### Scenario: Purging an execution with a bug filed from a run
- **WHEN** an execution whose run has a bug filed from it is purged
- **THEN** the bug still exists and no longer links to the run

### Requirement: A folder is purged with its subtree, children first
Purging a folder SHALL remove its test cases and subfolders that are due as well, removing contents before the folders that hold them. A folder still holding anything that is not due for purge SHALL be skipped and left in the trash.

#### Scenario: A deleted folder tree
- **WHEN** the purge runs 31 days after a folder with a subfolder and three test cases was deleted
- **THEN** the folder, the subfolder and the three test cases no longer exist

### Requirement: Each purged item is recorded once in the activity log
The purge SHALL write one entry per top-level purged item: a project, a deleted folder tree, or an individually deleted test case, execution or bug. The entry SHALL carry the item's name and be attributed to the system, not a person, in the same transaction as the removal. Items removed along with a project or folder SHALL NOT get entries of their own. Existing activity entries SHALL be unchanged.

#### Scenario: Purging a folder tree
- **WHEN** a deleted folder holding three test cases is purged
- **THEN** exactly one new activity entry records the folder's permanent removal, with no actor

#### Scenario: History survives
- **WHEN** a bug with activity entries is purged
- **THEN** all of its earlier entries still exist with their original content

### Requirement: The purge is idempotent and isolated per workspace
Running the purge again SHALL remove nothing more and write no new entries until more items come due. A failure in one workspace SHALL NOT undo or block the purge of another, and each item's removal and its entry SHALL commit together.

#### Scenario: Running twice
- **WHEN** the purge runs twice in a row
- **THEN** the second run removes nothing and writes no activity entries
