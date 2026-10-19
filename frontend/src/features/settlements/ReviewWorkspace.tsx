import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { importKey } from '@/features/imports/queries'
import { validationRunQuery } from '@/features/validations/queries'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { BatchFees } from './BatchFees'
import { BatchSection } from './BatchSection'
import { ChannelsToAssign } from './ChannelsToAssign'
import type { ChannelToAssign, ErrorDetails, NextBatchNumber } from './contract'
import type { RowApiError } from './FeeRow'
import { useProcessSettlement } from './mutations'
import { PreSummary } from './PreSummary'
import { ProcessBar } from './ProcessBar'
import { usePreview } from './preview'
import { nextBatchNumberQuery } from './queries'
import { type FeeRow, type ReviewFormValues, reviewFormSchema, toRequest } from './review-form'
import { strings } from './strings'

/** The file rows of the form: the batch fees of Other Fees as GET /imports/{id} sends them (design D5). */
function fileRows(detail: ImportDetail): FeeRow[] {
  return (detail.batchFees ?? []).map((fee, index) => ({
    key: `file-${index}`,
    origin: 'file',
    feeTypeId: fee.feeTypeId,
    // Not in the catalog: the analyst chooses a free-amount type or removes it (hole 2 of the proposal, #60).
    ...(fee.feeTypeId === null ? { chooseType: true } : {}),
    feeId: null,
    title: fee.title,
    amount: fee.amount ?? '',
    description: fee.title,
    ...(fee.warning ? { fileWarning: fee.warning } : {}),
    currency: fee.currency,
  }))
}

/** A 400 batch_fee_invalid of a row, kept while the row stays as it was sent (design D6). */
interface FeeError {
  key: string
  snapshot: string
  reason: string
}

const UNKNOWN_TYPE_PATH = /^fees\.\d+\.feeTypeId$/

/** The messages of the schema by path ("batchNo", "fees.0.amount"…), for the values as they are now. */
function issuesOf(values: ReviewFormValues): Record<string, string> {
  const result = reviewFormSchema.safeParse(values)
  if (result.success) return {}
  const issues: Record<string, string> = {}
  for (const issue of result.error.issues) issues[issue.path.join('.')] ??= issue.message
  return issues
}

/** The form of a validated import, mounted once its run and the proposed number are known (design D4). */
function ReviewForm({ detail, runId, next }: { detail: ImportDetail; runId: number; next: NextBatchNumber }) {
  const form = useForm<ReviewFormValues>({
    defaultValues: {
      batchNo: String(next.batchNo),
      settlementDate: '',
      fees: fileRows(detail),
      confirmChannels: false,
    },
  })
  const values = useWatch({ control: form.control }) as ReviewFormValues
  const issues = issuesOf(values)
  const valid = Object.keys(issues).length === 0
  const currentRequest = useMemo(() => (valid ? toRequest(values, runId, false) : null), [valid, values, runId])
  const { preview, lastRequest, isCurrent, error, retry } = usePreview(detail.importId, currentRequest)
  const processor = useProcessSettlement(detail.importId)
  const queryClient = useQueryClient()
  const rows = values.fees ?? []
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  // A 400 batch_fee_invalid points at a fee by its index in the body, which is the order of the rows as they are
  // now (an error is shown only for the body of the current values).
  const [feeError, setFeeError] = useState<FeeError | null>(null)
  const recordFeeError = useCallback((e: unknown) => {
    if (!(e instanceof ApiError) || e.code !== 'batch_fee_invalid') return false
    const details = e.details as ErrorDetails['batch_fee_invalid'] | undefined
    const row = details ? rowsRef.current[details.index] : undefined
    if (row && details) setFeeError({ key: row.key, snapshot: JSON.stringify(row), reason: details.reason })
    return true
  }, [])

  useEffect(() => {
    recordFeeError(error)
    // The import is no longer validated (another tab re-ran or cancelled): read it again, the page shows its status.
    if (error instanceof ApiError && error.code === 'import_not_validated') {
      void queryClient.invalidateQueries({ queryKey: importKey(detail.importId), exact: true })
    }
  }, [error, queryClient, detail.importId, recordFeeError])

  const activeFeeError =
    feeError && rows.some((r) => r.key === feeError.key && JSON.stringify(r) === feeError.snapshot) ? feeError : null
  const apiErrors: Record<string, RowApiError> = activeFeeError
    ? {
        [activeFeeError.key]: {
          field: activeFeeError.reason === 'description_required' ? 'description' : 'amount',
          message: strings.fees.invalid(activeFeeError.reason),
        },
      }
    : {}

  const batchNo = values.batchNo
  const taken =
    isCurrent && preview && !preview.batchNoAvailable
      ? preview.batchNo
      : processor.takenBatchNo !== null && String(processor.takenBatchNo) === batchNo
        ? processor.takenBatchNo
        : null
  const batchNoError = issues.batchNo ?? (taken !== null ? strings.batch.taken(taken) : null)
  const dateError = issues.settlementDate ?? null

  const asOf = values.settlementDate && !issues.settlementDate ? values.settlementDate : null

  // Channels to assign (design D9): those of a 409 until the next preview arrives, then those of the preview. What
  // was confirmed was a list: when the list changes, the box is unchecked again.
  const [channelsOverride, setChannelsOverride] = useState<ChannelToAssign[] | null>(null)
  useEffect(() => {
    if (preview) setChannelsOverride(null)
  }, [preview])
  const channelSet = preview?.channelsToAssign.map((c) => c.channelId).join(',') ?? ''
  useEffect(() => {
    void channelSet
    form.setValue('confirmChannels', false)
  }, [channelSet, form])
  const confirmationRequired = channelsOverride !== null || Boolean(preview?.requiresChannelConfirmation)
  const channelsToAssign = channelsOverride ?? (preview?.requiresChannelConfirmation ? preview.channelsToAssign : [])
  const unconfirmed = confirmationRequired && !values.confirmChannels

  const r = strings.process.reasons
  const reasons: string[] = []
  if (!values.settlementDate) reasons.push(r.chooseDate)
  if (rows.some((row) => row.feeTypeId === null)) reasons.push(r.unknownTypes)
  const otherIssues = Object.keys(issues).some((path) => path !== 'settlementDate' && !UNKNOWN_TYPE_PATH.test(path))
  if (otherIssues || (values.settlementDate && issues.settlementDate) || activeFeeError) reasons.push(r.fixFields)
  if (reasons.length === 0) {
    if (error) reasons.push(r.previewFailed)
    else if (!isCurrent) reasons.push(r.waiting)
    else if (preview && !preview.batchNoAvailable) reasons.push(r.batchTaken)
    else if (unconfirmed) reasons.push(r.confirmChannels)
  }

  const hint = valid ? null : !values.settlementDate ? strings.preSummary.chooseDate : strings.preSummary.fixFields

  return (
    <FormProvider {...form}>
      <form className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" onSubmit={(e) => e.preventDefault()}>
        <fieldset disabled={processor.processing} className="flex min-w-0 flex-col gap-4">
          <BatchSection
            next={next}
            attemptNo={isCurrent && preview ? preview.attemptNo : null}
            batchNoError={batchNoError}
            dateError={dateError}
          />
          <BatchFees accountId={detail.accountId} asOf={asOf} rows={rows} issues={issues} apiErrors={apiErrors} />
        </fieldset>
        <PreSummary
          importId={detail.importId}
          figures={preview}
          isCurrent={isCurrent}
          hint={hint}
          error={error}
          onRetry={retry}
        >
          {channelsToAssign.length > 0 && <ChannelsToAssign channels={channelsToAssign} />}
        </PreSummary>
      </form>
      <ProcessBar
        batchNo={isCurrent && preview ? preview.batchNo : batchNo}
        reasons={reasons}
        processing={processor.processing}
        error={processor.error}
        onProcess={() =>
          lastRequest &&
          void processor.process(lastRequest, {
            confirmChannels: confirmationRequired && values.confirmChannels,
            onFeeInvalid: recordFeeError,
            onChannels: (channels) => {
              setChannelsOverride(channels)
              form.setValue('confirmChannels', false)
            },
          })
        }
      />
    </FormProvider>
  )
}

/** The form of a validated import: batch number, settlement date, batch fees, pre-summary and Process. */
export function ReviewWorkspace({ detail }: { detail: ImportDetail }) {
  const run = useQuery(validationRunQuery(detail.importId))
  const next = useQuery(nextBatchNumberQuery(detail.accountId, detail.importId))

  if (run.isPending || next.isPending) return <Skeleton className="h-40 w-full" aria-label={strings.review.loading} />
  if (run.isError || next.isError) {
    const failed = run.isError ? run : next
    const gone = failed.error instanceof ApiError && failed.error.status === 404
    return gone ? (
      <p className="text-sm">{strings.review.notAvailable}</p>
    ) : (
      <div className="flex items-center gap-3 text-sm">
        <span>{strings.review.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void failed.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }
  const current = run.data.run
  if (!current?.review) return <p className="text-sm">{strings.review.notValidated}</p>
  return <ReviewForm detail={detail} runId={current.runId} next={next.data} />
}
