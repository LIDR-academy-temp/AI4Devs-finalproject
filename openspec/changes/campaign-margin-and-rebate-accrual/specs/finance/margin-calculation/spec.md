## Purpose

The per-line and per-campaign economics — what a campaign earned, what it cost and what it left — computed from explicit rules that can be read, tested and argued with, rather than reconstructed from chart expressions.

## ADDED Requirements

### Requirement: Revenue derives from contracted volume

The system SHALL compute revenue from the contracted impressions and sale CPM of the purchase order version in force, and SHALL NOT use delivered impressions in any revenue figure.

#### Scenario: Under-delivery does not reduce revenue
- **WHEN** a campaign line contracted for 726,202 impressions at 5.00 € delivers 700,000
- **THEN** revenue is computed on 726,202 impressions
- **AND** the delivered figure does not appear in the revenue calculation

#### Scenario: Revenue reads the version in force
- **WHEN** a purchase order has been revised
- **THEN** revenue is computed from the version in force
- **AND** not from any superseded version

### Requirement: The margin includes the platform cost

The system SHALL compute margin as revenue less media cost, less agency rebate, less platform cost, and SHALL express margin percentage as margin over revenue.

#### Scenario: All four terms are applied
- **WHEN** a closed period is calculated with revenue of 3,631.01 €, media cost of 1,200.00 €, a rebate of 907.75 € and a platform cost of 700.00 €
- **THEN** the margin is 823.26 €
- **AND** the margin percentage is that margin over revenue

#### Scenario: The rebate is a percentage of the sale price
- **WHEN** the agency rebate is computed
- **THEN** its base is revenue, not media cost and not delivered volume

#### Scenario: The platform cost is computed on delivered volume
- **WHEN** the platform cost is computed
- **THEN** its base is delivered impressions and the platform rate in force for that line

#### Scenario: Every platform type uses the same model
- **WHEN** a campaign line on the `Deal` channel is calculated
- **THEN** the same four terms apply as for any other channel
- **AND** no channel-specific revenue rule is applied

### Requirement: A running month is pro-rated and labelled as an accrual

The system SHALL pro-rate revenue for a period that has not ended by elapsed contract days over total period days, SHALL apply the same pro-rating to the rebate, and SHALL mark the result as provisional.

#### Scenario: An open period is pro-rated by elapsed days
- **WHEN** a period still running is calculated
- **THEN** revenue is the elapsed-day fraction of contracted volume times sale CPM
- **AND** the rebate is pro-rated on the same basis

#### Scenario: A campaign with no delivery still accrues revenue
- **WHEN** a period still running has received no delivery
- **THEN** revenue is still recognised on elapsed contract time
- **AND** the figure is marked provisional

#### Scenario: A closed period is not pro-rated
- **WHEN** a period that has ended is calculated
- **THEN** revenue is the full contracted volume times sale CPM

### Requirement: Monetary calculation keeps exact precision

The system SHALL perform every monetary and rate calculation in exact decimal arithmetic.

#### Scenario: A rate applied across a year does not drift
- **WHEN** rebate amounts are accumulated across a year of campaigns
- **THEN** the total equals the sum of the individual amounts exactly

### Requirement: A line sold below cost is flagged

The system SHALL flag a campaign line whose purchase cost exceeds its sale price rather than letting it average into a roll-up unremarked.

#### Scenario: A negative margin is surfaced
- **WHEN** a campaign line's media cost exceeds its revenue
- **THEN** the line is flagged in the reporting output
- **AND** it still contributes its true value to the roll-up

### Requirement: Margin access is restricted to finance

The system SHALL restrict every cost and margin figure to users holding the `finance` role, enforced at the endpoint.

#### Scenario: A user without the role is forbidden
- **WHEN** a user holding `business` or `operations` but not `finance` requests a margin resource
- **THEN** the request is rejected as forbidden

#### Scenario: The restriction holds against direct API access
- **WHEN** a margin endpoint is called directly rather than through the interface
- **THEN** the same restriction applies
