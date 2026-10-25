# Spec Delta

## ADDED Requirements

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
