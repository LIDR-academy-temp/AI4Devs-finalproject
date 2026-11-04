import {
  ErrorResponse,
  GlobalMatchingRules,
  GlobalMatchingRulesPut,
  IntId,
  MatchingRuleSetCreate,
  MatchingRuleSetDetail,
  MatchingRuleSetPut,
  MatchingRuleSetSummary,
} from '@recon/shared'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { NotImplementedError } from '../../../shared/errors.js'
import { ForbiddenError } from '../../auth/domain/errors.js'
import { scopeOf } from '../../catalog/domain/scope.js'
import type { RuleSetReadService } from '../application/rule-set-read-service.js'

const ProviderParams = z.object({ providerId: IntId })
const RuleSetParams = z.object({ ruleSetId: IntId })
const matching = { tags: ['matching'], security: [{ bearerAuth: [] }] }
/** 501 is temporary (admin-matching design D5): it leaves the contract when the handlers are wired. */
const pending = { 501: ErrorResponse }
const writeErrors = {
  400: ErrorResponse,
  401: ErrorResponse,
  403: ErrorResponse,
  404: ErrorResponse,
  409: ErrorResponse,
  ...pending,
}
const contentRules =
  'A transactions sheet carries a cycle; batch_fees and ignore carry neither cycle nor status; cycle R has no ' +
  'status; a fixed status is never Pending and has the natural cycle of the sheet; a regex must compile; patterns ' +
  'are not repeated in a list (ignoring case and surrounding spaces). Each violation is 400 validation_error with ' +
  'details.field (e.g. sheetRules[2].statusId).'

export interface MatchingRoutesOptions {
  ruleSetService: RuleSetReadService
}

/**
 * Matching rules (spec matching; admin-accounts design D8, admin-matching design D5). Mounted under /api/v1.
 * The writes answer 501 not_implemented until their use cases are wired (admin-matching groups 3 and 4).
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

  app.post(
    '/providers/:providerId/matching-rule-sets',
    {
      preHandler: app.requirePermission('account.manage'),
      schema: {
        ...matching,
        summary: 'Create a matching rule set of the provider',
        description:
          'The name is unique within the provider, ignoring case (409 rule_set_name_taken). The set starts without ' +
          `accounts; link them with PATCH /accounts/{id}. ${contentRules}`,
        params: ProviderParams,
        body: MatchingRuleSetCreate,
        response: { 201: MatchingRuleSetDetail, ...writeErrors },
      },
    },
    async () => {
      throw new NotImplementedError('POST /providers/{providerId}/matching-rule-sets')
    },
  )

  app.get(
    '/matching-rule-sets/:ruleSetId',
    {
      preHandler: app.authenticate,
      schema: {
        ...matching,
        summary: 'Detail of a matching rule set',
        description:
          'Sheet, column and row-ignore rules (the latter read-only, #120) in priority order and, at equal ' +
          'priority, in the order they were saved, which is the tie-break of the proposal. 404 for a set outside ' +
          'your scope.',
        params: RuleSetParams,
        response: {
          200: MatchingRuleSetDetail,
          400: ErrorResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          ...pending,
        },
      },
    },
    async () => {
      throw new NotImplementedError('GET /matching-rule-sets/{ruleSetId}')
    },
  )

  app.put(
    '/matching-rule-sets/:ruleSetId',
    {
      preHandler: app.requirePermission('account.manage'),
      schema: {
        ...matching,
        summary: 'Replace a matching rule set',
        description:
          'The whole document replaces every sheet and column rule of the set, in the order given (new rule ids). ' +
          'A body that changes nothing answers 200 without writing. A change applies from the next proposal and ' +
          'the next analysis; confirmed mappings and analysed rows do not change. Deactivating a set with linked ' +
          `accounts, open or closed, is 409 rule_set_in_use (details.accounts). ${contentRules}`,
        params: RuleSetParams,
        body: MatchingRuleSetPut,
        response: { 200: MatchingRuleSetDetail, ...writeErrors },
      },
    },
    async () => {
      throw new NotImplementedError('PUT /matching-rule-sets/{ruleSetId}')
    },
  )

  app.get(
    '/matching-rules/global',
    {
      preHandler: app.authenticate,
      schema: {
        ...matching,
        summary: 'Global matching rules, status aliases and the status catalog',
        description: 'Global rules are the defaults of every account; row-ignore rules are read-only (#120).',
        response: { 200: GlobalMatchingRules, 401: ErrorResponse, ...pending },
      },
    },
    async () => {
      throw new NotImplementedError('GET /matching-rules/global')
    },
  )

  app.put(
    '/matching-rules/global',
    {
      preHandler: app.requirePermission('account.manage'),
      schema: {
        ...matching,
        summary: 'Replace the global matching rules and status aliases',
        description:
          'Needs account.manage and merchant scope "all" (403 otherwise): the global rules apply to every merchant. ' +
          `A body that changes nothing answers 200 without writing. ${contentRules}`,
        body: GlobalMatchingRulesPut,
        response: { 200: GlobalMatchingRules, 400: ErrorResponse, 401: ErrorResponse, 403: ErrorResponse, ...pending },
      },
    },
    async (request) => {
      if (request.auth.merchantScope !== 'all') throw new ForbiddenError()
      throw new NotImplementedError('PUT /matching-rules/global')
    },
  )
}
