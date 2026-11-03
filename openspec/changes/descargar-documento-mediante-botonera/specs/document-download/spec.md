# Spec Delta

## Purpose

Permitir que una persona autorizada descargue de forma segura el archivo del
documento seleccionado desde la botonera, manteniendo el contexto del listado.

## ADDED Requirements

### Requirement: Authorized document download

The system SHALL allow an authenticated and authorized user to download the
file associated with the selected document.

#### Scenario: Successful authorized download

- **WHEN** the user has selected a document, has the Descargar permission, and
  the associated file is available
- **THEN** the system downloads the authorized file with its coherent name,
  extension, MIME type, and content

#### Scenario: Download without a selection

- **WHEN** the user invokes Descargar without a selected document
- **THEN** the system does not request a file and informs the user that a
  document must be selected

### Requirement: Server-side authorization and validation

The system SHALL validate authentication, authorization, document identifier,
file availability, allowed type, and configured size limit on the server.

#### Scenario: Permission denied

- **WHEN** a user without Descargar permission requests a file, including by
  bypassing the UI
- **THEN** the server returns an authorization error and does not return file
  content

#### Scenario: Invalid or unavailable document

- **WHEN** the request contains an invalid identifier or references a missing
  document or unavailable file
- **THEN** the server returns a controlled client error and does not generate a
  false or empty download

#### Scenario: Unsupported or oversized file

- **WHEN** the associated file has an unsupported type or exceeds the
  configured size limit
- **THEN** the server rejects the response with a controlled error and does not
  deliver the file content

### Requirement: Safe file response

The system SHALL return a safe file response whose name, content type, and
security headers correspond to the authorized file without exposing sensitive
implementation details.

#### Scenario: Safe metadata and content

- **WHEN** an authorized file is returned
- **THEN** the response uses a sanitized file name, an allowed MIME type, and
  the configured content protection headers

#### Scenario: Controlled server failure

- **WHEN** the file source or an internal dependency fails
- **THEN** the system reports a generic error without exposing credentials,
  tokens, binary content, or technical diagnostics

### Requirement: Preserve list context after download

The system SHALL preserve the document list filter, order, page, selection, and
scroll context when a download is requested or completed.

#### Scenario: Context remains unchanged

- **WHEN** an authorized user downloads a file from a selected row
- **THEN** the list remains on the same filter, order, page, selection, and
  scroll context

### Requirement: Functional download verification

The system SHALL provide evidence for PF-04 covering successful, denied,
unselected, missing-file, invalid-identifier, and source-error cases.

#### Scenario: PF-04 evidence is recorded

- **WHEN** the download flow is tested with the PF-04 scenarios
- **THEN** each result is recorded as verified or explicitly blocked, and a
  local mock is not reported as institutional authorization evidence