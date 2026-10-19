import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SettlementFigures } from './contract'
import { TotalsByType } from './FiguresTables'
import { PayableBreakdown } from './PayableBreakdown'
import { previewErrorOf } from './preview'
import { strings } from './strings'

const s = strings.preSummary

/** Movements, totals, the payable with its lines, rows not processed and warnings: every figure as the API sent it. */
export function Figures({ figures }: { figures: SettlementFigures }) {
  const notProcessed = s.notProcessed(figures.skipped)
  return (
    <div className="flex flex-col gap-3">
      <p className="tabular-nums">{s.movements(figures.movements)}</p>
      <TotalsByType totals={figures.totals} />
      <PayableBreakdown lines={figures.payableBreakdown} amountPayable={figures.amountPayable} />
      {notProcessed && <p className="text-muted-foreground">{notProcessed}</p>}
      {figures.warnings.length > 0 && (
        <ul aria-label={s.warnings} className="flex flex-col gap-1 text-amber-700 dark:text-amber-400">
          {figures.warnings.map((w, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: warnings have no id and their order is the API's
            <li key={i}>{strings.warning(w)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * The pre-summary panel (design D6, D7). Without a body to send it says what is missing; with an answer that is not
 * the current one, it keeps it on screen out of date until the current one arrives.
 */
export function PreSummary({
  importId,
  figures,
  isCurrent,
  hint,
  error,
  onRetry,
  children,
}: {
  importId: string
  figures: SettlementFigures | null
  isCurrent: boolean
  /** Why there is no body to send (the date, or fields to fix); null when the form is valid. */
  hint: string | null
  error: unknown
  onRetry: () => void
  /** What goes under the figures (the channels to assign). */
  children?: ReactNode
}) {
  const problem = error ? previewErrorOf(error) : null
  const status = problem ? null : (hint ?? (isCurrent ? null : figures ? s.updating : s.loading))
  return (
    <Card role="region" aria-label={s.label}>
      <CardHeader>
        <CardTitle>{s.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div aria-live="polite" className="text-sm">
          {status && <p className="text-muted-foreground">{status}</p>}
          {problem && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-destructive">{problem.text}</p>
              {problem.toAnalysis && (
                <Link
                  to="/imports/$importId"
                  params={{ importId }}
                  search={{ step: 'analysis' }}
                  className="text-primary underline underline-offset-4"
                >
                  {strings.errors.toAnalysis}
                </Link>
              )}
              {problem.retry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  {strings.retry}
                </Button>
              )}
            </div>
          )}
        </div>
        {figures && (
          <div className={cn(!isCurrent && 'opacity-50')} aria-busy={!isCurrent}>
            <Figures figures={figures} />
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
