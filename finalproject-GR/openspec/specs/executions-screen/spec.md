# executions-screen Specification

## Purpose

Gives project members a web screen to plan, run, and review test executions: the execution list, each execution's live detail, role-gated lifecycle actions, manual run outcomes, and the environment it runs against.

## Requirements

### Requirement: The Executions screen lists the project's executions with their progress
The Executions screen SHALL list every non-deleted execution of the user's project, showing each execution's name, status, done and total run counts, Pass, Fail and Needs Review counts, and last-updated date.

#### Scenario: Listing executions
- **WHEN** a project member opens the Executions screen in a project with two executions
- **THEN** both are listed, each with its name, status, done/total counts, Pass/Fail/Needs Review counts, and last-updated date

#### Scenario: No executions yet
- **WHEN** a project member opens the Executions screen in a project with no executions
- **THEN** an empty state is shown, with a way to create one if the user is a Contributor or above

### Requirement: The execution list can be sorted and filtered
The Executions screen SHALL let the user sort the list by last updated, creation date, or status, ascending or descending, and filter it by name text, status, environment, and browser. The default is last updated, newest first.

#### Scenario: Sorting by creation date
- **WHEN** the user sorts by creation date ascending
- **THEN** the oldest execution is listed first

#### Scenario: Filtering by status and name
- **WHEN** the user filters by status `InProgress` and name text "smoke"
- **THEN** only In Progress executions whose name contains "smoke" (case-insensitive) are listed

### Requirement: Selecting an execution shows its detail
Selecting an execution SHALL show its name, description, status, run conditions (environment, browser, viewport, locale, timezone), a stats bar with Total, Pass, Needs Review, Fail and Pending counts, a progress bar proportioned by outcome, and its runs in position order with each run's test case name and outcome.

#### Scenario: Viewing an execution
- **WHEN** a project member selects an execution with three runs, one Pass and two Pending
- **THEN** the detail shows the run conditions, stats Total 3 / Pass 1 / Needs Review 0 / Fail 0 / Pending 2, and the three runs in position order

#### Scenario: A deleted test case is marked
- **WHEN** an execution has a run whose test case was deleted
- **THEN** that run is shown as referring to a deleted test case

### Requirement: The stats bar filters the runs table
Selecting a stats cell SHALL limit the runs table to runs with that outcome; selecting Total SHALL show all runs.

#### Scenario: Showing only failures
- **WHEN** the user selects the Fail cell
- **THEN** only Fail runs are listed, until the user selects Total

### Requirement: The elapsed timer is live and excludes paused time
The detail header SHALL show the execution's elapsed time, advancing every second while the execution is In Progress and frozen otherwise, computed from the accumulated elapsed time and the current period's start. It SHALL correct for the difference between the browser's clock and the server's.

#### Scenario: Running execution
- **WHEN** an In Progress execution with 60 seconds accumulated whose current period started 5 seconds ago (server time) is shown
- **THEN** the timer reads 1:05 and keeps advancing

#### Scenario: Paused execution
- **WHEN** a Paused execution with 90 seconds accumulated is shown
- **THEN** the timer reads 1:30 and does not advance

### Requirement: Lifecycle actions are offered by status and role
The detail view SHALL offer only the actions valid for the execution's status: Edit, Mark as Ready, and Delete for Draft; Back to Draft and Run All for Ready; Pause for In Progress; Resume for Paused; Sign Off for Completed. Edit, Mark as Ready, Back to Draft, Run All, Pause, and Resume SHALL be shown to Contributors and Admins; Delete and Sign Off only to Admins; none to Viewers.

#### Scenario: Contributor on a Ready execution
- **WHEN** a Contributor views a Ready execution
- **THEN** Back to Draft and Run All are offered, and Delete and Sign Off are not

#### Scenario: Viewer sees no actions
- **WHEN** a Viewer views an execution in any status
- **THEN** no lifecycle action is offered

#### Scenario: Admin on a Completed execution
- **WHEN** an Admin views a Completed execution
- **THEN** Sign Off is offered

### Requirement: Run All asks for the execution mode
Run All SHALL ask the user to confirm the mode. Manual SHALL start the execution; Automated SHALL be shown as currently unavailable and cannot be chosen.

#### Scenario: Starting manually
- **WHEN** a Contributor chooses Run All and confirms Manual
- **THEN** the execution becomes In Progress and its timer starts

### Requirement: Refused actions explain why
When the server refuses an action, the screen SHALL show the server's reason and leave the execution as it was.

#### Scenario: Sign Off with a Needs Review run
- **WHEN** an Admin signs off a Completed execution that still has a Needs Review run
- **THEN** the screen shows that Needs Review runs must be resolved first, and the execution stays Completed

### Requirement: Contributors record run outcomes from the run panel
Selecting a run SHALL open a panel showing its test case name and Gherkin script. The script is the one recorded at start once the execution has started. For Contributors and Admins, while the execution is In Progress or Completed, the panel SHALL offer setting the outcome to Pass, Fail, or Needs Review. Viewers and other statuses get no outcome control.

#### Scenario: Recording a failure
- **WHEN** a Contributor opens a Pending run of an In Progress execution and sets it to Fail
- **THEN** the run shows Fail, and the stats and progress bar update

#### Scenario: Last outcome completes the execution
- **WHEN** a Contributor records the outcome of the last Pending run
- **THEN** the execution is shown as Completed and its timer stops

#### Scenario: No outcome control while Paused
- **WHEN** a Contributor opens a run of a Paused execution
- **THEN** no outcome control is offered

### Requirement: Execution views stay current while work is under way
While the selected execution is In Progress or Paused, its detail SHALL refresh at least every 5 seconds without user action, and the list SHALL refresh while any listed execution is In Progress or Paused. Changes made by the user themselves SHALL appear immediately.

#### Scenario: A colleague records an outcome
- **WHEN** another tester records an outcome on the In Progress execution the user is viewing
- **THEN** the user's view shows that outcome within 5 seconds, without reloading the page

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

### Requirement: An Admin can delete a Draft execution after confirming
Deleting SHALL ask for confirmation, then remove the execution from the list and clear the selection.

#### Scenario: Deleting a Draft
- **WHEN** an Admin deletes a Draft execution and confirms
- **THEN** it disappears from the list and the detail panel is cleared

### Requirement: The environment panel lists credentials and allows audited reveal
Opening an execution's environment SHALL show the environment's name, base URL, and each credential's alias and email. Contributors and Admins SHALL be able to reveal a credential's password, which is shown until the panel closes. Viewers SHALL see aliases and emails but no reveal control. An execution whose environment was deleted SHALL show the environment's name as no longer available, with no panel.

#### Scenario: Revealing a password
- **WHEN** a Contributor opens the environment panel and reveals a credential
- **THEN** the password is shown next to that credential

#### Scenario: Viewer cannot reveal
- **WHEN** a Viewer opens the environment panel
- **THEN** aliases and emails are shown and no reveal control is offered

#### Scenario: Reveal rate limit reached
- **WHEN** a reveal is refused because the user has revealed too many passwords recently
- **THEN** the panel says to try again shortly

#### Scenario: Deleted environment
- **WHEN** an execution's environment has been deleted
- **THEN** the environment name is shown as no longer available and cannot be opened

### Requirement: A Ready test case can be run directly from the Test Cases screen
For Contributors and Admins, a Ready test case's detail SHALL offer Run, which opens the new-execution form with that test case already picked. Run SHALL not be offered for Draft or Deprecated test cases, or to Viewers.

#### Scenario: Running a test case
- **WHEN** a Contributor selects Run on a Ready test case and saves the form with a name
- **THEN** a Draft execution containing that test case is created, and the user is on the Executions screen with it selected

#### Scenario: Not offered for a Draft test case
- **WHEN** a Contributor views a Draft test case
- **THEN** Run is not offered

### Requirement: The run panel shows the bugs linked to that run
The run side panel SHALL list the bugs linked to the run, each with its title, status, and severity, and each navigating to that bug on the Bugs screen.

#### Scenario: A run with a bug
- **WHEN** a project member opens a run that has one linked bug
- **THEN** the panel lists that bug, and selecting it opens it on the Bugs screen

### Requirement: Contributors file a bug from a run, naming the failed step
Once the execution has started, the run panel SHALL offer Contributors and Admins **File bug**, which opens the new-bug form pre-filled with the run's test case name as title and showing the run's script, from which the reporter MAY pick the failed step. Saving files the bug against that run.

#### Scenario: Filing from a failing run
- **WHEN** a Contributor opens a Fail run, chooses File bug, picks the line "Then the total is $10" as the failed step, and saves
- **THEN** a bug linked to that run with that failed step is created and appears in the run panel's bug list

#### Scenario: Not offered before the execution starts
- **WHEN** a Contributor opens a run of a Draft execution
- **THEN** File bug is not offered

#### Scenario: Not offered to Viewers
- **WHEN** a Viewer opens a run of an In Progress execution
- **THEN** File bug is not offered

### Requirement: Contributors link an existing bug to a run
Once the execution has started, the run panel SHALL let Contributors and Admins link one of the project's bugs that has no run to this run.

#### Scenario: Linking an unlinked bug
- **WHEN** a Contributor chooses Link existing bug on a run and picks a manually filed bug
- **THEN** that bug appears in the run panel's bug list, linked to the run

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
