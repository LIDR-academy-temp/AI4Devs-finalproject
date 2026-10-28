# web-ui-foundation Specification

## Purpose

Defines the presentation behavior every screen of the web app shares: the user's theme preference, confirmation of completed actions, consistent loading, empty and error states, and how Gherkin scripts are displayed.

## Requirements

### Requirement: Users choose a light, dark, or system theme
The web app SHALL offer Light, Dark, and System themes, System following the operating system's preference. The choice SHALL be remembered in the browser and applied before the page first renders, so no page shows the wrong theme momentarily.

#### Scenario: Choosing dark
- **WHEN** a user chooses Dark in the user menu
- **THEN** the app switches to the dark theme immediately, and stays dark after a reload

#### Scenario: Following the system
- **WHEN** a user chooses System and their operating system prefers dark
- **THEN** the app uses the dark theme

### Requirement: Successful actions are confirmed by a notification
After a user's create, save, status change, delete, or password reveal succeeds, the web app SHALL show a brief, non-blocking notification naming what happened. Failed or refused actions SHALL keep showing their reason next to the control that triggered them.

#### Scenario: Creating an execution
- **WHEN** a Contributor creates an execution
- **THEN** a notification confirms the execution was created, and it disappears on its own

#### Scenario: A refused action
- **WHEN** a Sign Off is refused because a run still needs review
- **THEN** the reason is shown next to the action, as before, not only as a notification

### Requirement: Lists and details share loading, empty, and error states
Every list and detail on the Test Cases, Executions, and Bugs screens SHALL show a placeholder while loading, an empty state explaining what belongs there (with a way to create one for users allowed to), and, if loading fails, an error state with a way to retry.

#### Scenario: Load failure with retry
- **WHEN** loading the bug list fails
- **THEN** an error state is shown with a Retry action, and choosing Retry loads the list again

#### Scenario: Empty list for a Viewer
- **WHEN** a Viewer opens a screen whose list is empty
- **THEN** the empty state explains what belongs there and offers no create action

### Requirement: Gherkin scripts are displayed with line numbers and keyword highlighting
Wherever a Gherkin script is shown read-only, the web app SHALL show line numbers and visually distinguish the Gherkin keywords (`Feature`, `Background`, `Scenario`, `Scenario Outline`, `Examples`, `Given`, `When`, `Then`, `And`, `But`) at the start of a line. A bug's failed step SHALL remain distinctly highlighted.

#### Scenario: Viewing a run's script
- **WHEN** a user opens a run whose script is "Given a cart" then "Then the total is $10"
- **THEN** the script shows lines 1 and 2 numbered, with "Given" and "Then" highlighted as keywords

#### Scenario: A bug's failed step
- **WHEN** a user views a bug whose failed step is "Then the total is $10"
- **THEN** that line is highlighted as the failed step, with its keyword still distinguished

### Requirement: Create and edit forms open in one consistent modal
The New Test Case, New and Edit Execution, and New Bug / File bug forms SHALL each open as a modal over the current screen with the same layout. The layout is a title, an optional description, the form fields, the server's reason if saving fails, and a footer with Cancel followed by the submit action. The submit action SHALL be disabled while saving. A long form SHALL scroll inside the modal.

#### Scenario: Same layout everywhere
- **WHEN** a Contributor opens New Test Case, New Execution, and New Bug in turn
- **THEN** each opens as a modal with its title at the top and Cancel followed by its submit action at the bottom

#### Scenario: Closing without saving
- **WHEN** a Contributor fills in part of a form and presses Escape, the close button, Cancel, or clicks outside the modal
- **THEN** the modal closes, nothing is saved, and the screen behind it is as it was

#### Scenario: Reopening starts fresh
- **WHEN** a Contributor closes a create form without saving and opens it again
- **THEN** the form shows its default values, not the abandoned input

#### Scenario: Saving
- **WHEN** a Contributor submits a valid form
- **THEN** the submit action is disabled until the server answers, and on success the modal closes and a notification confirms what was created or saved

#### Scenario: A refused save
- **WHEN** the server refuses a submitted form
- **THEN** the modal stays open with the input intact and shows the server's reason inside the modal
