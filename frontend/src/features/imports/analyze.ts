// The analysis of an import (design D8): POST analyze is synchronous and can take tens of seconds. A synchronous
// guard keeps a double click from sending two requests; after a 409 or a lost connection the import is read again
// and its status decides, because a proxy may cut the answer while the server finishes and persists.
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { ApiError, api } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { storeDetail } from './mutations'
import { asDetail, importQuery } from './queries'
import { strings } from './strings'

type Missing = ImportDetail['readiness']['missing']

export function useAnalyze(detail: ImportDetail, onAnalyzed: () => void) {
  const queryClient = useQueryClient()
  const guard = useRef(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [missing, setMissing] = useState<{ for: ImportDetail; items: Missing } | null>(null)

  // The missing items of a 422 stand until the next detail (design D8).
  useEffect(() => {
    if (missing && missing.for !== detail) setMissing(null)
  }, [detail, missing])

  async function analyze() {
    if (guard.current) return
    guard.current = true
    setRunning(true)
    setError(null)
    try {
      const analyzed = await asDetail(
        api.POST('/api/v1/imports/{importId}/analyze', { params: { path: { importId: detail.importId } } }),
      )
      storeDetail(queryClient, analyzed)
      onAnalyzed()
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'mapping_incomplete') {
        const items = (failure.details as { missing?: Missing } | undefined)?.missing ?? []
        setMissing({ for: detail, items })
      } else if (failure instanceof ApiError && failure.code === 'import_too_large') {
        const { rows = 0, limit = 0 } = (failure.details ?? {}) as { rows?: number; limit?: number }
        setError(strings.analyze.tooLarge(rows, limit))
      } else if (failure instanceof ApiError && failure.status < 500 && failure.status !== 409) {
        setError(strings.analyze.didNotFinish)
      } else {
        await readBack()
      }
    } finally {
      guard.current = false
      setRunning(false)
    }
  }

  /** After a 409, a 5xx or a lost connection: the status of the import on the server decides. */
  async function readBack() {
    try {
      const fresh = await queryClient.fetchQuery({ ...importQuery(detail.importId), staleTime: 0 })
      if (fresh.analysis !== null) onAnalyzed()
      else setError(strings.analyze.didNotFinish)
    } catch {
      setError(strings.analyze.didNotFinish)
    }
  }

  return {
    analyze,
    running,
    error,
    /** The missing items of the last 422, while the detail is the one it answered. */
    missing: missing?.for === detail ? missing.items : null,
  }
}

export type Analysis = ReturnType<typeof useAnalyze>
