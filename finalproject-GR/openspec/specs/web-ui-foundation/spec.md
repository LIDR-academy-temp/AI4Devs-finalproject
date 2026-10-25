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
