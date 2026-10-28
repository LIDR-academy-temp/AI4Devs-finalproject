# Environment Credentials Specification

## Purpose

Lets a project define named target configurations (Environments) with one or more credential sets, so that manual testers — and later the automated engine — can log into the application under test, while the stored password stays recoverable only through an authorized, audited reveal.

## Requirements

### Requirement: A project can define environments with a name, base URL, and default browser
The system SHALL let a project have zero or more environments, each with a name, a base URL, and a default browser preference.

#### Scenario: Creating an environment
- **WHEN** a Project Admin or Workspace Owner creates an environment with a name, base URL, and default browser
- **THEN** the environment is created and appears in the project's environment list

#### Scenario: Editing an environment's own fields
- **WHEN** a Project Admin or Workspace Owner updates an environment's name, base URL, or default browser
- **THEN** the environment reflects the updated values

### Requirement: An environment can hold one or more named credential sets
The system SHALL let an environment have one or more credentials, each identified by a friendly alias unique within that environment, with an email address and a password.

#### Scenario: Adding a credential to an environment
- **WHEN** a Project Admin or Workspace Owner adds a credential with an alias, email, and password to an environment
- **THEN** the credential is stored under that environment and its alias appears in the environment's credential list

#### Scenario: Two credentials in the same environment cannot share an alias
- **WHEN** a Project Admin or Workspace Owner attempts to add a credential whose alias duplicates an existing credential's alias within the same environment
- **THEN** the request is rejected and no duplicate credential is created

### Requirement: A credential's password is never readable without going through the reveal path
The system SHALL store every credential password in encrypted form and SHALL exclude password values from every environment list and detail response, exposing only whether a password is set.

#### Scenario: Listing or viewing environments never exposes a password
- **WHEN** any project member lists a project's environments or views one environment's detail, including its credentials
- **THEN** the response includes each credential's alias and email but no password value

### Requirement: Revealing a credential's password is a dedicated, audited, rate-limited action
The system SHALL let a Contributor, Project Admin, or Workspace Owner reveal a specific credential's decrypted password through a dedicated action, SHALL record that reveal in the project's activity log in the same transaction as the decryption, SHALL limit how often one user may reveal passwords in a short period, and SHALL mark the response as not to be cached.

#### Scenario: An authorized reveal is logged and returns the password
- **WHEN** a Contributor, Project Admin, or Workspace Owner reveals a credential's password
- **THEN** the decrypted password is returned, the response disables caching, and exactly one new activity-log entry records who revealed which credential, on which environment, and when

#### Scenario: A Viewer cannot reveal a password
- **WHEN** a project Viewer attempts to reveal a credential's password
- **THEN** the request is rejected and no password is returned

#### Scenario: Reveals are rate-limited per user
- **WHEN** one user exceeds the allowed number of reveal attempts within the limiter's time window
- **THEN** further reveal attempts from that user are rejected until the window passes, regardless of whether earlier attempts succeeded

#### Scenario: A rolled-back reveal leaves no audit entry
- **WHEN** a reveal's decryption fails or its transaction is otherwise rolled back
- **THEN** no activity-log entry is created for that attempt

### Requirement: Deleting an environment removes it and its credentials outright
The system SHALL permanently delete an environment and all of its credentials when a Project Admin or Workspace Owner deletes it; environments are not recoverable from Trash.

#### Scenario: Deleting an environment removes its credentials too
- **WHEN** a Project Admin or Workspace Owner deletes an environment that has one or more credentials
- **THEN** the environment and every one of its credentials are permanently removed, and the environment no longer appears in the project's environment list
