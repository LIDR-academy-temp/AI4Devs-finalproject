# Spec Delta

## MODIFIED Requirements

### Requirement: Signing in lands the user on their project's Test Cases screen
The system SHALL take a user straight to their active project's Test Cases screen immediately after signing in or signing up. The active project is the one they last switched to, when it is still available to them.

#### Scenario: Landing after sign-in
- **WHEN** a user finishes signing in
- **THEN** they land on their active project's Test Cases screen

#### Scenario: Landing on the last active project
- **WHEN** a user who last switched to "Mobile App" signs in
- **THEN** they land on the Test Cases screen of "Mobile App"

### Requirement: The shell shows the signed-in user and a user menu
The shell SHALL show the project switcher at the top of the navigation and, at its bottom, the signed-in user, opening a menu that offers the theme choice and Sign out.

#### Scenario: Signing out from the user menu
- **WHEN** a signed-in user opens the user menu and chooses Sign out
- **THEN** their session ends as the sign-out requirement describes

## ADDED Requirements

### Requirement: The shell offers a project switcher
The top of the navigation SHALL show the active project's name and open a menu listing every project the user can access, with the active one marked. Choosing another project SHALL make it active, discard data shown for the previous project, and open its Test Cases screen. For Workspace Owners the menu SHALL also offer New project and Workspace settings.

#### Scenario: Switching to another project
- **WHEN** a user opens the project switcher and chooses "Mobile App"
- **THEN** the Test Cases screen shows "Mobile App"'s test cases and the switcher shows "Mobile App"

#### Scenario: Collaborator sees only their projects
- **WHEN** a Collaborator with a membership on one of three projects opens the project switcher
- **THEN** only that project is listed and no New project or Workspace settings entry is shown

#### Scenario: Owner creates a project from the switcher
- **WHEN** an Owner chooses New project in the switcher and creates "Mobile App"
- **THEN** "Mobile App" becomes the active project

### Requirement: The navigation offers Project Settings to Project Admins
The shell's navigation SHALL include a Project Settings item, with its own icon, for users with Admin access to the active project, and SHALL NOT show it to Contributors or Viewers.

#### Scenario: Admin sees Project Settings
- **WHEN** a Project Admin views the shell
- **THEN** Project Settings is in the navigation

#### Scenario: Viewer does not
- **WHEN** a Viewer views the shell
- **THEN** Project Settings is not in the navigation
