# Spec Delta

## ADDED Requirements

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
