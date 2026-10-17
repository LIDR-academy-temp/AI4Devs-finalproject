// Errors of the import module (design D10). Codes in lowercase snake_case (README §4).
import { DomainError } from '../../../shared/errors.js'

/** The part is not a `.xlsx` by name (README §4.2: 400, "tipo no permitido"). */
export class UnsupportedFileTypeError extends DomainError {
  readonly status = 400
  readonly code = 'unsupported_file_type'

  constructor(fileName: string) {
    super(`${fileName} is not a .xlsx file`, { fileName })
  }
}

/** A part exceeds the upload size, or the package exceeds a reading limit when inflated (design D3). */
export class FileTooLargeError extends DomainError {
  readonly status = 400
  readonly code = 'file_too_large'

  constructor(fileName: string, limit: string) {
    super(`${fileName} exceeds the limit: ${limit}`, { fileName, limit })
  }
}

/** More parts than the request accepts. */
export class TooManyFilesError extends DomainError {
  readonly status = 400
  readonly code = 'too_many_files'

  constructor(limit: number) {
    super(`At most ${limit} files per request`, { limit })
  }
}

/** The content is not a readable OOXML workbook (README §4.2: 422). */
export class FileUnreadableError extends DomainError {
  readonly status = 422
  readonly code = 'file_unreadable'

  constructor(fileName: string, reason: string) {
    super(`${fileName} is not a readable .xlsx: ${reason}`, { fileName })
  }
}

/** The same bytes are already in the import, or appear twice in the request (`fileId` null). */
export class DuplicateFileError extends DomainError {
  readonly status = 409
  readonly code = 'duplicate_file'

  constructor(fileName: string, fileId: string | null) {
    super(`${fileName} is already in this import`, { fileId, fileName })
  }
}

/** The request carried no `files` part (README §4.2: 400). */
export class NoFilesError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'

  constructor() {
    super('At least one file is required')
  }
}

/** The request body is not multipart/form-data. */
export class MultipartExpectedError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'

  constructor() {
    super('multipart/form-data body expected')
  }
}

/** The multipart body could not be parsed, e.g. it ends before the closing boundary. */
export class MalformedMultipartError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'

  constructor() {
    super('Malformed multipart/form-data body')
  }
}

/**
 * The analysis needs the import in `mapped` (spec: import, D2). Also raised when the
 * import changed between reading it and claiming it for the analysis (design D1): the client retries.
 */
export class ImportNotMappedError extends DomainError {
  readonly status = 409
  readonly code = 'import_not_mapped'

  constructor(status: string, changed = false) {
    super(
      changed
        ? `Import changed while the analysis was running; retry (status ${status})`
        : `Import must be in status mapped to analyze (status ${status})`,
      { status },
    )
  }
}

/**
 * Files and mapping can only change while the import is `uploaded` or `mapped`. Also raised when the import
 * changed between reading it and writing (spec: import, D2): the client reloads and retries.
 */
export class ImportNotEditableError extends DomainError {
  readonly status = 409
  readonly code = 'import_not_editable'

  constructor(status: string, changed = false) {
    super(
      changed
        ? `Import changed while the request was running; reload and retry (status ${status})`
        : `Import in status ${status} cannot be modified`,
      { status },
    )
  }
}

/** Cancelling is allowed in every status but `processed` and `cancelled` (spec: import, D13). */
export class ImportNotCancellableError extends DomainError {
  readonly status = 409
  readonly code = 'import_not_cancellable'

  constructor(status: string) {
    super(`Import in status ${status} cannot be cancelled`, { status })
  }
}

/** What a readiness item of the 422 names: the sheet and the field that is lacking. */
export interface MissingItem {
  sheetId: string | null
  sheetName: string | null
  field: string
  message: string
}

/** The confirmed mapping cannot be analyzed as it stands (README HU1 CA5; spec: import, D7). */
export class MappingIncompleteError extends DomainError {
  readonly status = 422
  readonly code = 'mapping_incomplete'

  constructor(missing: MissingItem[]) {
    super(`The mapping cannot be analyzed: ${missing.map((m) => m.message).join('; ')}`, { missing })
  }
}

/** The transaction sheets of the import exceed the rows the analysis accepts (spec: import, D1). */
export class ImportTooLargeError extends DomainError {
  readonly status = 422
  readonly code = 'import_too_large'

  constructor(rows: number, limit: number) {
    super(`The import has ${rows} transaction rows; the analysis accepts at most ${limit}`, { rows, limit })
  }
}

/** Only an ambiguous row can be resolved (spec: import, D12). */
export class RowNotAmbiguousError extends DomainError {
  readonly status = 409
  readonly code = 'row_not_ambiguous'

  constructor(matchResult: string) {
    super(`Only an ambiguous row can be resolved (row is ${matchResult})`, { matchResult })
  }
}

export interface MappingShapeDetails {
  sheetId: string | null
  sheetName?: string
  sourceColumn?: string
  targetField?: string
  field?: string
  statusId?: number
}

/** The body of the mapping confirmation does not fit the import (spec: import, D6). */
export class MappingShapeError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'

  constructor(message: string, details: MappingShapeDetails) {
    super(message, details)
  }
}

/** The chosen gateway is not one of the row's candidates. */
export class CandidateNotFoundError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'

  constructor(gatewayId: number, candidates: unknown[]) {
    super(`Gateway ${gatewayId} is not a candidate of this row`, { gatewayId, candidates })
  }
}
