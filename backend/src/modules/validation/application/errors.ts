// Errors of the validation module (validation-runs design D9): each knows its status, code and details.
import { DomainError } from '../../../shared/errors.js'

// A guard of the import state machine (import-state.ts): it lives with the other import errors.
export { ImportNotAnalyzedError } from '../../imports/domain/errors.js'

/** Another writer confirmed on the import between the read and the write of this request. */
export class ImportChangedError extends DomainError {
  readonly status = 409
  readonly code = 'import_changed'

  constructor(status: string) {
    super('The import changed while validating; retry', { status })
  }
}

export class ValidationRunRequiredError extends DomainError {
  readonly status = 409
  readonly code = 'validation_run_required'

  constructor() {
    super('Run the validations before reviewing', {})
  }
}

export class ValidationRunSupersededError extends DomainError {
  readonly status = 409
  readonly code = 'validation_run_superseded'

  constructor(runId: number, currentRunId: number | null) {
    super('A newer validation run exists; review it before continuing', { runId, currentRunId })
  }
}

export class BlockingValidationIssueError extends DomainError {
  readonly status = 409
  readonly code = 'blocking_validation_issue'

  constructor(runId: number, validationCodes: string[], issueIds: number[]) {
    super('provider_mismatch: cancel the import and process it under the correct provider', {
      runId,
      validationCodes,
      issueIds,
    })
  }
}

/** Only occurrences of the current import change their inclusion (P2). */
export class OccurrenceNotEditableError extends DomainError {
  readonly status = 409
  readonly code = 'occurrence_not_editable'

  constructor(sourceType: string) {
    super('Only occurrences of the current import can be included or excluded', { sourceType })
  }
}

export type NotIncludableReason = 'reserve_already_included' | 'reserve_already_released'

/** A reserve is released only once (P3, rule of cycle R). */
export class OccurrenceNotIncludableError extends DomainError {
  readonly status = 409
  readonly code = 'occurrence_not_includable'

  constructor(reason: NotIncludableReason) {
    super(
      reason === 'reserve_already_included'
        ? 'A reserve is released only once: exclude the included occurrence first'
        : 'This reserve was already released in a previous batch',
      { reason },
    )
  }
}

export class IssueAlreadyResolvedError extends DomainError {
  readonly status = 409
  readonly code = 'issue_already_resolved'

  constructor(resolvedAt: string | null, resolvedBy: { userId: number; userName: string } | null) {
    super('The finding is already resolved', { resolvedAt, resolvedBy })
  }
}

export class IssueNotResolvableError extends DomainError {
  readonly status = 422
  readonly code = 'issue_not_resolvable'

  constructor(issueType: string) {
    super('Only non_recorded_adjustment and status_mismatch findings are resolved by hand', { issueType })
  }
}
