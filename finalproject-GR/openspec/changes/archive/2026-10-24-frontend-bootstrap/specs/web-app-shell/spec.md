# Spec Delta

## Purpose

The web app's identity and session layer: lets a person sign up, sign in, and sign out through the browser, keeps every subsequent action authenticated without re-entering credentials, and gates the screens it hosts — starting with Test Cases — by the signed-in user's project role.

## ADDED Requirements

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
The system SHALL take a user straight to their resolved project's Test Cases screen immediately after signing in or signing up.

#### Scenario: Landing after sign-in
- **WHEN** a user finishes signing in
- **THEN** they land on their project's Test Cases screen

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
