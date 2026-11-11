import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { AuthService } from './application/auth-service.js'
import type { Clock } from './application/ports.js'
import { authPlugin } from './http/auth-plugin.js'
import { authRoutes } from './http/auth-routes.js'
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js'
import { JwtTokenSigner } from './infrastructure/jwt-token-signer.js'
import { PrismaAuditLogger } from './infrastructure/prisma-audit-logger.js'
import { PrismaRefreshTokenStore } from './infrastructure/prisma-refresh-token-store.js'
import { PrismaUserRepository } from './infrastructure/prisma-user-repository.js'

const systemClock: Clock = { now: () => new Date() }

export interface AuthModuleOptions {
  jwtSecret: string
  /** Where the auth routes are mounted, e.g. /api/v1/auth. */
  routePrefix: string
  /** Injected service (tests); otherwise wired to Prisma, Argon2 and @fastify/jwt. */
  service?: AuthService
}

/** Composition root of the auth module: adapters, route protection decorators and routes. */
export const authModule = fp(
  async (app: FastifyInstance, options: AuthModuleOptions) => {
    await app.register(fastifyJwt, { secret: options.jwtSecret })

    const service =
      options.service ??
      new AuthService({
        users: new PrismaUserRepository(app.prisma),
        refreshTokens: new PrismaRefreshTokenStore(app.prisma),
        audit: new PrismaAuditLogger(app.prisma),
        hasher: await Argon2PasswordHasher.create(),
        signer: new JwtTokenSigner(app.jwt, systemClock),
        clock: systemClock,
        log: app.log,
      })

    await app.register(authPlugin, { service })
    await app.register(authRoutes, { prefix: options.routePrefix, service })
  },
  { name: 'auth-module', dependencies: ['prisma'] },
)
