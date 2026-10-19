// Server state of the settlement screens (web-settlement design D3).
import { queryOptions } from '@tanstack/react-query'
import { getSettlement } from './contract'

export const settlementKey = (batchId: string) => ['settlements', batchId] as const

/** An attempt: seeded by Process with its 201, so it is read only on a reload or a link (no action changes it yet). */
export const settlementQuery = (batchId: string) =>
  queryOptions({ queryKey: settlementKey(batchId), queryFn: () => getSettlement(batchId), staleTime: Infinity })
