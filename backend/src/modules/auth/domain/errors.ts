// Auth domain errors. Plain classes: the HTTP layer maps them to status codes.

export type InvalidCredentialsReason = 'bad_password' | 'inactive' | 'unknown_user'

/** Login rejected. `reason` is internal (audit only) and must never reach the client. */
export class InvalidCredentialsError extends Error {
  readonly code = 'invalid_credentials'

  constructor(readonly reason: InvalidCredentialsReason) {
    super('Invalid user name or password')
    this.name = 'InvalidCredentialsError'
  }
}

/** Refresh token unusable: bad signature, wrong type, expired, revoked, unknown or inactive user. */
export class InvalidTokenError extends Error {
  readonly code = 'invalid_token'

  constructor() {
    super('Invalid or expired token')
    this.name = 'InvalidTokenError'
  }
}

/** No valid access token on a protected route. */
export class UnauthorizedError extends Error {
  readonly code = 'unauthorized'

  constructor() {
    super('Authentication required')
    this.name = 'UnauthorizedError'
  }
}

/** Authenticated, but the role lacks the required permission. */
export class ForbiddenError extends Error {
  readonly code = 'forbidden'

  constructor() {
    super('Insufficient permissions')
    this.name = 'ForbiddenError'
  }
}
