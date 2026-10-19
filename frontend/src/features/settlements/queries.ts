// Server state of the settlement screens (web-settlement design D3).
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { importKey } from '@/features/imports/queries'
import {
  getAccountFees,
  getFeeTypes,
  getNextBatchNumber,
  getSettlement,
  previewSettlement,
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
