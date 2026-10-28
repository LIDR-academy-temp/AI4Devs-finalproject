# Spec Delta

## MODIFIED Requirements

### Requirement: Contributors create and edit Draft executions in a form
Contributors and Admins SHALL be able to create an execution, and edit a Draft one, in a form with: name (required), description, test cases (one or more, Ready test cases only), environment (optional), browser, viewport width and height, locale, timezone, and auto-create-bug-on-failure. Test cases are picked from the project's folder tree, and the order of the Selected panel becomes the run order. A new execution opens selected, in Draft.

#### Scenario: Creating an execution
- **WHEN** a Contributor fills in a name, picks two Ready test cases, and saves
- **THEN** the new Draft execution is selected and shows the two runs in the order of the Selected panel

#### Scenario: Only Ready test cases are offered
- **WHEN** the project has Ready, Draft and Deprecated test cases
- **THEN** all of them appear in the picker's tree, and only the Ready ones can be picked

#### Scenario: Name and at least one test case are required
- **WHEN** a Contributor saves without a name or without any test case
- **THEN** the form shows what is missing and nothing is saved

#### Scenario: Editing a Draft
- **WHEN** a Contributor edits a Draft execution's name and test case selection and saves
- **THEN** the detail shows the new name and the new runs

#### Scenario: Editing only the details keeps the runs
- **WHEN** a Contributor edits a Draft execution's name without changing the selection or its order, and saves
- **THEN** the execution's runs keep their ids

#### Scenario: Viewers cannot create
- **WHEN** a Viewer opens the Executions screen
- **THEN** no way to create an execution is offered

## ADDED Requirements

### Requirement: The test case picker shows the folder tree
The form's picker SHALL show the project's folders and test cases as a tree, ordered as on the Test Cases screen (folders first). Folders can be expanded and collapsed. A name filter SHALL narrow the tree to matching test cases and the folders above them. Test cases that aren't Ready SHALL be shown with their status and SHALL NOT be pickable.

#### Scenario: Picking from a folder
- **WHEN** a Contributor expands folder "Checkout" in the picker and checks its Ready test case "Pay by card"
- **THEN** "Pay by card" appears in the Selected panel

#### Scenario: Filtering the picker
- **WHEN** a Contributor types "card" in the picker's filter
- **THEN** only test cases whose name contains "card" (case-insensitive) and the folders above them are shown

#### Scenario: A Draft test case cannot be picked
- **WHEN** the picker shows a test case in `Draft` status
- **THEN** it is labelled Draft and cannot be checked

### Requirement: Checking a folder picks its Ready test cases
Checking a folder in the picker SHALL add every Ready test case anywhere under it that isn't already selected to the end of the Selected panel, in tree order. Unchecking it SHALL remove all of them. A folder SHALL show as checked when all its Ready test cases are selected, as partly checked when some are, and SHALL NOT be checkable when it contains no Ready test case, saying so on its row. Clicking anywhere on a row's checkbox, icon, or name SHALL toggle it.

#### Scenario: Checking a folder
- **WHEN** a Contributor checks folder "Checkout", which holds Ready test cases A and B and a subfolder with Ready test case C, while A is already selected
- **THEN** the Selected panel lists A, then B and C appended in tree order, and "Checkout" shows as checked

#### Scenario: Partly selected folder
- **WHEN** only some of a folder's Ready test cases are selected
- **THEN** the folder shows as partly checked

#### Scenario: Clicking the name toggles
- **WHEN** a Contributor clicks a Ready test case's name or icon in the picker
- **THEN** it is checked and added to the Selected panel

#### Scenario: Unchecking a folder
- **WHEN** a Contributor unchecks a checked folder
- **THEN** every test case under it is removed from the Selected panel, and the others keep their order

#### Scenario: A folder with nothing Ready
- **WHEN** a folder contains no Ready test case
- **THEN** its checkbox cannot be checked, and the row says it has no Ready test cases

### Requirement: The Selected panel can be reordered and edited
The Selected panel SHALL list the picked test cases with their run positions. Each item SHALL be reorderable by drag and drop with a pointer, and with the keyboard. While dragging, items SHALL stay in place, with a line showing where the item will land. Each item SHALL have a remove control. The order shown when saving SHALL be the run order saved.

#### Scenario: Reordering by drag
- **WHEN** a Contributor drags the third selected test case above the first, then saves
- **THEN** the execution's runs are in the new order

#### Scenario: Reordering with the keyboard
- **WHEN** a Contributor focuses a selected item's drag handle and moves it down one place with the keyboard
- **THEN** the Selected panel shows it one position lower

#### Scenario: Removing a selected test case
- **WHEN** a Contributor removes a test case from the Selected panel
- **THEN** it is no longer selected and is unchecked in the tree

#### Scenario: Run opens the form with the test case selected
- **WHEN** a Contributor chooses Run on a Ready test case
- **THEN** the form opens with that test case in the Selected panel and checked in the tree

### Requirement: A Draft execution's runs can be reordered by drag and drop
For Contributors and Admins, the runs table of a Draft execution SHALL let each run be dragged to a new position with a pointer, or moved with the keyboard. A drop SHALL save the new order. Reordering SHALL NOT be offered to Viewers, outside Draft, or while a stats-bar outcome filter is active. If the server refuses a move, the table SHALL show the server's reason and keep the order it had.

#### Scenario: Dragging a run
- **WHEN** a Contributor drags the third run of a Draft execution to the top
- **THEN** the runs table shows that run at position 1 and the others shifted down, and the order is kept after a reload

#### Scenario: Not offered outside Draft
- **WHEN** a Contributor views an execution whose status is `Ready`
- **THEN** the runs table offers no way to reorder

#### Scenario: Not offered to Viewers
- **WHEN** a Viewer views a Draft execution
- **THEN** the runs table offers no way to reorder

#### Scenario: Not offered while filtered
- **WHEN** a Contributor selects the Pending stats cell on a Draft execution
- **THEN** the runs table offers no way to reorder until Total is selected again

#### Scenario: A refused move
- **WHEN** a Contributor drops a run but another user has meanwhile marked the execution Ready
- **THEN** the screen shows that only a Draft execution's runs can be reordered, and the table keeps the order it had
