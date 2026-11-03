import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { auditInstant, formatAuditDateTime } from '@/lib/format'
import type { AccountFee } from './contract'
import { historyLines } from './fee-display'
import { feeHistoryQuery } from './queries'
import { strings } from './strings'

const h = strings.history

/** The rows of the history, newest first, as the API orders them. */
function HistoryList({ feeId }: { feeId: string }) {
  const history = useQuery(feeHistoryQuery(feeId))
  if (history.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span>{h.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void history.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }
  if (!history.data) return <p className="text-sm text-muted-foreground">{h.loading}</p>
  if (history.data.length === 0) return <p className="text-sm text-muted-foreground">{h.empty}</p>
  return (
    <ol className="flex flex-col gap-3">
      {history.data.map((entry) => (
        <li key={entry.feeHistoryId} className="flex flex-col gap-1 rounded-md border p-3">
          <h3 className="font-medium">{h.actions[entry.action]}</h3>
          <p className="text-xs text-muted-foreground">
            {h.byAt(entry.changedBy.userName, formatAuditDateTime(auditInstant(entry.changedAt)))}
          </p>
          {entry.reason && <p className="text-sm">{h.reason(entry.reason)}</p>}
          <div className="text-sm tabular-nums">
            {historyLines(entry.before, entry.after).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * History of the chain of the fee's type in its account, in a side panel (spec fees "Pantalla Account Fees:
 * historial"). The button is the panel's trigger, so closing it gives the focus back to the button.
 */
export function FeeHistorySheet({ fee }: { fee: AccountFee }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="link" size="sm" className="h-auto px-1">
          {strings.account.actions.history}
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{h.title(fee.title)}</SheetTitle>
          <SheetDescription>{h.description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-4">{open && <HistoryList feeId={fee.feeId} />}</div>
      </SheetContent>
    </Sheet>
  )
}
