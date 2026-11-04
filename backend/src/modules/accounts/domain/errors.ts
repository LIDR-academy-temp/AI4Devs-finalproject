// Errors of the account administration (admin-accounts design D3). The error handler maps every DomainError to its
// status and code.
import { DomainError } from '../../../shared/errors.js'

/** A rule of a valid account: 400 validation_error with the field the client should point at. */
export class AccountRuleError extends DomainError {
  readonly status = 400
  readonly code = 'validation_error'
  declare readonly details: { field: string }

  constructor(field: string, message: string) {
    super(message, { field })
  }
}

/** The name is already used by another account, of any provider and ignoring case (design D5). */
export class AccountNameTakenError extends DomainError {
  readonly status = 409
  readonly code = 'account_name_taken'

  constructor() {
    super('An account with this name already exists')
  }
}
