import { ErrorResponse, IntId, MatchingRuleSetSummary } from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { NotImplementedError } from '../../../shared/errors.js'

const ProviderParams = z.object({ providerId: IntId })
const matching = { tags: ['matching'], security: [{ bearerAuth: [] }] }

/**
 * Matching rule set reads (spec matching, admin-accounts design D8). Mounted under /api/v1. admin-matching adds the
 * rule set creation, detail and update here without redefining this read.
 */
export const matchingRoutes: FastifyPluginAsyncZod = async (app) => {
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
          501: ErrorResponse,
        },
      },
    },
    async () => {
      throw new NotImplementedError('GET /providers/{providerId}/matching-rule-sets')
    },
  )
}
