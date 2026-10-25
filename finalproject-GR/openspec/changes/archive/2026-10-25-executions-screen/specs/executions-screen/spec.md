# Spec Delta

## Purpose

Gives project members a web screen to plan, run, and review test executions: the execution list, each execution's live detail, role-gated lifecycle actions, manual run outcomes, and the environment it runs against.

## ADDED Requirements

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
Contributors and Admins SHALL be able to create an execution, and edit a Draft one, in a form with: name (required), description, test cases (one or more, Ready test cases only), environment (optional), browser, viewport width and height, locale, timezone, and auto-create-bug-on-failure. The order test cases are picked in becomes the run order. A new execution opens selected, in Draft.

#### Scenario: Creating an execution
- **WHEN** a Contributor fills in a name, picks two Ready test cases, and saves
- **THEN** the new Draft execution is selected and shows the two runs in the order picked

#### Scenario: Only Ready test cases are offered
- **WHEN** the project has Ready, Draft and Deprecated test cases
- **THEN** only the Ready ones can be picked

#### Scenario: Name and at least one test case are required
- **WHEN** a Contributor saves without a name or without any test case
- **THEN** the form shows what is missing and nothing is saved

#### Scenario: Editing a Draft
- **WHEN** a Contributor edits a Draft execution's name and test case selection and saves
- **THEN** the detail shows the new name and the new runs

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
