// Domain errors shared by every module. Plain classes: the error handler maps them to status codes.

/**
 * The resource does not exist or is outside the caller's merchant scope (README §4: 404, never 403).
 * The message names the resource type only, so both cases read exactly the same.
 */
export class NotFoundError extends Error {
  readonly code = 'not_found'

  constructor(readonly entity: string) {
    super(`${entity} not found`)
    this.name = 'NotFoundError'
  }
}
