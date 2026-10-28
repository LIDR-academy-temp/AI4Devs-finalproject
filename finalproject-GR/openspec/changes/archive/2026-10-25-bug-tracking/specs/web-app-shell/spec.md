# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: The app shell navigates between Test Cases and Executions`
- TO: `### Requirement: The app shell navigates between the project's screens`

## MODIFIED Requirements

### Requirement: The app shell navigates between the project's screens
The signed-in app shell SHALL offer navigation to the Test Cases, Executions, and Bugs screens, and indicate which one is current.

#### Scenario: Navigating to Executions
- **WHEN** a signed-in project member selects Executions in the shell's navigation
- **THEN** the Executions screen is shown and marked as the current screen

#### Scenario: Navigating to Bugs
- **WHEN** a signed-in project member selects Bugs in the shell's navigation
- **THEN** the Bugs screen is shown and marked as the current screen

## ADDED Requirements

### Requirement: The Test Cases screen can open on a specific test case
Opening the Test Cases screen with a test case identified in its address SHALL select that test case, so other screens can link to it.

#### Scenario: Following a link to a test case
- **WHEN** a project member follows a link to a specific test case from a bug's detail
- **THEN** the Test Cases screen opens with that test case selected
