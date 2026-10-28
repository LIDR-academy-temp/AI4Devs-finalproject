# Spec Delta

## Purpose

Pushes small change notifications from the server to open browser tabs over a server-sent event stream, so screens refresh when a colleague changes something instead of polling. Events are hints that carry identifiers only. The normal API stays the source of truth.

## ADDED Requirements

### Requirement: A project member can open the project's event stream
The system SHALL serve a server-sent event stream per project at `GET /projects/:projectId/events`. Opening it SHALL require the same bearer authentication as other API routes and at least the Viewer role on that project. When access is refused, it SHALL answer exactly as other project routes do, without sending any events.

#### Scenario: A Viewer opens the stream
- **WHEN** a Viewer of a project requests its event stream with a valid bearer token
- **THEN** the response is `200` with content type `text/event-stream` and stays open

#### Scenario: No token
- **WHEN** the event stream is requested without a valid bearer token
- **THEN** the response is `401` and no stream is opened

#### Scenario: Not a member of the project
- **WHEN** a signed-in user who has no access to a project requests its event stream
- **THEN** the response is the same `403` other project routes give, and no stream is opened

### Requirement: Execution changes emit an event only when they commit
The system SHALL emit an `execution.changed` event carrying the execution's id whenever an execution is created, edited or deleted, its runs are reordered, it changes lifecycle status, or a run's outcome is recorded. It SHALL emit the event only after the change commits. A refused or rolled-back change SHALL emit nothing.

#### Scenario: A colleague records an outcome
- **WHEN** a Contributor records an outcome on a run while another member has the project's stream open
- **THEN** that stream receives an `execution.changed` event with the execution's id

#### Scenario: A refused transition emits nothing
- **WHEN** a lifecycle action is refused with `409` because the execution is in the wrong status
- **THEN** no event is sent on any stream

### Requirement: Changes to a run's linked bugs emit an event
The system SHALL emit a `run.bugs.changed` event carrying the execution id and run id when a run's set of linked bugs changes or a linked bug is edited or deleted. This covers a bug filed from a run, a bug auto-created on Fail, and an existing bug linked to a run. It SHALL emit the event only after the change commits.

#### Scenario: A bug is auto-created on Fail
- **WHEN** a Contributor sets a run to Fail on an execution with auto-create bug on
- **THEN** open streams on the project receive `execution.changed` for the execution and `run.bugs.changed` for that run

#### Scenario: An unlinked bug is edited
- **WHEN** a Contributor edits a bug that is not linked to any run
- **THEN** no `run.bugs.changed` event is sent

### Requirement: Events carry identifiers only and reach only their project
Each event SHALL contain only its type and identifiers: project, execution and, where relevant, run. It SHALL NOT contain names, outcomes, statuses or any other content. An event SHALL be delivered only to streams open on the project it belongs to, never to another project or workspace.

#### Scenario: Another workspace's stream
- **WHEN** an execution changes in workspace A's project
- **THEN** a stream open on workspace B's project receives nothing

#### Scenario: Another project in the same workspace
- **WHEN** an execution changes in project P1
- **THEN** a stream open on project P2 of the same workspace receives nothing

### Requirement: Open streams send heartbeats and are periodically re-authorized
An open stream SHALL send a heartbeat at least every 30 seconds while it has no events to send. The server SHALL close every stream within 5 minutes of opening it, so clients reconnect and their access is checked again.

#### Scenario: Idle stream
- **WHEN** a stream is open and no changes happen for 30 seconds
- **THEN** the client has received at least one heartbeat

#### Scenario: Access removed while connected
- **WHEN** a user's access to the project is removed while their stream is open
- **THEN** their stream closes within 5 minutes and reopening it is refused

### Requirement: The web client keeps one stream per tab and repairs missed events
The web app SHALL keep at most one event stream per browser tab, for the active project, and SHALL reopen it on the new project when the active project changes. When the stream drops, it SHALL reconnect with increasing delays. After every reconnect, it SHALL refetch the project's execution data so events missed while disconnected are repaired.

#### Scenario: The connection drops and returns
- **WHEN** the stream drops, an execution changes, and the stream then reconnects
- **THEN** the open Executions screen shows the change without a page reload

#### Scenario: Switching project
- **WHEN** the user switches from project P1 to project P2
- **THEN** the tab's stream on P1 closes and one stream on P2 opens
