## Purpose

The binding between a campaign line and the DSP that executes it, held as an explicit external identifier validated against the platform, replacing the parsed campaign-name string that the financial model depends on today.

## ADDED Requirements

### Requirement: A campaign line binds to the DSP by external identifier

The system SHALL bind a campaign line to its DSP through stored external campaign and line-item identifiers, and SHALL NOT derive that binding from the campaign name or any other free-text field.

#### Scenario: The mapping is stored as data
- **WHEN** a campaign line is mapped to a DSP
- **THEN** the external campaign identifier and line-item identifier are stored against that line

#### Scenario: Renaming a campaign does not break the binding
- **WHEN** a campaign's name is changed after its lines are mapped
- **THEN** every mapping remains intact and continues to resolve

### Requirement: The external identifier is validated against the DSP on save

The system SHALL validate the external identifier against the DSP's API at the moment the mapping is saved, and SHALL record the validation timestamp only when validation succeeds.

#### Scenario: A valid identifier is accepted and stamped
- **WHEN** a mapping is saved with an identifier the DSP recognises
- **THEN** the mapping is stored with its validation timestamp set

#### Scenario: An unknown identifier is rejected
- **WHEN** a mapping is saved with an identifier the DSP does not recognise
- **THEN** the request is rejected with a message naming the identifier
- **AND** no mapping is stored

#### Scenario: An unreachable DSP does not produce a false positive
- **WHEN** the DSP's API cannot be reached while saving a mapping
- **THEN** the mapping is not recorded as validated
- **AND** the failure is reported as such, distinct from an invalid identifier

### Requirement: An active line without a mapping is blocking

The system SHALL treat an active campaign line with no DSP mapping as a blocking status rather than a warning, and SHALL exclude it from delivery ingestion until mapped.

#### Scenario: An unmapped active line is surfaced as blocking
- **WHEN** an active campaign line has no DSP mapping
- **THEN** it is reported with a blocking status identifying what is missing
- **AND** it is not considered ready for ingestion

#### Scenario: Name similarity is a suggestion, never a binding
- **WHEN** the system offers candidate external identifiers during data entry
- **THEN** those candidates are presented as suggestions requiring confirmation
- **AND** no mapping is established without an explicit choice
