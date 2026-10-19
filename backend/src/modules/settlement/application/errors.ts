// Errors of the settlement module (settlement-process design D18; README §4.3 in lowercase, messages in English).
// The validation ones (validation_run_required, validation_run_superseded, blocking_validation_issue) are reused.
import type { BatchFeeInvalidReason, ChannelToAssign } from '@recon/shared'
import { DomainError } from '../../../shared/errors.js'

// import_not_validated lives with the import state machine (imports/domain), which raises it in assertCanProcess.
export { ImportNotValidatedError } from '../../imports/domain/errors.js'
export {
  BlockingValidationIssueError,
  ValidationRunRequiredError,
  ValidationRunSupersededError,
} from '../../validation/application/errors.js'

/** An active (not undone) attempt of the account already holds the number. */
export class BatchNoTakenError extends DomainError {
  readonly status = 409
  readonly code = 'batch_no_taken'

  constructor(batchNo: number, attemptNo: number, importId: string) {
    super(`Batch ${batchNo} already has an active attempt for this account`, { batchNo, attemptNo, importId })
  }
}

/** The batch has channels not assigned yet or with another primary account, and the assignment was not confirmed. */
export class ChannelAssignmentNotConfirmedError extends DomainError {
  readonly status = 409
  readonly code = 'channel_assignment_not_confirmed'

  constructor(channels: ChannelToAssign[]) {
    super('The import includes channels not assigned to this account; confirm the assignment', { channels })
  }
}

/** The first batch fee of the request that fails, by its position. */
export class BatchFeeInvalidError extends DomainError {
  readonly status = 400
  readonly code = 'batch_fee_invalid'

  constructor(index: number, reason: BatchFeeInvalidReason) {
    super(`Batch fee ${index} is not valid: ${reason}`, { index, reason })
  }
}
