import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { FormProvider, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { importKey } from '@/features/imports/queries'
import { validationRunQuery } from '@/features/validations/queries'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { BatchSection } from './BatchSection'
import type { NextBatchNumber } from './contract'
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
    feeId: null,
    title: fee.title,
    amount: fee.amount ?? '',
    description: fee.title,
    ...(fee.warning ? { fileWarning: fee.warning } : {}),
    currency: fee.currency,
  }))
}

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

  // The import is no longer validated (another tab re-ran or cancelled): read it again, and the page shows its status.
  useEffect(() => {
    if (error instanceof ApiError && error.code === 'import_not_validated') {
      void queryClient.invalidateQueries({ queryKey: importKey(detail.importId), exact: true })
    }
  }, [error, queryClient, detail.importId])

  const batchNo = values.batchNo
  const taken =
    isCurrent && preview && !preview.batchNoAvailable
      ? preview.batchNo
      : processor.takenBatchNo !== null && String(processor.takenBatchNo) === batchNo
        ? processor.takenBatchNo
        : null
  const batchNoError = issues.batchNo ?? (taken !== null ? strings.batch.taken(taken) : null)
  const dateError = issues.settlementDate ?? null

  const r = strings.process.reasons
  const reasons: string[] = []
  if (!values.settlementDate) reasons.push(r.chooseDate)
  else if (!valid) reasons.push(r.fixFields)
  else if (error) reasons.push(r.previewFailed)
  else if (!isCurrent) reasons.push(r.waiting)
  else if (preview && !preview.batchNoAvailable) reasons.push(r.batchTaken)

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
        </fieldset>
        <PreSummary
          importId={detail.importId}
          figures={preview}
          isCurrent={isCurrent}
          hint={hint}
          error={error}
          onRetry={retry}
        />
      </form>
      <ProcessBar
        batchNo={isCurrent && preview ? preview.batchNo : batchNo}
        reasons={reasons}
        processing={processor.processing}
        error={processor.error}
        onProcess={() => lastRequest && void processor.process(lastRequest)}
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
