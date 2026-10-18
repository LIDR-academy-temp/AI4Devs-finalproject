// Writes of the validations block (design D3, D4). Answers are written into the cache; what they may have changed
// is invalidated. The import detail is read again only when the answer brings another import status.
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { importKey } from '@/features/imports/queries'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { type ErrorDetails, runValidations, type ValidationRunView } from './contract'
import { validationRunKey } from './queries'
import { strings } from './strings'

/** The detail of the import is read again if its status changed on the server (validated ↔ analyzed). */
export function syncImportStatus(queryClient: QueryClient, importId: string, importStatus: ImportDetail['status']) {
  const cached = queryClient.getQueryData<ImportDetail>(importKey(importId))
  if (cached && cached.status !== importStatus) {
    void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
  }
}

/** A run view answered by the API: it is the current one now, and the findings listed before may belong to another. */
export function storeRun(queryClient: QueryClient, view: ValidationRunView) {
  queryClient.setQueryData(validationRunKey(view.importId), view)
  void queryClient.invalidateQueries({ queryKey: [...validationRunKey(view.importId), 'issues'] })
  void queryClient.invalidateQueries({ queryKey: ['validation-issues'] })
  syncImportStatus(queryClient, view.importId, view.importStatus)
}

/** After a 409 of state: the run and the import as they stand on the server. */
export function reloadRunAndImport(queryClient: QueryClient, importId: string) {
  void queryClient.invalidateQueries({ queryKey: validationRunKey(importId) })
  void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
}

/** POST validations with a synchronous guard: two clicks in the same tick send one request (design D4). */
export function useRunValidations(importId: string) {
  const queryClient = useQueryClient()
  const guard = useRef(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const s = strings.run

  async function run() {
    if (guard.current) return
    guard.current = true
    setRunning(true)
    setError(null)
    try {
      storeRun(queryClient, await runValidations(importId))
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'import_changed') {
        setError(s.importChanged)
        reloadRunAndImport(queryClient, importId)
      } else if (failure instanceof ApiError && failure.code === 'import_not_analyzed') {
        setError(s.notAnalyzed((failure.details as ErrorDetails['import_not_analyzed']).status))
        reloadRunAndImport(queryClient, importId)
      } else if (failure instanceof ApiError && failure.status === 403) {
        setError(s.forbidden)
      } else {
        setError(s.failed)
      }
    } finally {
      guard.current = false
      setRunning(false)
    }
  }

  return { run, running, error }
}

export type RunValidations = ReturnType<typeof useRunValidations>
