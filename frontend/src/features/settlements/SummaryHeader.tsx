import { Badge } from '@/components/ui/badge'
import { formatAuditDateTime, formatBusinessDate, formatBusinessDateTime } from '@/lib/format'
import type { SettlementView } from './contract'
import { strings } from './strings'

const s = strings.summary
const CYCLES = ['APP', 'DEC', 'I', 'R'] as const

/** The attempt, its status, who processed it and when, its business dates (design D11, D14). */
export function SummaryHeader({ view }: { view: SettlementView }) {
  return (
    <section aria-label={s.title(view.batchNo)} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{s.title(view.batchNo)}</h1>
        <Badge variant="outline">{s.status[view.settledStatus]}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">{s.attempt(view.accountName, view.attemptNo)}</p>
      <p className="text-sm">{s.processedBy(view.approvedBy.userName, formatAuditDateTime(view.processedAt))}</p>
      {view.settlementDate && <p className="text-sm">{s.settlementDate(formatBusinessDate(view.settlementDate))}</p>}
      <ul aria-label={s.ranges} className="flex flex-wrap gap-x-4 text-sm text-muted-foreground tabular-nums">
        {CYCLES.map((cycle) => {
          const range = view.dateRanges[cycle]
          return (
            <li key={cycle}>
              {s.range(
                cycle,
                range ? formatBusinessDateTime(range.min) : null,
                range ? formatBusinessDateTime(range.max) : null,
              )}
            </li>
          )
        })}
      </ul>
      {view.settledStatus === 'pending_payment' && (
        <p className="rounded-md border border-emerald-600/40 bg-emerald-50/50 p-2 text-sm dark:bg-emerald-950/30">
          {s.notSettled}
        </p>
      )}
    </section>
  )
}
