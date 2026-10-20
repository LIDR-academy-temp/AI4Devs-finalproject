// Server state of the settlement screens (web-settlement design D3).
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { importKey } from '@/features/imports/queries'
import {
  type BatchStatus,
  type Cycle,
  getAccountFees,
  getAccountSettlements,
  getFeeTypes,
  getNextBatchNumber,
  getSettlement,
  getSettlementTransactions,
  previewSettlement,
  type SettlementDateField,
  type SettlementRequest,
} from './contract'

/** Catalogs that do not change while the screen is open (design D3). */
const CATALOG_STALE_MS = 5 * 60_000

/** The non-transactional fees of the account in force on the settlement date; asked only once there is one. */
export const accountFeesQuery = (accountId: string, asOf: string | null) =>
  queryOptions({
    queryKey: ['accounts', accountId, 'fees', { transactional: false, asOf }] as const,
    queryFn: () => getAccountFees(accountId, { transactional: false, asOf: asOf! }),
    enabled: asOf !== null,
    staleTime: CATALOG_STALE_MS,
  })

export const feeTypesQuery = () =>
  queryOptions({ queryKey: ['fee-types'] as const, queryFn: getFeeTypes, staleTime: CATALOG_STALE_MS })

export const settlementKey = (batchId: string) => ['settlements', batchId] as const

/** An attempt: seeded by Process with its 201, so it is read only on a reload or a link (no action changes it yet). */
export const settlementQuery = (batchId: string) =>
  queryOptions({ queryKey: settlementKey(batchId), queryFn: () => getSettlement(batchId), staleTime: Infinity })

/** Rows per page of Settlement List: the 22 seeded batches of ProviderA-USD take two pages (settlements-browse D9). */
export const SETTLEMENTS_PAGE_SIZE = 20

export interface AccountSettlementsFilters {
  status?: BatchStatus
  dateField?: SettlementDateField
  from?: string
  to?: string
  page: number
}

/** Every page and filter of the list of an account: what a new attempt of the account makes stale. */
export const accountSettlementsPrefix = (accountId: string) => ['accounts', accountId, 'settlements'] as const

export const accountSettlementsQuery = (accountId: string, filters: AccountSettlementsFilters, enabled = true) =>
  queryOptions({
    queryKey: [...accountSettlementsPrefix(accountId), filters] as const,
    queryFn: ({ signal }) => getAccountSettlements(accountId, { ...filters, pageSize: SETTLEMENTS_PAGE_SIZE }, signal),
    enabled,
    // The previous page stays while the next one loads, never the list of another account.
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === accountId ? previous : undefined),
  })

/** Movements per page of the Movements tab: the default of the API. */
export const MOVEMENTS_PAGE_SIZE = 50

/**
 * A page of the movements of a cycle, under the attempt's key: an attempt as written does not change until the
 * payment actions of a later change, which will invalidate the whole attempt.
 */
export const settlementTransactionsQuery = (batchId: string, cycle: Cycle, page: number) =>
  queryOptions({
    queryKey: [...settlementKey(batchId), 'transactions', { cycle, page }] as const,
    queryFn: () => getSettlementTransactions(batchId, { type: cycle, page }),
    staleTime: Infinity,
    // The previous page stays while the next one of the same cycle loads, never the rows of another cycle.
    placeholderData: (previous, previousQuery) =>
      (previousQuery?.queryKey[3] as { cycle: Cycle } | undefined)?.cycle === cycle ? previous : undefined,
  })

/** The proposed number is a proposal, not a reservation: always asked again when the screen opens. */
export const nextBatchNumberQuery = (accountId: string, importId: string) =>
  queryOptions({
    queryKey: ['accounts', accountId, 'batch-number', { importId }] as const,
    queryFn: () => getNextBatchNumber(accountId, importId),
    staleTime: 0,
  })

/** The previews hang from the import, keyed by the whole body: one answer per body (design D6). */
export const settlementPreviewsKey = (importId: string) => [...importKey(importId), 'settlement-preview'] as const

export const settlementPreviewKey = (importId: string, request: SettlementRequest | null) =>
  [...settlementPreviewsKey(importId), request] as const

export const settlementPreviewQuery = (importId: string, request: SettlementRequest | null) =>
  queryOptions({
    queryKey: settlementPreviewKey(importId, request),
    queryFn: ({ signal }) => previewSettlement(importId, request!, signal),
    enabled: request !== null,
    placeholderData: keepPreviousData,
    retry: false,
  })
