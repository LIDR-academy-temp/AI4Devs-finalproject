// Domain errors reused across modules. Plain classes: the error handler maps them to status codes.

/**
 * Base of every error a module raises on purpose: it already knows the HTTP status and the error
 * code (README §4: lowercase snake_case) and may carry `details` for the client. The error handler
 * maps any instance to `{ code, message, details? }` with that status, so new modules only add classes.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number
  abstract readonly code: string
  readonly details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.name = new.target.name
    if (details !== undefined) this.details = details
  }
}

/**
 * The resource does not exist or is outside the caller's merchant scope (README §4: 404, never 403).
 * The message names the resource type only, so both cases read exactly the same.
 */
export class NotFoundError extends DomainError {
  readonly status = 404
  readonly code = 'not_found'

  constructor(readonly entity: string) {
    super(`${entity} not found`)
  }
}
