// The account administration routes of admin-accounts (its design D2), the only place of the account screens that
// knows them. Types are aliases of the generated contract; the calls go through the typed `api` client. The cap is
// always a decimal string.
import { api, unwrap } from '@/lib/api/client'
import type { paths } from '@/lib/api/schema.gen'
import type { ApiResponse } from '@/lib/api/types'

type CreatePath = '/api/v1/providers/{providerId}/accounts'
type AccountPath = '/api/v1/accounts/{accountId}'
type RuleSetsPath = '/api/v1/providers/{providerId}/matching-rule-sets'
type JsonRequest<B> = B extends { content: { 'application/json': infer Body } } ? Body : never

export type AccountCreateBody = JsonRequest<paths[CreatePath]['post']['requestBody']>
export type AccountPatchBody = JsonRequest<paths[AccountPath]['patch']['requestBody']>
export type AccountDetail = ApiResponse<AccountPath, 'get'>
export type ChargebackReservePolicy = AccountDetail['chargebackReservePolicy']
export type MatchingRuleSet = ApiResponse<RuleSetsPath, 'get'>[number]

export const createAccount = (providerId: number, body: AccountCreateBody) =>
  unwrap(
    api.POST('/api/v1/providers/{providerId}/accounts', {
      params: { path: { providerId: String(providerId) } },
      body,
    }),
  )

export const patchAccount = (accountId: string, body: AccountPatchBody) =>
  unwrap(api.PATCH('/api/v1/accounts/{accountId}', { params: { path: { accountId } }, body }))

export const getMatchingRuleSets = (providerId: number) =>
  unwrap(
    api.GET('/api/v1/providers/{providerId}/matching-rule-sets', {
      params: { path: { providerId: String(providerId) } },
    }),
  )
