# Spec Delta

## ADDED Requirements

### Requirement: A Contributor or above can move a run within a Draft execution
The system SHALL allow a caller with at least `Contributor` access to move one run of a `Draft` execution so it comes right after another run of the same execution, or first when no preceding run is given. Positions SHALL be renumbered 1..n with no gaps. Every run SHALL keep its id, test case, and outcome.

#### Scenario: Moving a run after another
- **WHEN** a Contributor moves run C of a Draft execution with runs A, B, C so it comes after A
- **THEN** the execution's runs are A, C, B at positions 1, 2, 3, with the same run ids as before

#### Scenario: Moving a run to the start
- **WHEN** a Contributor moves run C of a Draft execution with runs A, B, C with no preceding run
- **THEN** the execution's runs are C, A, B at positions 1, 2, 3

#### Scenario: A move that changes nothing
- **WHEN** a Contributor moves run B of runs A, B, C so it comes after A
- **THEN** the request succeeds and the order stays A, B, C

#### Scenario: The preceding run must be another run of the same execution
- **WHEN** a Contributor names, as the preceding run, the moved run itself, a run of another execution, or a nonexistent id
- **THEN** the request is rejected with HTTP 400 and the order is unchanged

#### Scenario: The moved run must belong to the execution
- **WHEN** a Contributor moves a run id that is not a run of the named execution
- **THEN** the request returns HTTP 404

#### Scenario: Moving outside Draft is refused
- **WHEN** a Contributor moves a run of an execution whose status is `Ready`
- **THEN** the request is rejected with HTTP 409 and the order is unchanged

#### Scenario: A Viewer cannot move runs
- **WHEN** a caller with only `Viewer` access moves a run
- **THEN** the request is denied with HTTP 403

#### Scenario: Moves are tenant-isolated
- **WHEN** a caller moves a run of an execution that belongs to another workspace's project through their own project's route
- **THEN** the request returns HTTP 404

### Requirement: Reordering a Draft execution's runs is recorded in the activity log
The system SHALL write an activity entry naming the execution and the acting user, in the same transaction, when a run move changes the order. A move that leaves the order as it was SHALL write no entry.

#### Scenario: A reorder is logged
- **WHEN** a Contributor moves a run to a new position
- **THEN** an activity entry for that execution's run reorder, naming the acting user, exists for the project

#### Scenario: A no-op move is not logged
- **WHEN** a Contributor moves a run to the position it already has
- **THEN** no new activity entry is written
