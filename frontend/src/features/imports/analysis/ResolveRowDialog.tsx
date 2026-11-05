import { useRef } from 'react'
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
import type { ImportRowItem } from '@/lib/api/types'
import { formatDecimal } from '@/lib/format'
import { strings } from '../strings'
import { type Candidate, candidateLabel, isVisibleCandidate } from './AmbiguousCandidates'

const s = strings.analysis.rows.resolve

export interface RowChoice {
  row: ImportRowItem
  candidate: Candidate
  /** Whether a current validation run exists or is not known yet when the dialog opens (design D2). */
  warnRun: boolean
  /** The Choose that opened the dialog: where the focus goes back when it closes without resolving (design D4). */
  opener: HTMLElement | null
}

/**
 * The confirmation of a resolution (spec "Confirmación al resolver una fila ambigua"; design D2): the row, the chosen
 * gateway and, for a candidate of the user's merchants, its channel, status and amount. Keep and Escape close it
 * without calling the API; it closes on its own once the PATCH answers.
 *
 * The focus when it closes (design D4): Radix's AlertDialog returns it to its trigger and this dialog has none, so by
 * itself it would end on the body. Closed without resolving, it goes back to the Choose that opened the dialog; after a
 * resolution that Choose disappears and the heading of the rows takes it, so nothing is focused here.
 */
export function ResolveRowDialog({
  choice,
  pending,
  returnFocus,
  onConfirm,
  onClose,
}: {
  choice: RowChoice | null
  pending: boolean
  /** False when the dialog closes after a resolution (a 200): the focus is left to the heading of the rows. */
  returnFocus: boolean
  onConfirm: (choice: RowChoice) => void
  onClose: () => void
}) {
  // Radix calls onCloseAutoFocus after the content unmounts, with the handler of the last render that showed it:
  // what it needs is read from here, kept up to date on every render, the closing one included.
  const closing = useRef<{ opener: HTMLElement | null; returnFocus: boolean }>({ opener: null, returnFocus })
  closing.current.returnFocus = returnFocus
  if (choice) closing.current.opener = choice.opener
  const onCloseAutoFocus = (event: Event) => {
    event.preventDefault()
    const { opener } = closing.current
    if (closing.current.returnFocus && opener?.isConnected) opener.focus()
  }

  const candidate = choice?.candidate
  const visible = candidate && isVisibleCandidate(candidate) ? candidate : null
  return (
    <AlertDialog open={choice !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      {choice && candidate && (
        <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
          <AlertDialogHeader>
            <AlertDialogTitle>{s.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {s.body(choice.row.rowNo, choice.row.sheetName, choice.row.transactionIdRaw, candidateLabel(candidate))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {visible && (
            <p className="text-sm text-muted-foreground">
              {s.candidate(visible.channelName, visible.statusName, formatDecimal(visible.amount))}
            </p>
          )}
          {choice.warnRun && <p className="text-sm font-medium text-amber-700 dark:text-amber-400">{s.runWarning}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{s.keep}</AlertDialogCancel>
            <Button onClick={() => onConfirm(choice)} disabled={pending}>
              {s.confirm}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
