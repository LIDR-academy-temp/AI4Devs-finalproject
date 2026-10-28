# Spec Delta

## ADDED Requirements

### Requirement: New Test Case opens as a modal
For Contributors and Admins, New test case (in the screen header or a folder's "New test case here") SHALL open the New Test Case modal (PRD §7.1) with a name, the destination folder picker, and an optional Gherkin script. The tree and detail pane SHALL stay as they were behind it. Saving SHALL close the modal and select the created test case, showing it in the detail pane.

#### Scenario: Creating from the header
- **WHEN** a Contributor with a test case selected chooses New test case, enters a name, and saves
- **THEN** the modal closes, the new test case appears in the tree and is selected, and the detail pane shows it

#### Scenario: Cancelling keeps the selection
- **WHEN** a Contributor with folder "Payments" selected opens New test case and cancels
- **THEN** the modal closes and "Payments" is still selected and shown

#### Scenario: From a folder's actions menu
- **WHEN** a Contributor chooses "New test case here" on folder "Cards"
- **THEN** the modal opens with "Cards" as the destination folder

#### Scenario: Name is required
- **WHEN** a Contributor saves the modal without a name
- **THEN** the modal shows that the name is required and nothing is saved
