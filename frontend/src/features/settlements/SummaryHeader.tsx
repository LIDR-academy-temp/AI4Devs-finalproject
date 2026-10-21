import type { ReactNode } from 'react'
import { DateRangesTable } from '@/components/DateRangesTable'
import { Badge } from '@/components/ui/badge'
import { formatAuditDateTime, formatBusinessDate } from '@/lib/format'
import { SETTLED_STATUS_TONE, toneOf } from '@/lib/status-tone'
import type { SettlementView } from './contract'
import { strings } from './strings'

const s = strings.summary

type Category = SettlementView['totals'][number]['category']

/**
 * The count of each status as the view sends it, read without operating (design D9): the qty of its category (the
 * API always sends the five, in order) and the R movements.
 */
function transactionsOf(view: SettlementView) {
  const qty = Object.fromEntries(view.totals.map((total) => [total.category, total.qty])) as Record<Category, number>
  return {
    APP: qty.deposit,
    DEC: qty.declined,
    CHB: qty.chargeback,
    REF: qty.refund,
    RDR: qty.rdr,
    R: view.movements.R,
  }
}

/** The attempt in a compact grid, its date ranges by cycle and status, and whether it is Settled (design D11). */
export function SummaryHeader({ view }: { view: SettlementView }) {
  const items: [string, ReactNode][] = [
    [s.grid.account, view.accountName],
    [s.grid.batch, s.batchAttempt(view.batchNo, view.attemptNo)],
    [
      s.grid.status,
      <Badge key="status" variant={toneOf(SETTLED_STATUS_TONE, view.settledStatus)}>
        {s.status[view.settledStatus]}
      </Badge>,
    ],
    [s.grid.processedBy, s.byAt(view.approvedBy.userName, formatAuditDateTime(view.processedAt))],
    [s.grid.settlementDate, view.settlementDate ? formatBusinessDate(view.settlementDate) : s.notSet],
  ]

  return (
    <section aria-label={s.title(view.batchNo)} className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{s.title(view.batchNo)}</h1>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-5">
        {items.map(([term, definition]) => (
          <div key={term} className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="font-medium tabular-nums">{definition}</dd>
          </div>
        ))}
      </dl>
      <DateRangesTable title={s.ranges} ranges={view.dateRanges} transactions={transactionsOf(view)} />
      {view.settledStatus === 'pending_payment' && (
        <p className="rounded-md border border-emerald-600/40 bg-emerald-50/50 p-2 text-sm dark:bg-emerald-950/30">
          {s.notSettled}
        </p>
      )}
    </section>
  )
}
