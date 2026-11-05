// Server state of the import workspace (design D3). Every GET of an import re-reads its files on the server, so the
// detail is not refetched on focus and the mutations write their response into the cache instead of invalidating.
import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import type { ImportDetail, ImportListQuery, ImportRowsPage, ImportRowsQuery } from '@/lib/api/types'

/**
 * The detail typed from the contract. openapi-fetch's `Readable<>` (openapi-typescript-helpers 0.1.0) drops the
 * properties whose type is exactly `null`, which are the hidden forms of other merchants (`otherAccount`,
 * candidates); the body is the same.
 */
export const asDetail = (call: Parameters<typeof unwrap>[0]) => unwrap(call) as Promise<ImportDetail>

export const importKey = (importId: string) => ['imports', importId] as const

/** Root of the In Progress list: apart from `importKey`, so refreshing the list never touches a detail (D5). */
export const IMPORT_LIST_KEY = ['import-list'] as const

/** GET /imports for In Progress; asked only once the merchant → provider → account of the address are in scope. */
export const importListQuery = (query: ImportListQuery, enabled = true) =>
  queryOptions({
    queryKey: [...IMPORT_LIST_KEY, query] as const,
    queryFn: ({ signal }) => unwrap(api.GET('/api/v1/imports', { params: { query }, signal })),
    enabled,
    // The previous page stays while the next one loads, so the pager does not jump.
    placeholderData: keepPreviousData,
  })

export const importQuery = (importId: string) =>
  queryOptions({
    queryKey: importKey(importId),
    queryFn: () => asDetail(api.GET('/api/v1/imports/{importId}', { params: { path: { importId } } })),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })

export const ROWS_PAGE_SIZE = 50

/** A page of the rows of an analyzed import; paging keeps the previous page on screen while the next loads. */
export const importRowsQuery = (importId: string, { match, page = 1 }: Pick<ImportRowsQuery, 'match' | 'page'>) =>
  queryOptions({
    queryKey: [...importKey(importId), 'rows', { match, page }] as const,
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/imports/{importId}/rows', {
          params: { path: { importId }, query: { ...(match ? { match } : {}), page, pageSize: ROWS_PAGE_SIZE } },
        }),
      ) as Promise<ImportRowsPage>,
    placeholderData: keepPreviousData,
  })
