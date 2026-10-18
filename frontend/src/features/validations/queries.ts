// Server state of the validations block (design D3). The run and its lists hang from the import's key, so they are
// invalidated together without touching the detail (exact) or the rows.
import { queryOptions } from '@tanstack/react-query'
import { importKey } from '@/features/imports/queries'
import { getValidationRun } from './contract'

export const validationRunKey = (importId: string) => [...importKey(importId), 'validations'] as const

export const validationRunQuery = (importId: string) =>
  queryOptions({
    queryKey: validationRunKey(importId),
    queryFn: () => getValidationRun(importId),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
