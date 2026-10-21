## Purpose

Making an unmatched key visible as work to be done, on whichever side of the join it appears, so that a campaign delivering under a different name and a campaign delivering nothing at all stop looking the same.

## ADDED Requirements

### Requirement: Unmatched delivery is recorded as an exception

The system SHALL record delivery that resolves to no campaign line as an exception carrying the external key that failed to match, and SHALL NOT discard it.

#### Scenario: Delivery with no campaign line is kept
- **WHEN** an ingestion run retrieves delivery whose external key matches no campaign line
- **THEN** an exception is recorded naming that external key and the batch
- **AND** the delivery figures are retained rather than dropped

#### Scenario: The run completes despite unmatched rows
- **WHEN** an ingestion run encounters unmatched delivery
- **THEN** the matched delivery is still stored
- **AND** the run's outcome reports how many rows went unmatched

### Requirement: A line with no delivery in a finished period is an exception

The system SHALL record an active campaign line that received no delivery across a period that has ended as an exception, so that absence is surfaced rather than inferred from an empty report.

#### Scenario: A finished period with no delivery is flagged
- **WHEN** a campaign period ends and one of its active lines has no delivery at all
- **THEN** an exception is recorded against that line

#### Scenario: A period still running is not flagged for absence
- **WHEN** a campaign period has not yet ended
- **THEN** no absence exception is raised for its lines

### Requirement: Exceptions are worked, not just listed

The system SHALL let an operations user resolve an exception, and SHALL keep an unresolved exception visible until it is.

#### Scenario: An exception can be resolved
- **WHEN** an operations user resolves an exception
- **THEN** it is marked resolved and leaves the outstanding queue
- **AND** the record remains readable

#### Scenario: Reading the queue requires the operations role
- **WHEN** a user without the `operations` role requests the exception queue
- **THEN** the request is rejected as forbidden
