# Commercial Masters Specification

## Purpose

The maintained catalogues a campaign is registered against — holding group, agency, advertiser, DSP, channel, format, campaign type, sector and sales rep — so that every reference on a campaign is a validated value rather than something typed twice and spelled differently each time.

## Requirements

### Requirement: Every agency belongs to a holding group

The system SHALL require each agency to reference exactly one holding group, because the holding group is the key the rebate accumulates against.

#### Scenario: An agency without a group is rejected
- **WHEN** an agency is created without a holding group
- **THEN** the request is rejected with a validation error

#### Scenario: The campaign-to-group chain resolves
- **WHEN** a campaign's agency is read
- **THEN** its holding group is reachable in one step

### Requirement: The DSP catalogue is maintained data, not a fixed set

The system SHALL hold the DSP list as editable records rather than a fixed enumeration, because the historical corpus contains more platforms than the three currently connected.

#### Scenario: A new DSP is added without a code change
- **WHEN** an administrator adds a DSP to the catalogue
- **THEN** it becomes available for mapping campaign lines
- **AND** no deployment is required

#### Scenario: A retired DSP stops being offered
- **WHEN** a DSP is marked inactive
- **THEN** it is no longer offered for new campaign lines
- **AND** existing lines referencing it keep resolving

### Requirement: Channels are a closed, maintained catalogue

The system SHALL hold the channel catalogue covering `Directo`, `Deal`, `DOOH` and `CTV`, and SHALL treat the channel as the rebate accumulation key.

#### Scenario: CTV is available from the start
- **WHEN** the channel catalogue is read
- **THEN** `CTV` is present and selectable, even though no historical campaign uses it
- **AND** no historical campaign is retroactively reclassified into it

### Requirement: Master names are unique and normalised on import

The system SHALL enforce uniqueness on master names, and SHALL reject an import that would create two records differing only by accent, case or separator.

#### Scenario: A near-duplicate import is rejected
- **WHEN** an import would create a holding group differing from an existing one only by accent or separator
- **THEN** the import reports it as a collision requiring reconciliation
- **AND** neither record is silently merged nor duplicated

#### Scenario: Unresolved values block the historical load
- **WHEN** the historical corpus is imported and contains agency values absent from the master
- **THEN** those values are reported for reconciliation before the load proceeds
- **AND** no agency is inferred from a similar name
