import type { MatchResult, UnmatchedReason } from '@recon/shared'
import { Link, useSearch } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { StatCard } from '@/components/StatCard'
import type { ImportDetail } from '@/lib/api/types'
import { requestListFocus } from '@/lib/list-focus'
import { strings } from '../strings'
import { ROWS_LIST } from './RowsTable'

const c = strings.analysis.counters
const reasons = strings.analysis.rows.reasons

/** A fixed order, so the breakdown reads the same from one import to the next (design D1). */
const REASON_ORDER: readonly UnmatchedReason[] = ['no_match', 'id_format', 'lossy_numeric_id', 'no_gateways']

/**
 * Rows read, by result and by cycle (spec "Resultado del análisis: contadores"). Unmatched and ambiguous warn, and
 * Unmatched breaks down by reason; when every unmatched row is id_format the files probably belong to another account
 * (specs "filas sin asociar por motivo" and "aviso de cuenta equivocada").
 */
export function Counters({
  importId,
  analysis,
}: {
  importId: string
  analysis: NonNullable<ImportDetail['analysis']>
}) {
  const { rows, byCycle, likelyWrongAccount } = analysis
  const search = useSearch({ from: '/app/imports/$importId' })
  const card = (label: string, value: number, filter?: MatchResult, detail?: ReactNode) => {
    const warn = filter !== undefined && value > 0
    return (
      <StatCard label={label} value={value} tone={warn ? 'warning' : 'neutral'}>
        {detail}
        {warn && (
          <Link
            to="/imports/$importId"
            params={{ importId }}
            search={{ step: 'analysis', match: filter }}
            replace
            // The rows below are filtered in place, and they take the focus (ui-polish design D13).
            resetScroll={false}
            onClick={() => {
              // Already filtered on its first page: the rows do not change, so it asks for nothing.
              if (search.match !== filter || search.page !== undefined) requestListFocus(ROWS_LIST)
            }}
            className="text-xs text-primary underline underline-offset-4"
          >
            {c.showRows(label)}
          </Link>
        )}
      </StatCard>
    )
  }

  const shown = REASON_ORDER.filter((reason) => rows.unmatchedByReason[reason] > 0)
  const breakdown = rows.unmatched > 0 && shown.length > 0 && (
    <ul aria-label={c.byReason} className="flex flex-col gap-0.5 text-xs">
      {shown.map((reason) => (
        <li key={reason} className="flex justify-between gap-3">
          <span>{reasons[reason]}</span>
          <span className="font-medium tabular-nums">{rows.unmatchedByReason[reason]}</span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        {card(c.read, rows.total)}
        {card(c.matched, rows.matched)}
        {card(c.unmatched, rows.unmatched, 'unmatched', breakdown)}
        {card(c.ambiguous, rows.ambiguous, 'ambiguous')}
        {card(c.ignored, rows.ignored)}
        <StatCard label={c.byCycle} value={c.cycles(byCycle.E, byCycle.I, byCycle.R)} size="compact" />
      </div>
      {likelyWrongAccount && (
        <section
          aria-label={c.wrongAccountLabel}
          className="rounded-md border border-amber-500/60 bg-amber-50 p-3 text-sm font-medium dark:bg-amber-950/30"
        >
          {c.wrongAccount}
        </section>
      )}
    </div>
  )
}
