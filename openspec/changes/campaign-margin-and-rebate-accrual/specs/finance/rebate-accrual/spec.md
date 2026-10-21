## Purpose

The annual accumulation the brackets are measured against: which counter a campaign's revenue feeds, in what order the year's euros are consumed, and how much has been accrued as against actually settled with the agency.

## ADDED Requirements

### Requirement: Volume accumulates per counter and channel

The system SHALL accumulate annual volume against the holding group by default, per channel, and SHALL keep each channel's counter independent.

#### Scenario: Channels do not help each other reach a bracket
- **WHEN** an agency group spends in two channels
- **THEN** each channel has its own annual counter
- **AND** volume in one does not advance the bracket of the other

#### Scenario: One group can sit in several brackets at once
- **WHEN** a group's channels have accumulated different volumes
- **THEN** each channel resolves to its own bracket independently

### Requirement: An agency exception carries its own counter

The system SHALL accumulate an agency holding its own schedule against that agency rather than its group, for the channel the exception covers, and SHALL exclude that volume from the group's counter.

#### Scenario: The exception is carved out of the group
- **WHEN** an agency with its own schedule for a channel accrues revenue
- **THEN** the accrual is recorded against that agency
- **AND** the group's counter for that channel does not include it

#### Scenario: The carve-out is per channel
- **WHEN** an agency has an exception in one channel but not another
- **THEN** its volume in the excepted channel accrues to itself
- **AND** its volume in the other channel still accrues to its group

#### Scenario: Siblings cross brackets later
- **WHEN** an agency is carved out of its group's counter
- **THEN** the group's remaining agencies accumulate only their own volume
- **AND** their bracket position reflects the reduced total

### Requirement: Attribution is chronological and marginal

The system SHALL consume a year's volume in date order, charging each campaign at the bracket its own revenue falls into, and SHALL leave already-accrued months untouched when a later campaign crosses a threshold.

#### Scenario: A crossing is forward-only
- **WHEN** cumulative volume crosses a bracket threshold
- **THEN** campaigns from that point onward accrue at the higher marginal rate
- **AND** months already accrued keep the rate they were accrued at

#### Scenario: A campaign straddling a threshold blends
- **WHEN** a campaign's revenue spans a bracket boundary
- **THEN** each portion accrues at its own bracket's rate
- **AND** the campaign's effective rate is the blend

### Requirement: A schedule change restates the year to date

The system SHALL recompute the whole current year at the new schedule when a schedule or bracket changes, and SHALL make the restatement visible rather than silent.

#### Scenario: A mid-year renegotiation restates
- **WHEN** a schedule changes in May
- **THEN** everything accrued since January is recomputed at the new schedule
- **AND** the affected margins are recorded as restated

#### Scenario: A backdated correction replays the year
- **WHEN** a campaign is added, revised or removed with a date earlier than existing accruals
- **THEN** the affected counter's year is replayed from the start
- **AND** every later campaign's bracket position is recomputed

#### Scenario: Moving an agency between counters restates both sides
- **WHEN** an agency exception is created or removed
- **THEN** the year is replayed for both that agency and its group
- **AND** the restatement is visible

### Requirement: Accrued and settled are distinct quantities

The system SHALL hold what has been accrued separately from what has been settled with the agency, and SHALL report the difference.

#### Scenario: Both quantities are reported
- **WHEN** a counter's position is read for a year
- **THEN** the accrued amount, the settled amount and the difference are all available

#### Scenario: Accrual does not imply payment
- **WHEN** a campaign accrues rebate
- **THEN** the settled amount is unchanged

### Requirement: Campaign margin is provisional until the year closes

The system SHALL mark any margin outside a closed year as an estimate, because the rate applied depends on volume not yet delivered.

#### Scenario: An open year's margin is marked provisional
- **WHEN** a campaign margin is reported for a year that has not closed
- **THEN** it is presented as an estimate rather than a settled result
