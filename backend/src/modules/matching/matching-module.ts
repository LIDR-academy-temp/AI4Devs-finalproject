import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { matchingRoutes } from './http/matching-routes.js'

export interface MatchingModuleOptions {
  /** Where the matching routes are mounted, e.g. /api/v1. */
  routePrefix: string
}

/** Composition root of the matching rule set routes (admin-accounts design D8; admin-matching extends it). */
export const matchingModule = fp(
  async (app: FastifyInstance, options: MatchingModuleOptions) => {
    await app.register(matchingRoutes, { prefix: options.routePrefix })
  },
  { name: 'matching-module', dependencies: ['prisma', 'auth'] },
)
