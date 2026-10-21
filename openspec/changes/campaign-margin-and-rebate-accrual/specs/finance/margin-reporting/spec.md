## Purpose

How the calculated figures reach Finance: aggregated along the dimensions the business uses, exportable, and labelled so that an accrual, an estimate and a settled result are never mistaken for one another.

## ADDED Requirements

### Requirement: Figures roll up along the business dimensions

The system SHALL aggregate margin and its component figures by period, agency, advertiser and campaign type.

#### Scenario: A period roll-up aggregates its campaigns
- **WHEN** a period roll-up is requested
- **THEN** revenue, media cost, rebate, platform cost and margin are aggregated across its campaigns

#### Scenario: Aggregation is consistent with the detail
- **WHEN** a roll-up and its underlying campaign figures are compared
- **THEN** the roll-up equals the sum of the detail

### Requirement: Roll-ups are exportable

The system SHALL export a roll-up to Excel or CSV.

#### Scenario: An export matches what is displayed
- **WHEN** a roll-up is exported
- **THEN** the exported figures match those displayed

### Requirement: Provisional figures are labelled as provisional

The system SHALL label a running-month accrual and any margin from a year that has not closed as provisional, distinctly from a closed figure.

#### Scenario: A running month is marked
- **WHEN** a current-month figure is displayed or exported
- **THEN** it carries a label identifying it as an accrual rather than a result

#### Scenario: Historical planned margin is distinguishable
- **WHEN** a figure derives from contracted volume with no actual delivery behind it
- **THEN** it is labelled as planned rather than actual

### Requirement: Divergence from the legacy application is classified

The system SHALL support comparing a recalculated closed month line by line against the legacy figures, and SHALL require every difference to be attributed either to a known defect or to an implementation error.

#### Scenario: Each difference is attributable
- **WHEN** a closed month is reconciled against the legacy application
- **THEN** every differing line is attributed to a named known defect or raised as an implementation error
- **AND** no difference is accepted as merely close enough

### Requirement: Reporting access is restricted to finance

The system SHALL restrict margin reporting and export to users holding the `finance` role.

#### Scenario: A user without the role is forbidden
- **WHEN** a user without `finance` requests a roll-up or an export
- **THEN** the request is rejected as forbidden
