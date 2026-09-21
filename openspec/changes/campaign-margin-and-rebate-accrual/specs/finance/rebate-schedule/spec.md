## Purpose

The agency rebate as a bracket schedule with temporal validity, resolved by date through an explicit ladder, so that a rate can be traced to what was negotiated and when — instead of being averaged out of a spreadsheet whose key schema changes every year.

## ADDED Requirements

### Requirement: A schedule is a set of marginal brackets, not a single rate

The system SHALL express a rebate schedule as an ordered set of brackets, each with a lower threshold, an optional upper threshold and a rate, applied to the slice of volume falling within it.

#### Scenario: Brackets apply to the slice, not the total
- **WHEN** a counter standing at 90,000 € receives a campaign of 30,000 €, with brackets of 15% up to 100,000 € and 20% from 100,000 to 500,000 €
- **THEN** 10,000 € accrues at 15% and 20,000 € at 20%
- **AND** the campaign's effective rate is the blend of the two, not the higher rate applied to the whole

#### Scenario: A schedule with one open bracket behaves as a flat rate
- **WHEN** a schedule holds a single bracket covering all volume
- **THEN** every euro accrues at that bracket's rate

### Requirement: Schedules carry temporal validity

The system SHALL record a validity period on every schedule and SHALL resolve the rate for a campaign line from the schedule in force on the relevant date.

#### Scenario: A rate change applies from its validity date
- **WHEN** a group's schedule changes mid-year
- **THEN** the rate resolved for a line depends on which schedule was in force on its date
- **AND** no schedule is applied outside its validity period

#### Scenario: A year with no schedule inherits the previous one
- **WHEN** no schedule exists for the year of a campaign line
- **THEN** the most recent earlier schedule is used
- **AND** the result records that it was inherited

### Requirement: The rate is resolved by an ordered ladder

The system SHALL resolve a line's rebate rate by walking an ordered ladder from most specific to most general, SHALL stop at the first match, and SHALL record which step produced the rate.

#### Scenario: An agency exception wins over its group
- **WHEN** a line's agency has a schedule of its own for that channel
- **THEN** the agency's schedule is used
- **AND** the group's schedule is not consulted

#### Scenario: Scope narrows before it widens
- **WHEN** a schedule exists for the group and channel both with and without a scope
- **THEN** the one matching the line's scope is used in preference to the scopeless one

#### Scenario: A channel-less schedule applies to every channel
- **WHEN** only a group-level schedule with no channel exists
- **THEN** it applies to a line of any channel

#### Scenario: No schedule anywhere resolves to zero, explicitly
- **WHEN** no schedule is found at any step for a line's group
- **THEN** the rate is zero
- **AND** it is recorded as an explicit zero with its reason, distinguishable from a negotiated zero

#### Scenario: The resolution is traceable
- **WHEN** any rate is resolved
- **THEN** the step that produced it, the source year and whether it came from an agency exception are all recorded

### Requirement: The scope is a validated attribute, never averaged

The system SHALL resolve the rebate against the campaign line's validated scope, and SHALL NOT average the rates of two scopes together.

#### Scenario: Two scopes priced differently stay distinct
- **WHEN** a group is priced at one rate nationally and another internationally
- **THEN** a national line resolves to the national rate and an international line to the international rate
- **AND** neither receives the mean of the two
