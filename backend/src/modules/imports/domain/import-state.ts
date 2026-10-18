// The import state machine of this change (spec: import, D2): which statuses allow
// each action, and the 409 raised otherwise. Transitions themselves are applied by the repositories.
import type { ImportStatus } from '@recon/shared'
import { ImportNotCancellableError, ImportNotEditableError, ImportNotMappedError } from './errors.js'

/** Files and mapping can change only before the analysis (README HU1 CA2, CA8). */
export const EDITABLE_STATUSES: ReadonlySet<ImportStatus> = new Set(['uploaded', 'mapped'])

/** Cancelling keeps everything as evidence; only `processed` and `cancelled` refuse it (spec: import, D13). */
export const CANCELLABLE_STATUSES: ReadonlySet<ImportStatus> = new Set(['uploaded', 'mapped', 'analyzed', 'validated'])

/** `PUT /imports/{id}/mapping`: `uploaded` or `mapped`. */
export function assertCanConfirmMapping(status: ImportStatus): void {
  if (!EDITABLE_STATUSES.has(status)) throw new ImportNotEditableError(status)
}

/** `POST /imports/{id}/files` and `DELETE /imports/{id}/files/{fileId}`: `uploaded` or `mapped`. */
export function assertCanEditFiles(status: ImportStatus): void {
  if (!EDITABLE_STATUSES.has(status)) throw new ImportNotEditableError(status)
}

/** `POST /imports/{id}/analyze`: `mapped` only. */
export function assertCanAnalyze(status: ImportStatus): void {
  if (status !== 'mapped') throw new ImportNotMappedError(status)
}

/** `PATCH /imports/{id}/rows/{sheetId}/{rowNo}`: `analyzed` only (what `validated` means is for the validations change). */
export function assertCanResolveRow(status: ImportStatus): void {
  if (status !== 'analyzed') throw new ImportNotEditableError(status)
}

/** `POST /imports/{id}/cancel`: anything but `processed` and `cancelled`. */
export function assertCanCancel(status: ImportStatus): void {
  if (!CANCELLABLE_STATUSES.has(status)) throw new ImportNotCancellableError(status)
}
