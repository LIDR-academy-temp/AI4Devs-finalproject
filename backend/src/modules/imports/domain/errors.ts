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

/** Files can only be added or removed while the import is `uploaded` or `mapped`. */
export class ImportNotEditableError extends DomainError {
  readonly status = 409
  readonly code = 'import_not_editable'

  constructor(status: string) {
    super(`Import in status ${status} cannot be modified`, { status })
  }
}
