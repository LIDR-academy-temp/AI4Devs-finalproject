# Spec Delta

## Purpose

An append-only, tamper-resistant record of actions taken in a project or workspace, readable long after the entities or users it describes are gone.

## ADDED Requirements

### Requirement: Entries are written in the same transaction as the change they record
The system SHALL write an activity entry in the same database transaction as the change it records, so the entry exists if and only if the change committed.

#### Scenario: Rolled-back transaction leaves no entry
- **WHEN** a transaction that calls the activity logger is rolled back
- **THEN** no activity entry from that call exists afterward

#### Scenario: Committed transaction leaves exactly one entry
- **WHEN** a transaction that calls the activity logger commits
- **THEN** exactly one corresponding activity entry exists

### Requirement: Entries are immutable once written
The system SHALL reject any attempt to modify or delete an activity entry, except through a reserved break-glass role.

#### Scenario: The application role cannot modify an entry
- **WHEN** the application's own database role attempts to update or delete an activity entry
- **THEN** the attempt fails

#### Scenario: The break-glass role is the sole exception
- **WHEN** the reserved break-glass role attempts to update an activity entry
- **THEN** the attempt is permitted, unlike every other role

### Requirement: Entries carry no foreign keys to what they describe
The system SHALL store a name snapshot on each activity entry and reference no entity or user table by foreign key, so later changes to — or deletion of — the thing an entry describes never alter or remove the entry.

#### Scenario: Deleting the described entity leaves its entry unchanged
- **WHEN** the entity an activity entry describes is later deleted
- **THEN** the activity entry still exists, unchanged, showing its original name snapshot

### Requirement: Entries are retrievable by keyset pagination, newest first
The system SHALL support fetching a workspace's (optionally project-scoped) activity entries ordered by creation time descending, using keyset pagination rather than offset pagination.

#### Scenario: Paging past a cursor returns only older entries
- **WHEN** a caller requests entries older than a given cursor for a workspace
- **THEN** only entries created before that cursor are returned, in descending order
