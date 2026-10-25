# test-cases-screen Specification

## Purpose

Gives project members the web Test Cases screen as a folder tree: browsing, filtering, organizing by drag and drop or menus, and seeing each folder's and test case's place in the hierarchy.

## Requirements

### Requirement: The Test Cases screen shows an expandable folder tree
The left panel SHALL show the project's folders and test cases as a tree: folders before test cases within each folder, each in their stored order, root items at the top level. Folders SHALL expand and collapse, and the expanded set SHALL be remembered in the browser. Each test case SHALL show a colored dot for its last run outcome, or none if never run.

#### Scenario: Browsing the tree
- **WHEN** a member opens Test Cases in a project with folder "Checkout" (holding test case "Pay") and root test case "Login"
- **THEN** the tree shows "Checkout" above "Login", and expanding "Checkout" reveals "Pay"

#### Scenario: Expansion is remembered
- **WHEN** a member expands "Checkout" and reloads the page
- **THEN** "Checkout" is still expanded

#### Scenario: Outcome dot
- **WHEN** test case "Pay" last ran with outcome Fail
- **THEN** "Pay" shows the fail-colored dot, and a never-run test case shows none

### Requirement: The tree can be filtered by name and status
Filtering by name text and/or test case status SHALL show the matching test cases and folders whose names match, together with the folders above them, expanded so matches are visible.

#### Scenario: Filtering by name
- **WHEN** a member filters by "pay"
- **THEN** test case "Pay" is shown inside "Checkout" (expanded), and unrelated items are hidden

### Requirement: Contributors organize the tree by drag and drop
Contributors and Admins SHALL be able to drag a folder or test case to reorder it among its siblings, or drop it onto a folder to move it inside, using a mouse or the keyboard. Refused moves SHALL explain why and leave the tree unchanged. Viewers SHALL NOT be able to drag items.

#### Scenario: Moving a test case by drag and drop
- **WHEN** a Contributor drags test case "Pay" onto folder "Refunds"
- **THEN** "Pay" appears inside "Refunds"

#### Scenario: Moving with the keyboard
- **WHEN** a Contributor focuses "Pay", picks it up with the keyboard, moves it to a new position and drops it
- **THEN** "Pay" is moved there as with the mouse

#### Scenario: A too-deep move is explained
- **WHEN** a Contributor drops a folder where it would exceed four levels
- **THEN** the screen says why and the tree is unchanged

### Requirement: Every tree item has an actions menu
Every item SHALL offer an actions menu, opened by right-click or a visible button. For Contributors and Admins it SHALL offer: New folder here and New test case here (on folders and the root), Rename, Move to… (a folder picker), and Delete (Admin only). Viewers SHALL be offered no create, rename, move, or delete action.

#### Scenario: Move to… from the menu
- **WHEN** a Contributor chooses Move to… on "Pay" and picks "Refunds"
- **THEN** "Pay" appears inside "Refunds"

#### Scenario: Viewers cannot reorganize
- **WHEN** a Viewer opens an item's actions menu
- **THEN** no create, rename, move, or delete action is offered, and items cannot be dragged

### Requirement: Selecting a folder shows its summary
Selecting a folder SHALL show its breadcrumb path, its number of subfolders and test cases (direct and in total), and its actions. Deleting a folder SHALL ask for confirmation stating how many folders and test cases will be deleted.

#### Scenario: Folder summary
- **WHEN** a member selects "Checkout", holding subfolder "Payments" and 3 test cases in total (1 directly)
- **THEN** the summary shows the breadcrumb, 1 subfolder, 1 direct and 3 total test cases

#### Scenario: Confirming a folder delete
- **WHEN** an Admin deletes "Checkout"
- **THEN** the confirmation says 2 folders and 3 test cases will be deleted, and confirming removes them from the tree

### Requirement: Test case detail shows its place in the tree
Selecting a test case SHALL show its breadcrumb path through its folders above the existing detail.

#### Scenario: Breadcrumb
- **WHEN** a member selects test case "Pay" inside "Checkout / Payments"
- **THEN** the detail shows the breadcrumb "Checkout / Payments"

### Requirement: New test cases choose a destination folder
The new-test-case form SHALL let Contributors choose the destination folder from a tree picker (or the root), defaulting to the currently selected folder, or to the folder whose "New test case here" was chosen.

#### Scenario: Creating in the selected folder
- **WHEN** a Contributor has "Payments" selected and creates a test case without changing the destination
- **THEN** the new test case appears inside "Payments" and is selected
