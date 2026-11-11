// Errors of the matching rule administration (admin-matching design D2–D5). The error handler maps every DomainError
// to its status and code.
import type { AccountRef } from '@recon/shared'
import { DomainError } from '../../../shared/errors.js'

/** A rule of the document breaks the content rules: 400 validation_error with the exact field (sheetRules[2].cycle). */
export class MatchingRuleError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'
  declare readonly details: { field: string }

  constructor(field: string, message: string) {
    super(message, { field })
  }
}

/** The name is already used by another set of the same provider, ignoring case. */
export class RuleSetNameTakenError extends DomainError {
  readonly status = 409
  readonly code = 'rule_set_name_taken'

  constructor() {
    super('A rule set with this name already exists in the provider')
  }
}

/** Deactivating a set that accounts still link to, open or closed. */
export class RuleSetInUseError extends DomainError {
  readonly status = 409
  readonly code = 'rule_set_in_use'
  declare readonly details: { accounts: AccountRef[] }

  constructor(accounts: AccountRef[]) {
    super('The rule set is linked to accounts; unlink them before deactivating it', { accounts })
  }
}
