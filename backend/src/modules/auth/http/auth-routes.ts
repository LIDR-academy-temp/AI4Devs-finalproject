import { ErrorResponse, LoginRequest, MeResponse, RefreshRequest, TokenPair } from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { AuthService } from '../application/auth-service.js'

export interface AuthRoutesOptions {
  service: AuthService
}

/** README §4.4, Auth rows. Mounted under /api/v1/auth. */
export const authRoutes: FastifyPluginAsyncZod<AuthRoutesOptions> = async (app, { service }) => {
  app.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Log in with user name and password',
        body: LoginRequest,
        response: { 200: TokenPair, 400: ErrorResponse, 401: ErrorResponse },
      },
    },
    async (request) => service.login({ ...request.body, ip: request.ip }),
  )

  app.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Rotate the token pair with a refresh token',
        body: RefreshRequest,
        response: { 200: TokenPair, 400: ErrorResponse, 401: ErrorResponse },
      },
    },
    async (request) => service.refresh(request.body.refreshToken),
  )

  app.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Revoke a refresh token (idempotent)',
        body: RefreshRequest,
        response: { 204: z.null(), 400: ErrorResponse },
      },
    },
    async (request, reply) => {
      await service.logout(request.body.refreshToken)
      return reply.status(204).send(null)
    },
  )

  app.get(
    '/me',
    {
      preHandler: app.authenticate,
      schema: {
        tags: ['auth'],
        summary: 'Identity, permissions and visible merchants of the caller',
        security: [{ bearerAuth: [] }],
        response: { 200: MeResponse, 401: ErrorResponse },
      },
    },
    async (request) => service.me(request.auth.userId),
  )
}
