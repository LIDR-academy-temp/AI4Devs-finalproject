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
import { type Candidate, candidateLabel } from './AmbiguousCandidates'

const s = strings.analysis.rows.resolve

export interface RowChoice {
  row: ImportRowItem
  candidate: Candidate
  /** Whether a current validation run exists or is not known yet when the dialog opens (design D2). */
  warnRun: boolean
}

/**
 * The confirmation of a resolution (spec "Confirmación al resolver una fila ambigua"; design D2): the row, the chosen
 * gateway and, for a candidate of the user's merchants, its channel, status and amount. Keep and Escape close it
 * without calling the API; it closes on its own once the PATCH answers.
 */
export function ResolveRowDialog({
  choice,
  pending,
  onConfirm,
  onClose,
}: {
  choice: RowChoice | null
  pending: boolean
  onConfirm: (choice: RowChoice) => void
  onClose: () => void
}) {
  const candidate = choice?.candidate
  const visible = candidate && candidate.channelName !== null ? candidate : null
  return (
    <AlertDialog open={choice !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      {choice && candidate && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{s.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {s.body(
                choice.row.rowNo,
                choice.row.sheetName,
                choice.row.transactionIdRaw ?? '',
                candidateLabel(candidate),
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {visible && (
            <p className="text-sm text-muted-foreground">
              {s.candidate(visible.channelName ?? '', visible.statusName ?? '', formatDecimal(visible.amount ?? '0'))}
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
