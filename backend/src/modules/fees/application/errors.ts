// Errors of the fee administration (admin-fees design D9). The error handler maps every DomainError to its status.
import { DomainError } from '../../../shared/errors.js'

/**
 * Temporary answer of the administration routes while their use cases are built (design D11): the contract and the
 * OpenAPI document are published first. Removed when the last handler is wired (tasks 4.4).
 */
export class NotImplementedError extends DomainError {
  readonly status = 501
  readonly code = 'not_implemented'

  constructor(operation: string) {
    super(`${operation} is not implemented yet`)
  }
}
