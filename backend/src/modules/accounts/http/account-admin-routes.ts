import { AccountCreate, AccountDetail, AccountPatch, ErrorResponse, IntId } from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { NotImplementedError } from '../../../shared/errors.js'

const ProviderParams = z.object({ providerId: IntId })
const AccountParams = z.object({ accountId: z.uuid() })
const accounts = { tags: ['accounts'], security: [{ bearerAuth: [] }] }
const errors = { 400: ErrorResponse, 401: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse, 409: ErrorResponse }
const notImplemented = { 501: ErrorResponse }

/** Account administration (README §4.4; spec accounts, admin-accounts design D2, D10). Mounted under /api/v1. */
export const accountAdminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/providers/:providerId/accounts',
    {
      preHandler: app.requirePermission('account.manage'),
      schema: {
        ...accounts,
        summary: 'Create an account of the provider',
        description:
          'The name is unique across all accounts, ignoring case. copyFeesFromAccountId copies the fees active ' +
          'today (New York) of another account of the provider, each with open validity (null…null). ' +
          '400 validation_error (details.field: rollingReserveCapAmt, matchingRuleSetId, copyFeesFromAccountId), ' +
          '409 account_name_taken.',
        params: ProviderParams,
        body: AccountCreate,
        response: { 201: AccountDetail, ...errors, ...notImplemented },
      },
    },
    async () => {
      throw new NotImplementedError('POST /providers/{providerId}/accounts')
    },
  )

  app.patch(
    '/accounts/:accountId',
    {
      preHandler: app.requirePermission('account.manage'),
      schema: {
        ...accounts,
        summary: 'Edit, close or reopen an account',
        description:
          'Any subset of name, chargebackReservePolicy, rollingReserveCapAmt, matchingRuleSetId and isActive ' +
          '(false closes, true reopens), with an optional reason. A rule set change applies from the next import. ' +
          'A body that changes nothing answers 200 without writing. ' +
          '400 validation_error (details.field: rollingReserveCapAmt, matchingRuleSetId), 409 account_name_taken.',
        params: AccountParams,
        body: AccountPatch,
        response: { 200: AccountDetail, ...errors, ...notImplemented },
      },
    },
    async () => {
      throw new NotImplementedError('PATCH /accounts/{accountId}')
    },
  )
}
