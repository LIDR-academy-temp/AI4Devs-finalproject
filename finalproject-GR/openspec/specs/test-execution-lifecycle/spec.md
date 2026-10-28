# test-execution-lifecycle Specification

## Purpose

Defines how an execution moves from Draft through Ready, In Progress, Paused, and Completed to Done, how its runs record their test case at start and receive outcomes, and how elapsed time is measured.

## Requirements

### Requirement: Lifecycle transitions follow a fixed state machine
The system SHALL allow only these transitions: `Draft → Ready` (Mark as Ready), `Ready → Draft` (Back to Draft), `Ready → InProgress` (Run All), `InProgress → Paused` (Pause), `Paused → InProgress` (Resume), `InProgress → Completed` (automatic), and `Completed → Done` (Sign Off). Any other requested transition SHALL be refused with HTTP 409 and change nothing.

#### Scenario: Valid transition
- **WHEN** a Contributor marks a Draft execution as Ready
- **THEN** the execution's status becomes `Ready`

#### Scenario: Invalid transition is refused
- **WHEN** a Contributor requests Pause on a `Ready` execution
- **THEN** the request is rejected with HTTP 409 and the status stays `Ready`

#### Scenario: Concurrent conflicting transitions
- **WHEN** two callers each request Run All on the same `Ready` execution at the same time
- **THEN** exactly one succeeds and the other is rejected with HTTP 409

### Requirement: Contributors and above drive the lifecycle; Viewers cannot
The system SHALL allow Mark as Ready, Back to Draft, Run All, Pause, and Resume to callers with at least `Contributor` access. Callers with only `Viewer` access SHALL be denied with HTTP 403.

#### Scenario: A Viewer cannot start an execution
- **WHEN** a Viewer requests Run All on a `Ready` execution
- **THEN** the request is denied with HTTP 403 and the status stays `Ready`

### Requirement: An execution can be readied only when all its test cases are Ready
The system SHALL refuse Mark as Ready with HTTP 409 when any of the execution's runs refers to a test case that has since been deleted or whose status is no longer `Ready`.

#### Scenario: A test case was deleted while the execution was Draft
- **WHEN** a Contributor marks a Draft execution as Ready after one of its test cases was deleted
- **THEN** the request is rejected with HTTP 409 and the status stays `Draft`

#### Scenario: A test case left Ready while the execution was Draft
- **WHEN** a Contributor marks a Draft execution as Ready after one of its test cases was changed to `Deprecated` or `Draft`
- **THEN** the request is rejected with HTTP 409 and the status stays `Draft`

### Requirement: Run All starts a non-empty execution in Manual mode only
The system SHALL accept Run All with mode `Manual`. Mode `Automated` SHALL be rejected with HTTP 422 as currently unavailable. Run All on an execution with no runs SHALL be rejected with HTTP 409.

#### Scenario: Starting manually
- **WHEN** a Contributor requests Run All in `Manual` mode on a `Ready` execution with runs
- **THEN** the execution's status becomes `InProgress` and its elapsed timer starts

#### Scenario: Automated mode is unavailable
- **WHEN** a Contributor requests Run All in `Automated` mode
- **THEN** the request is rejected with HTTP 422 and the status stays `Ready`

#### Scenario: An empty execution cannot start
- **WHEN** a Contributor requests Run All on a `Ready` execution with no runs
- **THEN** the request is rejected with HTTP 409

### Requirement: Starting an execution snapshots each run's test case
When an execution starts, the system SHALL record on each run the name and Gherkin script of its test case as they are at that moment. From then on, the run SHALL report the recorded values regardless of later edits to or deletion of the test case.

#### Scenario: Later edits do not change run history
- **WHEN** an execution starts, and afterwards its test case's name and script are edited
- **THEN** the run still reports the name and script recorded at start

#### Scenario: Later deletion does not change run history
- **WHEN** a test case of a Completed execution is deleted
- **THEN** that execution's run still reports the recorded name and script

### Requirement: Elapsed time counts only while In Progress
The system SHALL report, for each execution, the elapsed milliseconds accumulated across completed In Progress periods and, while `InProgress`, the timestamp the current period began, so that elapsed time excludes time spent `Paused` and stops once the execution leaves `InProgress`.

#### Scenario: Pausing stops the clock
- **WHEN** an execution runs for some time and is then paused
- **THEN** it reports the accumulated elapsed time and no current-period start, and the reported elapsed time does not grow while Paused

#### Scenario: Resuming restarts the clock
- **WHEN** a Paused execution is resumed
- **THEN** it reports the previously accumulated elapsed time unchanged plus a new current-period start

### Requirement: Contributors and above record manual run outcomes
The system SHALL allow a caller with at least `Contributor` access to set a run's outcome to `Pass`, `Fail`, or `Needs Review` while its execution is `InProgress` or `Completed`. Setting an outcome in any other execution status SHALL be refused with HTTP 409; any other outcome value SHALL be rejected with HTTP 400.

#### Scenario: Recording a Pass
- **WHEN** a Contributor sets a run of an `InProgress` execution to `Pass`
- **THEN** the run's outcome is `Pass`

#### Scenario: Outcomes cannot be recorded while Paused
- **WHEN** a Contributor sets a run's outcome on a `Paused` execution
- **THEN** the request is rejected with HTTP 409

#### Scenario: A run cannot be reset to Pending
- **WHEN** a Contributor sets a run's outcome to `Pending`
- **THEN** the request is rejected with HTTP 400

#### Scenario: A Viewer cannot record outcomes
- **WHEN** a Viewer sets a run's outcome
- **THEN** the request is denied with HTTP 403

### Requirement: An execution completes when every run has an outcome
The system SHALL move an `InProgress` execution to `Completed`, in the same operation, when the last `Pending` run receives an outcome, and stop its elapsed timer.

#### Scenario: Last outcome completes the execution
- **WHEN** a Contributor records an outcome on the only remaining `Pending` run of an `InProgress` execution
- **THEN** the execution's status is `Completed` and its elapsed time no longer grows

#### Scenario: Needs Review counts as an outcome
- **WHEN** the last `Pending` run is set to `Needs Review`
- **THEN** the execution's status is `Completed`

### Requirement: Only an Admin can sign off, and only without Needs Review runs
The system SHALL allow a caller with at least `Admin` access to sign off a `Completed` execution, moving it to `Done` and recording who signed off and when. Sign off SHALL be refused with HTTP 409 while any run is `Needs Review`, and denied with HTTP 403 for Contributors and Viewers.

#### Scenario: Signing off
- **WHEN** an Admin signs off a `Completed` execution whose runs are all `Pass` or `Fail`
- **THEN** the execution's status is `Done` and it reports the signing Admin and time

#### Scenario: Needs Review blocks sign-off
- **WHEN** an Admin signs off a `Completed` execution with one `Needs Review` run
- **THEN** the request is rejected with HTTP 409 and the status stays `Completed`

#### Scenario: Resolving Needs Review unblocks sign-off
- **WHEN** a Contributor changes that run from `Needs Review` to `Fail`, and the Admin signs off again
- **THEN** the execution's status is `Done`

#### Scenario: A Contributor cannot sign off
- **WHEN** a Contributor signs off a `Completed` execution
- **THEN** the request is denied with HTTP 403

### Requirement: Lifecycle changes and outcomes are recorded in the activity log
The system SHALL write an activity entry, in the same transaction as the change, for every lifecycle transition (including the automatic completion) and every run outcome change.

#### Scenario: Run All is logged
- **WHEN** a Contributor starts an execution
- **THEN** an activity entry for that execution recording the transition and the acting user exists

#### Scenario: Automatic completion is logged
- **WHEN** an outcome causes an execution to complete
- **THEN** activity entries exist for both the outcome change and the completion
