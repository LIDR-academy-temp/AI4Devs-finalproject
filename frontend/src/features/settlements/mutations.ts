// Process (web-settlement design D10): the body of the current preview, never one rebuilt from the form at the
// click. No optimistic update: nothing is shown as processed before the 201.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError } from '@/lib/api/client'
import { type ErrorDetails, processSettlement, type SettlementRequest } from './contract'
import { previewErrorOf } from './preview'
import { settlementPreviewKey } from './queries'
import { strings } from './strings'

export function useProcessSettlement(importId: string) {
  const queryClient = useQueryClient()
  /** The number the API said is taken when processing; the field shows it until the number changes. */
  const [takenBatchNo, setTakenBatchNo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (request: SettlementRequest) => processSettlement(importId, request),
  })

  /** `onFeeInvalid` takes a 400 batch_fee_invalid to its row; it says whether it did. */
  async function process(
    request: SettlementRequest,
    { onFeeInvalid }: { onFeeInvalid?: (e: unknown) => boolean } = {},
  ) {
    setError(null)
    setTakenBatchNo(null)
    try {
      return await mutation.mutateAsync(request)
    } catch (e) {
      if (onFeeInvalid?.(e)) return null
      if (e instanceof ApiError && e.code === 'batch_no_taken') {
        const details = e.details as ErrorDetails['batch_no_taken'] | undefined
        setTakenBatchNo(details?.batchNo ?? request.batchNo ?? null)
        // The preview of this body said the number was free: ask again, it will say it is not.
        await queryClient.invalidateQueries({ queryKey: settlementPreviewKey(importId, request) })
        return null
      }
      setError(e instanceof ApiError ? previewErrorOf(e).text : strings.errors.processFailed)
      return null
    }
  }

  return { process, processing: mutation.isPending, takenBatchNo, error }
}
