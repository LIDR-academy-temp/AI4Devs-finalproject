## Purpose

Registering an advertising campaign from the purchase order the client sends, expanding it into the monthly periods the business reports on and the lines that carry contracted volume and sale price, against validated master references rather than free text.

## ADDED Requirements

### Requirement: Campaign registration requires the operations role

The system SHALL restrict campaign registration to users holding the `operations` role, enforced at the endpoint and never only in the interface.

#### Scenario: A user without the role is forbidden
- **WHEN** an authenticated user holding only `finance` submits a campaign registration
- **THEN** the request is rejected as forbidden
- **AND** no campaign, period or line is created

#### Scenario: An authenticated user unknown to the application is forbidden
- **WHEN** a request carries a valid token whose email has no matching user record
- **THEN** the request is rejected as forbidden
- **AND** no user record is created for that email

#### Scenario: A missing or invalid token is unauthenticated
- **WHEN** a request carries no token, or one that fails signature, expiry, issuer or audience validation
- **THEN** the request is rejected as unauthenticated, which is a distinct outcome from forbidden

### Requirement: A campaign expands into one period per calendar month

The system SHALL create one campaign period for each calendar month the campaign spans, with the first and last period clipped to the campaign's own start and end dates.

#### Scenario: A multi-month campaign expands
- **WHEN** a campaign is registered running from 2026-08-01 to 2026-12-31
- **THEN** five campaign periods are created, one per month from August to December
- **AND** each carries its own period start and end dates

#### Scenario: A campaign starting mid-month is clipped
- **WHEN** a campaign is registered running from 2026-08-15 to 2026-09-30
- **THEN** the August period starts on 2026-08-15, not on 2026-08-01
- **AND** the September period covers the whole month

#### Scenario: A campaign within a single month produces one period
- **WHEN** a campaign is registered running from 2026-08-05 to 2026-08-20
- **THEN** exactly one period is created, bounded by those two dates

### Requirement: Contracted volume and sale price live on the line

The system SHALL hold contracted impressions and sale CPM on the campaign line, and SHALL allow two lines of the same campaign to carry different values.

#### Scenario: Lines of one campaign carry different CPMs
- **WHEN** a campaign period is given one line at 5.00 € CPM and another at 25.00 € CPM
- **THEN** both are accepted and stored independently
- **AND** neither value is promoted to the campaign header

#### Scenario: Contracted volume is never conflated with delivered volume
- **WHEN** a campaign line is stored
- **THEN** its contracted impressions are held in a field distinct from any delivered figure
- **AND** no single combined impressions field exists

#### Scenario: Monetary values keep exact precision
- **WHEN** a sale CPM of 4.375 € is submitted
- **THEN** it is stored as an exact decimal value, not as binary floating point

### Requirement: Scope is validated and separate from the descriptive market

The system SHALL record a validated scope of `national` or `international` on every campaign line, and SHALL hold any descriptive market text in a separate field that does not participate in pricing.

#### Scenario: Descriptive market text is preserved separately
- **WHEN** a line is registered with scope `national` and market text `Nacional (Vigo)`
- **THEN** the scope is stored as `national`
- **AND** `Nacional (Vigo)` is preserved as descriptive text

#### Scenario: Scope cannot be omitted
- **WHEN** a line is submitted without a scope
- **THEN** the request is rejected with a validation error naming the field

#### Scenario: An unrecognised scope is rejected
- **WHEN** a line is submitted with a scope outside the accepted set
- **THEN** the request is rejected, and the value is not coerced into either bucket

### Requirement: Master references are validated, never created on the fly

The system SHALL reject a registration naming an agency, advertiser, DSP, channel, format, campaign type, sector or sales rep that does not exist in the corresponding master, and SHALL NOT create the missing record automatically.

#### Scenario: An unknown agency is rejected
- **WHEN** a registration names an agency absent from the agency master
- **THEN** the request is rejected with a message naming the unresolved value
- **AND** no agency record is created

#### Scenario: A known agency resolves to its holding group
- **WHEN** a registration names an agency present in the master
- **THEN** the campaign is linked to that agency
- **AND** the agency's holding group is reachable from it without further input

### Requirement: Purchase order and offer references are optional

The system SHALL allow a campaign to be registered without a purchase order reference, because most campaigns in the existing corpus carry none.

#### Scenario: A campaign without a purchase order is accepted
- **WHEN** a campaign is registered with no purchase order reference
- **THEN** the campaign is created with no purchase order linked
- **AND** its lines still carry their contracted volume and sale CPM

#### Scenario: A campaign with a purchase order links to its version in force
- **WHEN** a campaign is registered with a purchase order reference
- **THEN** each line is linked to the purchase order version in force
