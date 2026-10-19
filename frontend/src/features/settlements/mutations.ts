// Process (web-settlement design D3, D10): the body of the current preview, never one rebuilt from the form at the
// click, with a synchronous guard so that two clicks in the same tick send one POST. No optimistic update: nothing
// is shown as processed before the 201, and then the Summary paints that answer without asking for it again.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { importKey } from '@/features/imports/queries'
import { validationRunKey } from '@/features/validations/queries'
import { ApiError } from '@/lib/api/client'
import { type ChannelToAssign, type ErrorDetails, processSettlement, type SettlementRequest } from './contract'
import { previewErrorOf } from './preview'
import { settlementKey, settlementPreviewKey, settlementPreviewsKey } from './queries'
import { strings } from './strings'

/** Errors after which the preview of the same body must be asked again: it was answered before the change. */
const STALE_PREVIEW = new Set([
  'batch_no_taken',
  'channel_assignment_not_confirmed',
  'validation_run_superseded',
  'validation_run_required',
  'blocking_validation_issue',
])

export interface ProcessError {
  text: string
  retry: boolean
}

export interface ProcessHandlers {
  /** The channel assignment is required by the preview and confirmed by the analyst. */
  confirmChannels?: boolean
  /** Takes a 400 batch_fee_invalid to its row; says whether it did. */
  onFeeInvalid?: (e: unknown) => boolean
  /** The channels the API says need the confirmation (409 channel_assignment_not_confirmed). */
  onChannels?: (channels: ChannelToAssign[]) => void
}

export function useProcessSettlement(importId: string) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const guard = useRef(false)
  /** The number the API said is taken when processing; the field shows it until the number changes. */
  const [takenBatchNo, setTakenBatchNo] = useState<number | null>(null)
  /** What the screen says about the last failed Process, and whether it offers to send the same body again. */
  const [error, setError] = useState<ProcessError | null>(null)

  const mutation = useMutation({
    mutationFn: (request: SettlementRequest) => processSettlement(importId, request),
  })

  /** `preview` is the body of the preview on screen: what is sent, plus the confirmation of the channels. */
  async function process(
    preview: SettlementRequest,
    { confirmChannels, onFeeInvalid, onChannels }: ProcessHandlers = {},
  ) {
    if (guard.current) return
    guard.current = true
    setError(null)
    setTakenBatchNo(null)
    const request = confirmChannels ? { ...preview, confirmChannelAssignment: true } : preview
    try {
      const view = await mutation.mutateAsync(request)
      queryClient.setQueryData(settlementKey(view.batchId), view)
      // Replace: going back must not reopen the form of an import already processed.
      await navigate({ to: '/settlements/$batchId', params: { batchId: view.batchId }, replace: true })
      queryClient.removeQueries({ queryKey: settlementPreviewsKey(importId) })
      void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
      void queryClient.invalidateQueries({ queryKey: validationRunKey(importId) })
    } catch (e) {
      if (onFeeInvalid?.(e)) return
      if (e instanceof ApiError && e.code === 'batch_no_taken') {
        const details = e.details as ErrorDetails['batch_no_taken'] | undefined
        setTakenBatchNo(details?.batchNo ?? request.batchNo ?? null)
      } else if (e instanceof ApiError && e.code === 'channel_assignment_not_confirmed') {
        const details = e.details as ErrorDetails['channel_assignment_not_confirmed'] | undefined
        onChannels?.(details?.channels ?? [])
      } else if (e instanceof ApiError && e.code === 'import_not_validated') {
        setError({ text: previewErrorOf(e).text, retry: false })
        void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
      } else if (e instanceof ApiError && e.code === 'settlement_busy') {
        // Another processing of the provider held the rows: nothing was written, the same body can go again.
        setError({ text: strings.errors.busy, retry: true })
      } else {
        setError({ text: e instanceof ApiError ? previewErrorOf(e).text : strings.errors.processFailed, retry: false })
      }
      if (e instanceof ApiError && e.code && STALE_PREVIEW.has(e.code)) {
        // The preview of this body is no longer what the API would answer: ask again.
        await queryClient.invalidateQueries({ queryKey: settlementPreviewKey(importId, preview) })
      }
    } finally {
      guard.current = false
    }
  }

  return { process, processing: mutation.isPending, takenBatchNo, error }
}
