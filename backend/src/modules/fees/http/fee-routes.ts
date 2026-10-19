import { AccountFee, AccountFeesQuery, ErrorResponse, FeeTypeView } from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { FeeReadService } from '../application/fee-read-service.js'

export interface FeeRoutesOptions {
  service: FeeReadService
}

const AccountParams = z.object({ accountId: z.uuid() })
const fees = { tags: ['fees'], security: [{ bearerAuth: [] }] }

/** README §4.4, rows Fees (read side for Settlement Review, settlement-process D21). Mounted under /api/v1. */
export const feeRoutes: FastifyPluginAsyncZod<FeeRoutesOptions> = async (app, { service }) => {
  app.get(
    '/accounts/:accountId/fees',
    {
      preHandler: app.requirePermission('fee.view'),
      schema: {
        ...fees,
        summary: 'Fees of an account, optionally by kind and in force at a business date',
        description: 'transactional=false lists the batch presets; asOf is a business date (YYYY-MM-DD).',
        params: AccountParams,
        querystring: AccountFeesQuery,
        response: {
          200: z.array(AccountFee),
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request) => service.accountFees(scopeOf(request.auth), request.params.accountId, request.query),
  )

  app.get(
    '/fee-types',
    {
      preHandler: app.authenticate,
      schema: {
        ...fees,
        summary: 'Fee type catalog (transactional, free amount)',
        response: { 200: z.array(FeeTypeView), 401: ErrorResponse },
      },
    },
    async () => service.feeTypes(),
  )
}
