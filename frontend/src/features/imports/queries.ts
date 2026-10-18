// Server state of the import workspace (design D3). Every GET of an import re-reads its files on the server, so the
// detail is not refetched on focus and the mutations write their response into the cache instead of invalidating.
import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'

/**
 * The detail typed from the contract. openapi-fetch's `Readable<>` (openapi-typescript-helpers 0.1.0) drops the
 * properties whose type is exactly `null`, which are the hidden forms of other merchants (`otherAccount`,
 * candidates); the body is the same.
 */
export const asDetail = (call: Parameters<typeof unwrap>[0]) => unwrap(call) as Promise<ImportDetail>

export const importKey = (importId: string) => ['imports', importId] as const

export const importQuery = (importId: string) =>
  queryOptions({
    queryKey: importKey(importId),
    queryFn: () => asDetail(api.GET('/api/v1/imports/{importId}', { params: { path: { importId } } })),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
