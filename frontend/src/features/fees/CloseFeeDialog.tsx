import { useId, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { newYorkToday } from '@/lib/format'
import type { AccountFee } from './contract'
import { feeProblemOf } from './fee-errors'
import { useFeeWrite, useRefreshAccountFees } from './mutations'
import { strings } from './strings'

const c = strings.form.close
const MAX_REASON = 500

/**
 * Close… (spec fees "Pantalla Account Fees: cierre de la vigencia"): the last day the fee applies, today in New York
 * by default, never before its last applied event. Both are only the screen's help: the API sets the limit.
 */
export function CloseFeeDialog({
  fee,
  accountId,
  onDone,
  onSaved,
}: {
  fee: AccountFee
  accountId: string
  /** Cancelled: the focus goes back to Close…. */
  onDone: () => void
  /** Closed by the API: the page decides where the focus goes. */
  onSaved: (feeId: string) => void
}) {
  const minimum = fee.lastAppliedEventDate
  const today = newYorkToday()
  const [endDate, setEndDate] = useState(minimum && minimum > today ? minimum : today)
  const [reason, setReason] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const write = useFeeWrite(accountId)
  const refresh = useRefreshAccountFees(accountId)
  const sending = useRef(false)
  const ids = { end: useId(), reason: useId(), minimum: useId(), hint: useId() }

  const tooEarly = minimum !== null && endDate !== '' && endDate < minimum
  const hint = endDate === '' ? c.dateRequired : null
  const blocked = tooEarly || hint !== null
  const trimmed = reason.trim()

  const confirm = async () => {
    if (sending.current || blocked) return
    sending.current = true
    setFailure(null)
    try {
      await write.mutateAsync({
        kind: 'patch',
        feeId: fee.feeId,
        body: trimmed ? { endDate, reason: trimmed } : { endDate },
      })
      onSaved(fee.feeId)
    } catch (error) {
      const problem = feeProblemOf(error, fee.title)
      setFailure(Object.values(problem.fields)[0] ?? problem.general)
      if (problem.refetch) void refresh()
    } finally {
      sending.current = false
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !write.isPending && onDone()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{c.title(fee.title)}</AlertDialogTitle>
          <AlertDialogDescription>{c.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.end}>{c.endDate}</Label>
          <input
            id={ids.end}
            type="date"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs aria-[invalid=true]:border-destructive"
            value={endDate}
            min={minimum ?? undefined}
            aria-invalid={tooEarly || undefined}
            aria-describedby={minimum ? ids.minimum : undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
          {minimum && (
            <p id={ids.minimum} className={tooEarly ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}>
              {c.minimum(minimum)}
            </p>
          )}
          {hint && (
            <p id={ids.hint} className="text-sm text-muted-foreground">
              {hint}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={ids.reason}>{strings.form.labels.reason}</Label>
          <Textarea
            id={ids.reason}
            value={reason}
            maxLength={MAX_REASON}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        {failure && (
          <p role="alert" className="text-sm text-destructive">
            {failure}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={write.isPending}>{strings.form.cancel}</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void confirm()}
            disabled={blocked || write.isPending}
            aria-describedby={tooEarly ? ids.minimum : hint ? ids.hint : undefined}
          >
            {write.isPending ? strings.form.saving : c.confirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
