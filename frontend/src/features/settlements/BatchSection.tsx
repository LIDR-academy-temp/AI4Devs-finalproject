import { useId } from 'react'
import { useFormContext } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NextBatchNumber } from './contract'
import type { ReviewFormValues } from './review-form'
import { strings } from './strings'

const s = strings.batch

/** A field's error under it, linked to the field by aria-describedby. */
function FieldError({ id, message }: { id: string; message: string | null }) {
  return message ? (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  ) : null
}

/** Batch number (proposed, editable) and settlement date (required business date), design D8 and D14. */
export function BatchSection({
  next,
  attemptNo,
  batchNoError,
  dateError,
}: {
  next: NextBatchNumber
  /** The attempt of the current preview, when there is one. */
  attemptNo: number | null
  batchNoError: string | null
  dateError: string | null
}) {
  const { register } = useFormContext<ReviewFormValues>()
  const ids = {
    batchNo: useId(),
    proposed: useId(),
    batchNoError: useId(),
    date: useId(),
    dateHelp: useId(),
    dateError: useId(),
  }
  const proposed =
    next.reason === 'reprocess' ? s.reprocess(next.batchNo, next.attemptNo) : s.proposed(next.batchNo, next.attemptNo)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{s.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.batchNo}>{s.batchNo}</Label>
          <Input
            id={ids.batchNo}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={batchNoError !== null}
            aria-describedby={[ids.proposed, batchNoError && ids.batchNoError].filter(Boolean).join(' ')}
            {...register('batchNo')}
          />
          <p id={ids.proposed} className="text-sm text-muted-foreground">
            {proposed}
            {attemptNo !== null && attemptNo !== next.attemptNo ? ` · ${strings.batch.attempt(attemptNo)}` : ''}
          </p>
          <FieldError id={ids.batchNoError} message={batchNoError} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.date}>{s.settlementDate}</Label>
          <Input
            id={ids.date}
            type="date"
            aria-invalid={dateError !== null}
            aria-describedby={[ids.dateHelp, dateError && ids.dateError].filter(Boolean).join(' ')}
            {...register('settlementDate')}
          />
          <p id={ids.dateHelp} className="text-sm text-muted-foreground">
            {s.settlementDateHelp}
          </p>
          <FieldError id={ids.dateError} message={dateError} />
        </div>
      </CardContent>
    </Card>
  )
}
