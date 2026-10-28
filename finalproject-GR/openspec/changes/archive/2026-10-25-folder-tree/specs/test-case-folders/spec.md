# Spec Delta

## Purpose

Organizes a project's test cases into a folder hierarchy up to four levels deep, with user-controlled ordering, moving, and Admin deletion of whole subtrees.

## ADDED Requirements

### Requirement: Contributors create and rename folders
The system SHALL allow a caller with at least `Contributor` access to create a folder at the root or inside another folder of the same project, and to rename it. A folder's name SHALL be non-blank and unique among its sibling folders, ignoring case. A new folder SHALL be placed last among its sibling folders.

#### Scenario: Creating a nested folder
- **WHEN** a Contributor creates folder "Payments" inside folder "Checkout"
- **THEN** "Payments" exists inside "Checkout", ordered after Checkout's other subfolders

#### Scenario: Duplicate sibling names are rejected
- **WHEN** a Contributor creates or renames a folder to "payments" next to an existing sibling "Payments"
- **THEN** the request is rejected with HTTP 409

#### Scenario: A Viewer cannot create folders
- **WHEN** a caller with only `Viewer` access creates a folder
- **THEN** the request is denied with HTTP 403

### Requirement: Folders nest at most four levels deep
The system SHALL refuse with HTTP 409 any folder creation or move that would place a folder deeper than four levels (a root folder is level 1), and any move of a folder into itself or one of its descendants.

#### Scenario: Creating a fifth level
- **WHEN** a Contributor creates a folder inside a level-4 folder
- **THEN** the request is rejected with HTTP 409

#### Scenario: Moving a subtree too deep
- **WHEN** a Contributor moves a folder that has two levels of subfolders into a level-3 folder
- **THEN** the request is rejected with HTTP 409 and nothing moves

#### Scenario: Moving a folder into its own descendant
- **WHEN** a Contributor moves folder "Checkout" into its subfolder "Payments"
- **THEN** the request is rejected with HTTP 409

### Requirement: Folders and test cases can be moved and reordered
The system SHALL allow a caller with at least `Contributor` access to move a folder or test case to another parent (a folder of the same project, or the root) and to choose its position among its new siblings of the same kind by naming the sibling it goes after (or none, to go first). Within a parent, folders SHALL be ordered before test cases, each group by its own order. A move SHALL change only the moved item.

#### Scenario: Reordering test cases
- **WHEN** a Contributor moves test case C after test case A in a folder holding A, B, C in that order
- **THEN** the folder's test cases are ordered A, C, B

#### Scenario: Moving a test case to the root
- **WHEN** a Contributor moves a test case out of its folder to the root, first among root test cases
- **THEN** the test case is at the root, ordered before the other root test cases

#### Scenario: Folders list before test cases
- **WHEN** a folder contains subfolder X and test case Y
- **THEN** the folder's contents are listed with X before Y, regardless of when each was created

#### Scenario: Invalid targets are rejected
- **WHEN** a Contributor moves an item into a folder of another project or a deleted folder, or after a sibling that isn't in the target parent
- **THEN** the request is rejected with HTTP 400 and nothing moves

### Requirement: An Admin can delete a folder with its contents
The system SHALL allow a caller with at least `Admin` access to delete a folder, which also deletes all its subfolders and the test cases within them, as one soft delete. Deletion SHALL be refused with HTTP 409, naming the executions involved, while any of those test cases belongs to an execution whose status is `Ready`, `InProgress`, or `Paused`. Before deleting, a caller SHALL be able to learn how many folders and test cases would be affected.

#### Scenario: Deleting a folder subtree
- **WHEN** an Admin deletes folder "Checkout", holding subfolder "Payments" and three test cases in total
- **THEN** "Checkout", "Payments" and the three test cases no longer appear in the folder or test case lists

#### Scenario: Seeing the impact first
- **WHEN** a caller asks what deleting "Checkout" would affect
- **THEN** they learn it would delete 2 folders and 3 test cases

#### Scenario: An active execution blocks deletion
- **WHEN** an Admin deletes a folder containing a test case that is part of an In Progress execution
- **THEN** the request is rejected with HTTP 409 naming that execution, and nothing is deleted

#### Scenario: A Draft execution does not block deletion
- **WHEN** an Admin deletes a folder whose test cases are only in Draft executions
- **THEN** the folder and its contents are deleted

#### Scenario: A Contributor cannot delete folders
- **WHEN** a caller with only `Contributor` access deletes a folder
- **THEN** the request is denied with HTTP 403

### Requirement: Any project member can list the project's folders
The system SHALL allow a caller with at least `Viewer` access to list the project's non-deleted folders, each with its name, parent, and order. Folders SHALL be tenant-isolated like all project content.

#### Scenario: Listing folders
- **WHEN** a Viewer lists folders in a project with folders "Checkout" and its subfolder "Payments"
- **THEN** both are returned, "Payments" reporting "Checkout" as its parent

#### Scenario: Another workspace's folder
- **WHEN** a caller references a folder of another workspace through their own project's routes
- **THEN** it is treated as nonexistent (HTTP 404 for direct access, HTTP 400 as a target)

### Requirement: Folder changes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction as the change, when a folder is created, renamed, moved, or deleted (naming how many folders and test cases the deletion included), and when a test case is moved.

#### Scenario: Deleting a folder is logged
- **WHEN** an Admin deletes a folder with two test cases
- **THEN** an activity entry for that folder records the deletion and the counts of folders and test cases deleted
