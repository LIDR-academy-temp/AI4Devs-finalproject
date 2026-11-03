import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { useCanPay } from '@/features/imports/permissions'
import { formatAuditDateTime, formatBusinessDate } from '@/lib/format'
import { SETTLED_STATUS_TONE, TONE_NOTICE_CLASS, toneOf } from '@/lib/status-tone'
import type { SettlementView } from './contract'
import { SettlementActions } from './SettlementActions'
import { strings } from './strings'

const s = strings.summary

/**
 * "analyst · 2026-10-19 11:40 ET" in three whole pieces (settlements-browse D11): a line may break between the user,
 * the date and the time, never at a hyphen of the date nor at the colon of the time.
 */
function ByAt({ userName, at }: { userName: string; at: Parameters<typeof formatAuditDateTime>[0] }) {
  const [date = '', ...time] = formatAuditDateTime(at).split(' ')
  return (
    <>
      <span className="whitespace-nowrap">{s.byUser(userName)}</span> <span className="whitespace-nowrap">{date}</span>{' '}
      <span className="whitespace-nowrap">{time.join(' ')}</span>
    </>
  )
}

/** The attempt in a compact grid and whether it is Settled (design D11); its date ranges are in Totals by type (D9). */
export function SummaryHeader({ view }: { view: SettlementView }) {
  const canPay = useCanPay()
  const tone = toneOf(SETTLED_STATUS_TONE, view.settledStatus)
  const items: [string, ReactNode][] = [
    [s.grid.account, view.accountName],
    [s.grid.batch, s.batchAttempt(view.batchNo, view.attemptNo)],
    [
      s.grid.status,
      // Wraps like in Settlement List: on one line it ran under Processed by at 1024 px.
      <Badge key="status" variant={tone} className="h-auto whitespace-normal">
        {s.status[view.settledStatus]}
      </Badge>,
    ],
    [s.grid.processedBy, <ByAt key="processed" userName={view.approvedBy.userName} at={view.processedAt} />],
    [s.grid.settlementDate, view.settlementDate ? formatBusinessDate(view.settlementDate) : s.notSet],
    ...(view.paidBy && view.paidAt
      ? ([[s.grid.paidBy, <ByAt key="paid" userName={view.paidBy.userName} at={view.paidAt} />]] as [
          string,
          ReactNode,
        ][])
      : []),
    ...(view.undoneBy && view.undoneAt
      ? ([
          [s.grid.undoneBy, <ByAt key="undone" userName={view.undoneBy.userName} at={view.undoneAt} />],
          [s.grid.undoReason, view.undoReason],
        ] as [string, ReactNode][])
      : []),
  ]

  return (
    <section aria-label={s.title(view.batchNo)} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{s.title(view.batchNo)}</h1>
        <SettlementActions view={view} />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm lg:grid-cols-5">
        {items.map(([term, definition]) => (
          // min-w-0: an item never grows past its column into the next one.
          <div key={term} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="font-medium tabular-nums">{definition}</dd>
          </div>
        ))}
      </dl>
      {view.settledStatus === 'pending_payment' && (
        // The payment is still pending: the colours of the tone of the status Badge (design D8, status notice).
        <p data-tone={tone} className={`rounded-md border p-2 text-sm ${TONE_NOTICE_CLASS[tone]}`}>
          {s.notSettled}
        </p>
      )}
      {view.status === 'processed' && !canPay && (
        // Whoever cannot pay sees no action: say what is missing (web-admin-fees design D10).
        <p className="text-sm text-muted-foreground">{s.waitingForPayment}</p>
      )}
      {view.status === 'undone' && (
        <p className="text-sm">
          <Link
            to="/imports/$importId"
            params={{ importId: view.importId }}
            search={{ step: 'analysis' }}
            className="text-primary underline underline-offset-4"
          >
            {s.goToAnalysis}
          </Link>
        </p>
      )}
    </section>
  )
}
