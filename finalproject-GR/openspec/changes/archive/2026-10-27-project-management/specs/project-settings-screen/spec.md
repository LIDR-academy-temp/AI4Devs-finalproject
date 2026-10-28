# Spec Delta

## Purpose

The Project Settings screen, where a Project Admin configures the active project; this change covers its General section (name and slug).

## ADDED Requirements

### Requirement: Project Settings is available to Project Admins
The web app SHALL offer a Project Settings screen for the active project, reachable from the navigation by users with Admin access to it. A user without Admin access who opens its address SHALL see an access-denied state instead of the settings.

#### Scenario: Admin opens Project Settings
- **WHEN** a Project Admin selects Project Settings in the navigation
- **THEN** the Project Settings screen for the active project is shown

#### Scenario: Contributor opens the address directly
- **WHEN** a Contributor opens the Project Settings address
- **THEN** an access-denied state is shown and no setting can be changed

### Requirement: The General section edits the project name and shows its slug
The General section SHALL show the project name in an editable field that saves when confirmed, with validation errors shown inline, and the slug as read-only text. A successful save SHALL update the name everywhere it is shown, including the project switcher.

#### Scenario: Renaming the project
- **WHEN** an Admin changes the name to "Checkout Web" and confirms
- **THEN** the name is saved and the project switcher shows "Checkout Web"

#### Scenario: Slug is read-only
- **WHEN** an Admin views the General section
- **THEN** the slug is shown and cannot be edited
