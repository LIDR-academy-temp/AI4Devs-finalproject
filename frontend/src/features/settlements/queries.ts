// Server state of the settlement screens (web-settlement design D3).
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { importKey } from '@/features/imports/queries'
import { getNextBatchNumber, getSettlement, previewSettlement, type SettlementRequest } from './contract'

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
