import type { ErrorResponse } from '@recon/shared'
import type { FastifyError, FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import {
  ForbiddenError,
  InvalidCredentialsError,
  InvalidTokenError,
  UnauthorizedError,
} from '../modules/auth/domain/errors.js'
import { DomainError } from '../shared/errors.js'

function toResponse(error: unknown): { status: number; body: ErrorResponse } {
  if (
    error instanceof InvalidCredentialsError ||
    error instanceof InvalidTokenError ||
    error instanceof UnauthorizedError
  ) {
    return { status: 401, body: { code: error.code, message: error.message } }
  }
  if (error instanceof ForbiddenError) {
    return { status: 403, body: { code: error.code, message: error.message } }
  }
  // Module errors (NotFoundError, the import module's 400/409/422…) carry their own status, code and details.
  if (error instanceof DomainError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    }
  }

  const fastifyError = error as Partial<FastifyError>
  if (fastifyError.validation) {
    return {
      status: 400,
      body: {
        code: 'validation_error',
        message: 'Request validation failed',
        details: fastifyError.validation.map((v) => ({
          path: v.instancePath,
          message: v.message,
          ...(v.params ? { params: v.params } : {}),
        })),
      },
    }
  }
  // Other client errors raised by Fastify itself (malformed JSON, unsupported media type, payload too large…).
  if (fastifyError.statusCode && fastifyError.statusCode >= 400 && fastifyError.statusCode < 500) {
    return { status: fastifyError.statusCode, body: { code: 'bad_request', message: fastifyError.message ?? '' } }
  }
  return { status: 500, body: { code: 'internal_error', message: 'Internal server error' } }
}

/** Uniform error body `{ code, message, details? }` for every route (README §4). */
export const errorHandlerPlugin = fp(
  async (app: FastifyInstance) => {
    app.setErrorHandler((error, request, reply) => {
      const { status, body } = toResponse(error)
      if (status >= 500) request.log.error({ err: error }, 'unhandled error')
      return reply.status(status).send(body)
    })

    app.setNotFoundHandler((request, reply) => {
      return reply.status(404).send({ code: 'not_found', message: `Route ${request.method} ${request.url} not found` })
    })
  },
  { name: 'error-handler' },
)
