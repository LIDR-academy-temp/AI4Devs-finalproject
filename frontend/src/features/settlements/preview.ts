// The preview of Settlement Review (web-settlement design D6): a query keyed by the whole body, sent once the form
// has stayed valid and unchanged for the debounce. "Current" means the answer on screen is the one of the form as it
// is now: Process waits for it, so that what is processed is what the analyst saw.
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { ApiError } from '@/lib/api/client'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import type { ErrorDetails, SettlementRequest } from './contract'
import { settlementPreviewQuery } from './queries'
import { strings } from './strings'

export const PREVIEW_DEBOUNCE_MS = 400

export function usePreview(importId: string, currentRequest: SettlementRequest | null) {
  // The body as text: equal bodies are the same key, whatever the identity of the objects of the form.
  const currentKey = currentRequest ? JSON.stringify(currentRequest) : null
  const debouncedKey = useDebouncedValue(currentKey, PREVIEW_DEBOUNCE_MS)
  const request = useMemo(() => (debouncedKey ? (JSON.parse(debouncedKey) as SettlementRequest) : null), [debouncedKey])
  const query = useQuery(settlementPreviewQuery(importId, request))
  const isCurrent = currentKey !== null && currentKey === debouncedKey && query.isSuccess && !query.isPlaceholderData
  const failed = currentKey !== null && currentKey === debouncedKey && query.isError
  return {
    /** The last answer, current or not (shown as out of date until the current one arrives). */
    preview: query.data ?? null,
    /** The body of the answer on screen when it is current: what Process sends. */
    lastRequest: isCurrent ? request : null,
    isCurrent,
    error: failed ? query.error : null,
    retry: () => void query.refetch(),
  }
}

/** What the screen says about an error of the preview or of Process, and whether it offers Retry or Analysis. */
export function previewErrorOf(error: unknown): { text: string; toAnalysis: boolean; retry: boolean } {
  const e = strings.errors
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'validation_run_superseded':
        return { text: e.superseded, toAnalysis: true, retry: false }
      case 'validation_run_required':
        return { text: e.required, toAnalysis: true, retry: false }
      case 'blocking_validation_issue':
        return { text: e.blocking, toAnalysis: true, retry: false }
      case 'import_not_validated': {
        const status = (error.details as ErrorDetails['import_not_validated'] | undefined)?.status ?? 'analyzed'
        return { text: e.notValidated(status), toAnalysis: true, retry: false }
      }
      case 'forbidden':
        return { text: e.forbidden, toAnalysis: false, retry: false }
    }
  }
  return { text: strings.preSummary.loadError, toAnalysis: false, retry: true }
}
