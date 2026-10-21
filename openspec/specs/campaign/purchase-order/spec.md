# Purchase Order Specification

## Purpose

Purchase orders and their versions, so that the contracted volume and sale price a campaign is billed on are an auditable record with a history, rather than a field someone overwrites when the client revises the order.

## Requirements

### Requirement: A purchase order reference is unique

The system SHALL enforce uniqueness on the purchase order reference, and SHALL allow one purchase order to cover several campaigns.

#### Scenario: A duplicate reference is rejected
- **WHEN** a purchase order is created with a reference that already exists
- **THEN** the request is rejected as a conflict with the current state

#### Scenario: One order covers several campaigns
- **WHEN** a second campaign is registered against an existing purchase order reference
- **THEN** both campaigns link to the same purchase order

### Requirement: Registration creates version one in force

The system SHALL create a first version of the purchase order on registration, marked as the version in force.

#### Scenario: The first version is in force
- **WHEN** a purchase order is created during campaign registration
- **THEN** a version numbered 1 exists, marked in force
- **AND** the campaign's lines reference it

### Requirement: A revision creates a new version and never overwrites

The system SHALL record a purchase order revision as a new version carrying its own contracted volume, sale CPM, revision reason and issue date, and SHALL leave the superseded version readable.

#### Scenario: A revision supersedes rather than replaces
- **WHEN** a purchase order in force at version 1 is revised
- **THEN** a version 2 is created and marked in force
- **AND** version 1 remains readable with its original values
- **AND** exactly one version of that order is in force at any time

#### Scenario: A revision records why
- **WHEN** a revision is submitted without a reason
- **THEN** the request is rejected with a validation error

#### Scenario: Downstream calculation reads the version in force
- **WHEN** revenue, rebate base or bracket accumulation is computed for a campaign line
- **THEN** the contracted volume and sale CPM come from the purchase order version in force
- **AND** never from a superseded version
