import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { GlobalRulesService } from './application/global-rules-service.js'
import { RuleSetAdminService } from './application/rule-set-admin-service.js'
import { RuleSetReadService } from './application/rule-set-read-service.js'
import { matchingRoutes } from './http/matching-routes.js'
import { PrismaGlobalRulesRepository } from './infrastructure/prisma-global-rules-repository.js'
import { PrismaMatchingRulesAdminRepository } from './infrastructure/prisma-matching-rules-admin-repository.js'
import { PrismaRuleSetReadRepository } from './infrastructure/prisma-rule-set-read-repository.js'

export interface MatchingModuleOptions {
  /** Where the matching routes are mounted, e.g. /api/v1. */
  routePrefix: string
  /** Injected rule set reads (tests); otherwise built on the Prisma repository. */
  ruleSetService?: RuleSetReadService
  /** Injected rule set writes (tests); otherwise built on the Prisma repository. */
  ruleSetAdminService?: RuleSetAdminService
  /** Injected global rules (tests); otherwise built on the Prisma repository. */
  globalRulesService?: GlobalRulesService
}

/** Composition root of the matching rule routes (admin-accounts design D8, admin-matching design D3–D5). */
export const matchingModule = fp(
  async (app: FastifyInstance, options: MatchingModuleOptions) => {
    const ruleSetService = options.ruleSetService ?? new RuleSetReadService(new PrismaRuleSetReadRepository(app.prisma))
    const ruleSetAdminService =
      options.ruleSetAdminService ??
      new RuleSetAdminService(new PrismaMatchingRulesAdminRepository(app.prisma, app.log))
    const globalRulesService =
      options.globalRulesService ?? new GlobalRulesService(new PrismaGlobalRulesRepository(app.prisma, app.log))
    await app.register(matchingRoutes, {
      prefix: options.routePrefix,
      ruleSetService,
      ruleSetAdminService,
      globalRulesService,
    })
  },
  { name: 'matching-module', dependencies: ['prisma', 'auth'] },
)
