import { ErrorResponse, IntId, MatchingRuleSetSummary } from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { RuleSetReadService } from '../application/rule-set-read-service.js'

const ProviderParams = z.object({ providerId: IntId })
const matching = { tags: ['matching'], security: [{ bearerAuth: [] }] }

export interface MatchingRoutesOptions {
  ruleSetService: RuleSetReadService
}

/**
 * Matching rule set reads (spec matching, admin-accounts design D8). Mounted under /api/v1. admin-matching adds the
 * rule set creation, detail and update here without redefining this read.
 */
export const matchingRoutes: FastifyPluginAsyncZod<MatchingRoutesOptions> = async (app, { ruleSetService }) => {
  app.get(
    '/providers/:providerId/matching-rule-sets',
    {
      preHandler: app.authenticate,
      schema: {
        ...matching,
        summary: 'Matching rule sets of a provider, with the accounts linked to each one',
        description: 'Active and inactive sets, by name; 404 for a provider outside your scope.',
        params: ProviderParams,
        response: {
          200: z.array(MatchingRuleSetSummary),
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request) => ruleSetService.listForProvider(scopeOf(request.auth), request.params.providerId),
  )
}
