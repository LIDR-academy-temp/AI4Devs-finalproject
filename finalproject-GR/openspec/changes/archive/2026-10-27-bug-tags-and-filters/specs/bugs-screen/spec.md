# Spec Delta

## MODIFIED Requirements

### Requirement: The bug list can be sorted and filtered
The Bugs screen SHALL let the user sort the list by last updated, creation date, status, or severity, ascending or descending, and filter it by title text, status, severity, and tags (any of the picked tags). The default is last updated, newest first.

#### Scenario: Sorting by severity
- **WHEN** the user sorts by severity descending
- **THEN** Critical bugs are listed first and Low bugs last

#### Scenario: Filtering by status
- **WHEN** the user filters by status Open
- **THEN** only Open bugs are listed

#### Scenario: Filtering by tags
- **WHEN** the user picks "checkout" and "payments" in the Tags filter
- **THEN** only bugs carrying "checkout" or "payments" are listed

### Requirement: Contributors file bugs from the Bugs screen
Contributors and Admins SHALL be able to file a bug from the Bugs screen with a title (required), severity (default Medium), description, steps to reproduce, and tags picked or created with the tag picker. The new bug opens selected.

#### Scenario: Filing from the Bugs screen
- **WHEN** a Contributor files a bug with a title and severity High
- **THEN** the new bug is selected, Open, and shown in the list

#### Scenario: Filing with tags
- **WHEN** a Contributor picks "checkout" and creates the new tag "payments" in the form, then files the bug
- **THEN** the new bug carries both tags

#### Scenario: Title is required
- **WHEN** a Contributor saves the form without a title
- **THEN** the form shows the title is required and nothing is saved

## ADDED Requirements

### Requirement: The bug detail shows and edits its tags
The bug detail SHALL show the bug's tags as coloured badges. For Contributors and Admins it SHALL offer the tag picker, which adds or removes a tag on selection and saves at once, and can create a tag from typed text. Viewers SHALL see the badges only. The Bugs list's Tags filter SHALL also offer Manage tags.

#### Scenario: Tagging a bug
- **WHEN** a Contributor opens a bug's tag picker and selects "regression"
- **THEN** the "regression" badge appears on the bug and stays after a reload

#### Scenario: Viewer sees badges only
- **WHEN** a Viewer opens a bug that carries tags
- **THEN** the badges are shown and no tag picker is offered

#### Scenario: Managing tags from the Bugs screen
- **WHEN** a Contributor chooses Manage tags in the Bugs list's Tags filter
- **THEN** the Manage tags dialog opens
