## Purpose

The infrastructure rate charged per thousand delivered impressions, held as configurable and audited data rather than a constant inside a chart expression, so that the second-largest cost line in the business can be seen and changed deliberately.

## ADDED Requirements

### Requirement: The platform rate is stored data with a system default

The system SHALL hold the platform rate as data, with a system-wide default that applies when nothing more specific is configured.

#### Scenario: The default applies with no override
- **WHEN** a campaign line has no rate configured at any level
- **THEN** the system default rate is used
- **AND** the value used is recorded on the line

### Requirement: The rate resolves most-specific-first

The system SHALL resolve the platform rate by taking the most specific configured level — campaign line, then agency or campaign type, then system default.

#### Scenario: A line override beats an agency override
- **WHEN** both an agency-level and a line-level rate are configured for a line
- **THEN** the line-level rate is used

#### Scenario: An agency override beats the system default
- **WHEN** an agency-level rate is configured and no line-level rate exists
- **THEN** the agency-level rate is used

### Requirement: Every override records who set it and when

The system SHALL stamp each platform rate override with its author and the time it was created, because the value moves the margin.

#### Scenario: An override is attributable
- **WHEN** a platform rate override is created
- **THEN** the author and creation time are stored with it

#### Scenario: Only finance may configure the rate
- **WHEN** a user without the `finance` role attempts to create or change an override
- **THEN** the request is rejected as forbidden

### Requirement: The rate used is frozen on the line

The system SHALL record the platform rate actually applied on the campaign line at calculation time, and SHALL NOT re-resolve it at read time.

#### Scenario: Changing the default does not move a calculated margin
- **WHEN** the system default rate is changed after a line has been calculated
- **THEN** that line's margin is unchanged until it is explicitly recalculated
