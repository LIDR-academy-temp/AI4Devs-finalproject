import {
  AccountFee,
  ErrorResponse,
  FeeCreate,
  FeeHistoryEntry,
  FeeHistoryQuery,
  FeePage,
  FeePatch,
  FeesQuery,
  FeeUpdateResult,
} from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { NotImplementedError } from '../application/errors.js'

const AccountParams = z.object({ accountId: z.uuid() })
const FeeParams = z.object({ feeId: z.uuid() })
const fees = { tags: ['fees'], security: [{ bearerAuth: [] }] }
const errors = { 400: ErrorResponse, 401: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse }
// Until the use cases land (design D11, tasks 3.4 and 4.4).
const notImplemented = { 501: ErrorResponse }

/** Fee administration (README §4.1, §4.4; spec fees, admin-fees design D2). Mounted under /api/v1. */
export const feeAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/accounts/:accountId/fees',
    {
      preHandler: app.requirePermission('fee.manage'),
      schema: {
        ...fees,
        summary: 'Create a fee of the account',
        description:
          'Money and percentages as decimal strings; startDate/endDate null mean since forever / no end. ' +
          '400 validation_error (details.field: fixedAmount, endDate, feeTypeId), 409 fee_overlap (details.conflicts).',
        params: AccountParams,
        body: FeeCreate,
        response: { 201: AccountFee, ...errors, 409: ErrorResponse, ...notImplemented },
      },
    },
    async () => {
      throw new NotImplementedError('POST /accounts/{accountId}/fees')
    },
  )

  app.patch(
    '/fees/:feeId',
    {
      preHandler: app.requirePermission('fee.manage'),
      schema: {
        ...fees,
        summary: 'Correct a fee in place, close it, or change it from a date',
        description:
          'Without effectiveFrom: in-place correction (a fee in use takes only description and endDate). ' +
          'With effectiveFrom: closes the fee on effectiveFrom − 1 day and opens a successor with the new values. ' +
          '409 fee_in_use (details.fields or details.lastAppliedEventDate), 409 fee_overlap.',
        params: FeeParams,
        body: FeePatch,
        response: { 200: FeeUpdateResult, ...errors, 409: ErrorResponse, ...notImplemented },
      },
    },
    async () => {
      throw new NotImplementedError('PATCH /fees/{feeId}')
    },
  )

  app.get(
    '/fees',
    {
      preHandler: app.requirePermission('fee.view'),
      schema: {
        ...fees,
        summary: 'Fees of every account in scope, paginated, with filters',
        description:
          'Ordered by merchant, provider, account, fee type title, startDate (nulls first) and feeId. ' +
          'status is against today in New York. 404 for a merchantId, providerId or accountId outside the scope.',
        querystring: FeesQuery,
        response: { 200: FeePage, ...errors, ...notImplemented },
      },
    },
    async () => {
      throw new NotImplementedError('GET /fees')
    },
  )

  app.get(
    '/fees/:feeId/history',
    {
      preHandler: app.requirePermission('fee.view'),
      schema: {
        ...fees,
        summary: 'Change history of a fee, or of every fee of its type in its account',
        description: 'Newest first; before and after in API form (money as text, dates YYYY-MM-DD).',
        params: FeeParams,
        querystring: FeeHistoryQuery,
        response: { 200: z.array(FeeHistoryEntry), ...errors, ...notImplemented },
      },
    },
    async () => {
      throw new NotImplementedError('GET /fees/{feeId}/history')
    },
  )
}
