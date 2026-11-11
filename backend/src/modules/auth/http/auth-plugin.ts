import type { PermissionCode } from '@recon/shared'
import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'
import fp from 'fastify-plugin'
import type { AuthService } from '../application/auth-service.js'
import { ForbiddenError, UnauthorizedError } from '../domain/errors.js'
import { type AuthContext, hasPermission } from '../domain/permissions.js'

declare module 'fastify' {
  interface FastifyInstance {
    /** preHandler: verifies the bearer access token and sets `request.auth`, or answers 401. */
    authenticate: preHandlerAsyncHookHandler
    /** preHandlers `[authenticate, check]`: 401 without valid authentication, 403 without the permission. */
    requirePermission(code: PermissionCode): preHandlerAsyncHookHandler[]
  }
  interface FastifyRequest {
    /** Set by `authenticate`; only read it on routes protected by it. */
    auth: AuthContext
  }
}

export interface AuthPluginOptions {
  service: AuthService
}

function bearerToken(request: FastifyRequest): string {
  const [scheme, token] = (request.headers.authorization ?? '').split(' ')
  if (scheme !== 'Bearer' || !token) throw new UnauthorizedError()
  return token
}

/** Route protection (design D8). Applied per route, so public routes need no exclusion list. */
export const authPlugin = fp(
  async (app: FastifyInstance, { service }: AuthPluginOptions) => {
    app.decorateRequest('auth', null as unknown as AuthContext)

    const authenticate: preHandlerAsyncHookHandler = async (request) => {
      request.auth = await service.authenticate(bearerToken(request))
    }

    app.decorate('authenticate', authenticate)
    app.decorate('requirePermission', (code: PermissionCode) => {
      const check: preHandlerAsyncHookHandler = async (request) => {
        if (!hasPermission(request.auth, code)) throw new ForbiddenError()
      }
      return [authenticate, check]
    })
  },
  { name: 'auth' },
)
