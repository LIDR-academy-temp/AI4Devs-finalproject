# test-case-authoring Specification

## Purpose

Lets a project member author and read test cases — the fundamental content unit of the platform (PRD §2.5) — within a project they have access to, with source type always consistent with content and status explicitly settable.

## Requirements

### Requirement: A Contributor or above can create a test case
The system SHALL allow a caller with at least `Contributor` access to a project to create a test case in it, with an optional initial Gherkin script, an optional destination folder of the same project, and optional tags of the same project, defaulting its status to `Draft`. Without a folder the test case is created at the root. A new test case SHALL be placed last among its siblings.

#### Scenario: Creating a test case with a script
- **WHEN** a Contributor creates a test case in a project, supplying a name and a Gherkin script
- **THEN** the test case is created with that script, status `Draft`, and is retrievable afterward

#### Scenario: Creating a test case with no script
- **WHEN** a Contributor creates a test case supplying only a name
- **THEN** the test case is created with no script and status `Draft`

#### Scenario: Creating a test case in a folder
- **WHEN** a Contributor creates a test case in folder "Checkout", which already holds two test cases
- **THEN** the test case belongs to "Checkout" and is ordered after the existing two

#### Scenario: The folder must belong to the project
- **WHEN** a Contributor creates a test case in a folder of another project, a deleted folder, or a nonexistent one
- **THEN** the request is rejected with HTTP 400 and no test case is created

#### Scenario: Creating a test case with tags
- **WHEN** a Contributor creates a test case with the tags "smoke" and "checkout"
- **THEN** the created test case carries exactly those two tags

#### Scenario: Tags on create must belong to the project
- **WHEN** a Contributor creates a test case with a tag of another project or a nonexistent tag id
- **THEN** the request is rejected with HTTP 400 and no test case is created

#### Scenario: A Viewer cannot create a test case
- **WHEN** a caller with only `Viewer` access to a project attempts to create a test case in it
- **THEN** the request is denied with HTTP 403

### Requirement: Source type is derived from script content, never stored
The system SHALL treat a test case as Gherkin-sourced when it has a non-empty script and Manual otherwise, without persisting that classification as its own field.

#### Scenario: A test case with a script reports as Gherkin
- **WHEN** a test case with a non-empty Gherkin script is read
- **THEN** its source type is reported as Gherkin

#### Scenario: A test case with no script reports as Manual
- **WHEN** a test case with no Gherkin script is read
- **THEN** its source type is reported as Manual

### Requirement: A Contributor or above can update a test case's name, script, and status
The system SHALL allow a caller with at least `Contributor` access to a project to update a test case's name, Gherkin script, status, and tags in one request. Tags are given as the full set of tag ids the test case should carry, each a tag of the same project; any status may change to any other (ADR 0015).

#### Scenario: Updating name and script together
- **WHEN** a Contributor updates a test case's name and Gherkin script
- **THEN** both changes are persisted and reflected in a subsequent read

#### Scenario: Updating status
- **WHEN** a Contributor changes a test case's status to `Ready`
- **THEN** the test case's status is `Ready` afterward, with no additional approval step

#### Scenario: Setting tags
- **WHEN** a Contributor sets a test case's tags to "smoke" and "checkout"
- **THEN** a subsequent read of the test case reports exactly those two tags

#### Scenario: Tags must belong to the project
- **WHEN** a Contributor sets a test case's tags including a tag of another project or a nonexistent id
- **THEN** the request is rejected with HTTP 400 and the test case's tags are unchanged

#### Scenario: A Viewer cannot update a test case
- **WHEN** a caller with only `Viewer` access attempts to update a test case
- **THEN** the request is denied with HTTP 403

### Requirement: Any project member can list and view test cases
The system SHALL allow a caller with at least `Viewer` access to a project to list its test cases and view any individual test case's detail. Each test case SHALL include its folder (or none, for the root), its order among its siblings, the outcome of its most recent run in a started execution (or none if it has never run), and the ids of the tags it carries.

#### Scenario: Viewer lists test cases in a project
- **WHEN** a caller with `Viewer` access to a project requests its test case list
- **THEN** the response includes every non-deleted test case in that project

#### Scenario: Folder, order and last outcome are reported
- **WHEN** a test case in folder "Checkout" was last run with outcome `Fail`, and another at the root has never run
- **THEN** the first reports folder "Checkout" and last outcome `Fail`, the second reports no folder and no last outcome, and each reports its order key

#### Scenario: Tags are reported
- **WHEN** a test case carries "smoke" and another carries no tag
- **THEN** the first reports the "smoke" tag id and the second an empty tag list

#### Scenario: Caller with no access cannot list or view
- **WHEN** a caller with no effective access to a project requests its test case list or a test case's detail
- **THEN** the request is denied with HTTP 403

### Requirement: An Admin can delete a test case
The system SHALL allow a caller with at least `Admin` access to a project to delete a test case in it. Deletion is a soft delete: the test case is marked deleted rather than physically removed, and a deleted test case is excluded from the list and detail requirements of this capability. Deletion SHALL be refused with HTTP 409 while the test case belongs to an execution whose status is `Ready`, `InProgress`, or `Paused`.

#### Scenario: An Admin deletes a test case
- **WHEN** an Admin deletes a test case in a project
- **THEN** the test case no longer appears in that project's test case list, and its detail is no longer retrievable

#### Scenario: A test case in an active execution cannot be deleted
- **WHEN** an Admin deletes a test case that has a run in an execution whose status is `Ready`, `InProgress`, or `Paused`
- **THEN** the request is rejected with HTTP 409 and the test case is not deleted

#### Scenario: A test case only in Draft or finished executions can be deleted
- **WHEN** an Admin deletes a test case whose runs belong only to executions in `Draft`, `Completed`, or `Done` status
- **THEN** the test case is deleted

#### Scenario: A Contributor cannot delete a test case
- **WHEN** a caller with only `Contributor` access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

#### Scenario: A Viewer cannot delete a test case
- **WHEN** a caller with only `Viewer` access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

#### Scenario: A caller with no access cannot delete a test case
- **WHEN** a caller with no effective access to a project attempts to delete a test case in it
- **THEN** the request is denied with HTTP 403

### Requirement: Test case changes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction as the change, when a test case is created, updated, or deleted. A creation entry SHALL name the tags it was created with. An update entry SHALL record what changed: the old and new status, that the name or script changed, and the names of tags added and removed. An update that changes nothing SHALL write no entry.

#### Scenario: A status change is logged
- **WHEN** a Contributor changes a test case's status from `Draft` to `Ready`
- **THEN** an activity entry for that test case names the acting user and records the status going from `Draft` to `Ready`

#### Scenario: Tag changes are logged on the test case
- **WHEN** a Contributor adds "smoke" to a test case and removes "legacy"
- **THEN** the test case's activity entry records "smoke" added and "legacy" removed

#### Scenario: Creating and deleting are logged
- **WHEN** a Contributor creates a test case and an Admin later deletes it
- **THEN** the test case has a creation entry and a deletion entry, each naming its actor
