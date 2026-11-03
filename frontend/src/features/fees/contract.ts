// The fee administration routes of admin-fees (its design D2), the only place of the fee screens that knows them.
// Types are aliases of the generated contract; the calls go through the typed `api` client. Money and rates are
// always strings; validity dates are YYYY-MM-DD days, shown as they arrive.
import { api, unwrap } from '@/lib/api/client'
import type { paths } from '@/lib/api/schema.gen'
import type { ApiResponse } from '@/lib/api/types'

type FeesPath = '/api/v1/fees'
type AccountFeesPath = '/api/v1/accounts/{accountId}/fees'
type FeePath = '/api/v1/fees/{feeId}'
type HistoryPath = '/api/v1/fees/{feeId}/history'
type JsonRequest<B> = B extends { content: { 'application/json': infer Body } } ? Body : never

export type FeesQuery = NonNullable<paths[FeesPath]['get']['parameters']['query']>
export type FeePage = ApiResponse<FeesPath, 'get'>
export type FeeListItem = FeePage['items'][number]
export type AccountFee = ApiResponse<AccountFeesPath, 'get'>[number]
export type FeeStatus = AccountFee['status']
export type FeeCreateBody = JsonRequest<paths[AccountFeesPath]['post']['requestBody']>
export type FeePatchBody = JsonRequest<paths[FeePath]['patch']['requestBody']>
export type FeeUpdateResult = ApiResponse<FeePath, 'patch'>
export type FeeHistoryEntry = ApiResponse<HistoryPath, 'get'>[number]
export type FeeHistoryScope = NonNullable<NonNullable<paths[HistoryPath]['get']['parameters']['query']>['scope']>

export const getFees = (query: FeesQuery, signal?: AbortSignal) =>
  unwrap(api.GET('/api/v1/fees', { params: { query }, signal }))

/** Every fee of the account: transactional and not, active, scheduled and closed. */
export const getAllAccountFees = (accountId: string) =>
  unwrap(api.GET('/api/v1/accounts/{accountId}/fees', { params: { path: { accountId } } }))

export const createFee = (accountId: string, body: FeeCreateBody) =>
  unwrap(api.POST('/api/v1/accounts/{accountId}/fees', { params: { path: { accountId } }, body }))

export const patchFee = (feeId: string, body: FeePatchBody) =>
  unwrap(api.PATCH('/api/v1/fees/{feeId}', { params: { path: { feeId } }, body }))

export const getFeeHistory = (feeId: string, scope: FeeHistoryScope) =>
  unwrap(api.GET('/api/v1/fees/{feeId}/history', { params: { path: { feeId }, query: { scope } } }))
