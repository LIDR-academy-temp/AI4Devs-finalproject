import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { RuleSetReadService } from './application/rule-set-read-service.js'
import { matchingRoutes } from './http/matching-routes.js'
import { PrismaRuleSetReadRepository } from './infrastructure/prisma-rule-set-read-repository.js'

export interface MatchingModuleOptions {
  /** Where the matching routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected rule set reads (tests); otherwise built on the Prisma repository. */
  ruleSetService?: RuleSetReadService
}

/** Composition root of the matching rule set routes (admin-accounts design D8; admin-matching extends it). */
export const matchingModule = fp(
  async (app: FastifyInstance, options: MatchingModuleOptions) => {
    const ruleSetService = options.ruleSetService ?? new RuleSetReadService(new PrismaRuleSetReadRepository(app.prisma))
    await app.register(matchingRoutes, { prefix: options.routePrefix, ruleSetService })
  },
  { name: 'matching-module', dependencies: ['prisma', 'auth'] },
)
