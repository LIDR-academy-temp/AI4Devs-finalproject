import type { MatchResult } from '@recon/shared'
import { Link, useSearch } from '@tanstack/react-router'
import type { ImportDetail } from '@/lib/api/types'
import { requestListFocus } from '@/lib/list-focus'
import { strings } from '../strings'
import { ROWS_LIST } from './RowsTable'

const c = strings.analysis.counters

/** Rows read, by result and by cycle (spec "Resultado del análisis: contadores"). Unmatched and ambiguous warn. */
export function Counters({
  importId,
  analysis,
}: {
  importId: string
  analysis: NonNullable<ImportDetail['analysis']>
}) {
  const { rows, byCycle } = analysis
  const search = useSearch({ from: '/app/imports/$importId' })
  const card = (label: string, value: number, filter?: MatchResult) => {
    const warn = filter !== undefined && value > 0
    return (
      <section
        aria-label={label}
        data-state={warn ? 'warning' : undefined}
        className={`flex min-w-32 flex-col gap-1 rounded-md border bg-background p-3 ${warn ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}
      >
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
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
      </section>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {card(c.read, rows.total)}
      {card(c.matched, rows.matched)}
      {card(c.unmatched, rows.unmatched, 'unmatched')}
      {card(c.ambiguous, rows.ambiguous, 'ambiguous')}
      {card(c.ignored, rows.ignored)}
      <section aria-label={c.byCycle} className="flex min-w-32 flex-col gap-1 rounded-md border bg-background p-3">
        <span className="text-xs text-muted-foreground">{c.byCycle}</span>
        <span className="text-lg font-semibold tabular-nums">{c.cycles(byCycle.E, byCycle.I, byCycle.R)}</span>
      </section>
    </div>
  )
}
