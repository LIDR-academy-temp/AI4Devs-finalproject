// Reads of the fee screens (web-admin-fees design D9). The fees of an account share the prefix of the key Settlement
// Review uses, so a write refreshes both.
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { type FeesQuery, getAllAccountFees, getFeeHistory, getFees } from './contract'

/** Prefix of every read of GET /fees and of the histories. */
export const FEES_KEY = ['fees'] as const

export const feesQuery = (query: FeesQuery, enabled = true) =>
  queryOptions({
    queryKey: [...FEES_KEY, 'list', query] as const,
    queryFn: ({ signal }) => getFees(query, signal),
    enabled,
    // The previous page stays while the next one loads, so the pager does not jump.
    placeholderData: keepPreviousData,
  })

/** Prefix of the fees of an account, shared with Settlement Review (['accounts', id, 'fees', {…}]). */
export const accountFeesKey = (accountId: string) => ['accounts', accountId, 'fees'] as const

export const accountFeesQuery = (accountId: string) =>
  queryOptions({
    queryKey: [...accountFeesKey(accountId), {}] as const,
    queryFn: () => getAllAccountFees(accountId),
  })

/** The history of the chain of the fee's type in its account, newest first. */
export const feeHistoryQuery = (feeId: string) =>
  queryOptions({
    queryKey: [...FEES_KEY, feeId, 'history'] as const,
    queryFn: () => getFeeHistory(feeId, 'type'),
  })
