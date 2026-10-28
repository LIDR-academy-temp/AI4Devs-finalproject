# web-app-shell Specification

## Purpose

The web app's identity and session layer: lets a person sign up, sign in, and sign out through the browser, keeps every subsequent action authenticated without re-entering credentials, and gates the screens it hosts — starting with Test Cases — by the signed-in user's project role.

## Requirements

### Requirement: A visitor can create an account or sign in through the web app
The system SHALL let an unauthenticated visitor create a new account or sign in to an existing one through the web app.

#### Scenario: A new visitor signs up
- **WHEN** an unauthenticated visitor completes the sign-up form with a valid name, email, and password
- **THEN** they become a signed-in user

#### Scenario: A returning visitor signs in
- **WHEN** an unauthenticated visitor completes the sign-in form with valid credentials for an existing account
- **THEN** they become a signed-in user

### Requirement: Pages that require a session are only reachable while signed in
The system SHALL redirect an unauthenticated visitor to the sign-in page when they request a page that requires a session, and SHALL redirect an already signed-in user away from the sign-in or sign-up pages.

#### Scenario: An unauthenticated visitor is redirected away from a protected page
- **WHEN** an unauthenticated visitor requests a page that requires a session
- **THEN** they are redirected to the sign-in page instead

#### Scenario: A signed-in user is redirected away from sign-in or sign-up
- **WHEN** an already signed-in user requests the sign-in or sign-up page
- **THEN** they are redirected away from it instead

### Requirement: A signed-in user can sign out
The system SHALL let a signed-in user end their session through the web app, after which pages that require a session are no longer reachable without signing in again.

#### Scenario: Signing out ends the session
- **WHEN** a signed-in user signs out
- **THEN** they are no longer signed in, and requesting a page that requires a session redirects them to sign in

### Requirement: The web app carries the signed-in user's session on every request to the API
The system SHALL use the signed-in user's current session for every request the web app makes to the API, without the user re-authenticating for each individual action.

#### Scenario: A sequence of actions succeeds without re-authenticating
- **WHEN** a signed-in user performs several actions in the web app one after another
- **THEN** every action succeeds without the user being asked to sign in again between them

### Requirement: Signing in lands the user on their project's Test Cases screen
The system SHALL take a user straight to their active project's Test Cases screen immediately after signing in or signing up. The active project is the one they last switched to, when it is still available to them.

#### Scenario: Landing after sign-in
- **WHEN** a user finishes signing in
- **THEN** they land on their active project's Test Cases screen

#### Scenario: Landing on the last active project
- **WHEN** a user who last switched to "Mobile App" signs in
- **THEN** they land on the Test Cases screen of "Mobile App"

### Requirement: The Test Cases screen's available actions match the signed-in user's project role
The system SHALL show create, edit, and delete controls on the Test Cases screen only to a user whose effective project role permits that action, matching this platform's existing role rules (Viewer: read-only; Contributor: create and edit; Admin: create, edit, and delete).

#### Scenario: A Viewer sees no create, edit, or delete controls
- **WHEN** a user with `Viewer` access views the Test Cases screen
- **THEN** no create, edit, or delete control is shown

#### Scenario: A Contributor sees create and edit controls but not delete
- **WHEN** a user with `Contributor` access views the Test Cases screen
- **THEN** create and edit controls are shown, and no delete control is shown

#### Scenario: An Admin sees create, edit, and delete controls
- **WHEN** a user with `Admin` access views the Test Cases screen
- **THEN** create, edit, and delete controls are all shown

### Requirement: A user with no access to their resolved project sees an access-denied state
The system SHALL show an explicit access-denied state, rather than a broken or endlessly loading screen, when a signed-in user's resolved project does not grant them any effective role.

#### Scenario: No effective role on the resolved project
- **WHEN** a signed-in user's resolved project does not grant them any effective project role
- **THEN** the web app shows an access-denied state instead of the Test Cases screen

### Requirement: The app shell navigates between the project's screens
The signed-in app shell SHALL offer navigation to the Test Cases, Executions, and Bugs screens, each with its own icon, and indicate which one is current. The sidebar SHALL collapse to an icon-only rail and expand again; the user's choice SHALL be remembered across visits. While collapsed, each item SHALL still be identifiable by name (e.g. on hover or focus). On narrow screens the navigation SHALL open as an overlay instead of taking page width.

#### Scenario: Navigating to Executions
- **WHEN** a signed-in project member selects Executions in the shell's navigation
- **THEN** the Executions screen is shown and marked as the current screen

#### Scenario: Navigating to Bugs
- **WHEN** a signed-in project member selects Bugs in the shell's navigation
- **THEN** the Bugs screen is shown and marked as the current screen

#### Scenario: Collapsing the sidebar
- **WHEN** a user collapses the sidebar
- **THEN** only the items' icons remain visible, each still reachable and named on hover or focus, and the current screen stays marked

#### Scenario: The collapsed state is remembered
- **WHEN** a user collapses the sidebar and later reloads or returns to the app
- **THEN** the sidebar is still collapsed

### Requirement: The Test Cases screen can open on a specific test case
Opening the Test Cases screen with a test case identified in its address SHALL select that test case, so other screens can link to it.

#### Scenario: Following a link to a test case
- **WHEN** a project member follows a link to a specific test case from a bug's detail
- **THEN** the Test Cases screen opens with that test case selected

### Requirement: The shell shows the signed-in user and a user menu
The shell SHALL show the project switcher at the top of the navigation and, at its bottom, the signed-in user, opening a menu that offers the theme choice and Sign out.

#### Scenario: Signing out from the user menu
- **WHEN** a signed-in user opens the user menu and chooses Sign out
- **THEN** their session ends as the sign-out requirement describes

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
