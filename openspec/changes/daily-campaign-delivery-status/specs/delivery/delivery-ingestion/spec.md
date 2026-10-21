## Purpose

Bringing delivery figures from a DSP or an uploaded export into one delivery model, repeatably and without duplication, so that what a campaign actually served is a stored fact with a recorded provenance rather than the residue of a manual download.

## ADDED Requirements

### Requirement: Delivery is stored per campaign line and day

The system SHALL store delivery at the grain of one campaign line and one calendar day, holding impressions, clicks, media cost, measurable impressions and viewable impressions.

#### Scenario: A day of delivery is recorded against its line
- **WHEN** an ingestion run retrieves a day of delivery for a mapped campaign line
- **THEN** one delivery record exists for that line and date
- **AND** its media cost is stored as an exact decimal value

#### Scenario: Delivered volume never overwrites contracted volume
- **WHEN** delivery is ingested for a campaign line
- **THEN** the line's contracted impressions are unchanged
- **AND** the two quantities remain separately readable

### Requirement: Ingestion is idempotent over a rolling window

The system SHALL replace, not append, the delivery already held for the date range being ingested, so that re-running a range yields the same result as running it once.

#### Scenario: Re-running a range replaces it
- **WHEN** an ingestion run for a date range is executed a second time
- **THEN** the delivery held for that range reflects the second run only
- **AND** no duplicate record exists for any line and date in that range

#### Scenario: A restated figure supersedes the earlier one
- **WHEN** the DSP reports a different figure for a day already ingested and that day falls inside the reprocessing window
- **THEN** the stored figure is updated to the restated value

#### Scenario: Delivery outside the window is untouched
- **WHEN** an ingestion run covers a date range
- **THEN** delivery held for dates outside that range is left unchanged

### Requirement: Every ingestion run is recorded as a batch

The system SHALL record each ingestion run with its route, its source, its start and end times, its outcome and the number of rows processed, and SHALL associate every delivery record with the batch that produced it.

#### Scenario: A successful run is traceable to its source
- **WHEN** an ingestion run completes
- **THEN** a batch record exists naming the route, the DSP and the source
- **AND** every delivery record it produced references that batch

#### Scenario: A failed run is recorded, not silently dropped
- **WHEN** an ingestion run fails partway
- **THEN** a batch record exists with a failed outcome
- **AND** the run leaves no partially applied date range

### Requirement: Manual upload shares the ingestion contract

The system SHALL accept an uploaded delivery export through the same ingestion model as the API route, differing only in the recorded route and source.

#### Scenario: An uploaded file produces the same delivery model
- **WHEN** an operations user uploads a delivery export
- **THEN** the resulting delivery records are indistinguishable in shape from those ingested through the API
- **AND** the batch records the upload route and the source file name

#### Scenario: An uploaded file is validated before parsing
- **WHEN** a file is uploaded whose type or size is not accepted
- **THEN** it is rejected before any parsing occurs

#### Scenario: A malformed file fails with a precise message
- **WHEN** an uploaded file has an unexpected structure
- **THEN** the failure names the file, the sheet and the row
- **AND** no partial delivery is stored

### Requirement: The configured channel is authoritative over the DSP's

The system SHALL take the channel from the campaign line's configuration, SHALL store the DSP's reported line format only as contrast data, and SHALL flag a disagreement for review rather than reclassifying.

#### Scenario: A disagreement is flagged, never applied
- **WHEN** ingested delivery reports a line format that differs from the campaign line's configured channel
- **THEN** the line's channel is unchanged
- **AND** the reported value is stored as contrast data
- **AND** the row is flagged for review

### Requirement: Only mapped active lines are ingested

The system SHALL ingest delivery for active campaign lines carrying a validated DSP mapping, and SHALL NOT fail the run because other lines lack one.

#### Scenario: An unmapped line is skipped without failing the run
- **WHEN** an ingestion run encounters an active line with no DSP mapping
- **THEN** that line is skipped and reported
- **AND** the run completes for every mapped line
