// Errors of the fee rules (admin-fees design D9), raised by the pure functions of this folder. The error handler maps
// every DomainError to its status and code.
import type { FeeInUseDetails, FeeOverlapDetails } from '@recon/shared'
import { DomainError } from '../../../shared/errors.js'

/** A cross-field rule of a valid fee: 400 validation_error with the field the client should point at. */
export class FeeRuleError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'
  declare readonly details: { field: string }

  constructor(field: string, message: string) {
    super(message, { field })
  }
}

/** The fee is in use: the fields cannot change, or the closing would leave out events already applied. */
export class FeeInUseError extends DomainError {
  readonly status = 409
  readonly code = 'fee_in_use'
  declare readonly details: FeeInUseDetails

  constructor(details: FeeInUseDetails) {
    super(
      details.fields
        ? `A fee in use only takes description and endDate; change it from a date instead (${details.fields.join(', ')})`
        : `The fee was applied to events up to ${details.lastAppliedEventDate}; it cannot end before that day`,
      details,
    )
  }
}

/** Another fee of the same type in the account covers part of the validity. */
export class FeeOverlapError extends DomainError {
  readonly status = 409
  readonly code = 'fee_overlap'
  declare readonly details: FeeOverlapDetails

  constructor(conflicts: FeeOverlapDetails['conflicts']) {
    super('Another fee of this type is in force in that range', { conflicts })
  }
}
