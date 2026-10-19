import { MissingRange } from '@recon/shared'
import { Badge } from '@/components/ui/badge'
import { formatAuditDateTime, formatBusinessDateTime } from '@/lib/format'
import type { ValidationRun } from './contract'
import { strings } from './strings'

const s = strings.header

/** An aggregate to present, not a rule: blocking comes from the API (design D5). */
function overall(run: ValidationRun) {
  if (run.blocked) return { label: s.overall.blocked, variant: 'destructive' as const }
  if (run.results.some((r) => r.outcome === 'warning'))
    return { label: s.overall.warnings, variant: 'secondary' as const }
  return { label: s.overall.passed, variant: 'outline' as const }
}

/** Overall result, the run, the ranges it used and its informative counters (spec "cabecera de la corrida"). */
export function RunHeader({ run }: { run: ValidationRun }) {
  const state = overall(run)
  const counters = [
    [s.pendingInRange, run.pendingInRangeCount],
    [s.undatedAdjustments, run.undatedAdjustmentCount],
    [s.undatedCandidates, run.undatedCandidateCount],
  ] as const

  return (
    <section aria-label={s.label} className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={state.variant}>{state.label}</Badge>
        <span className="text-muted-foreground">
          {s.run(run.runId, formatAuditDateTime(run.runAt), run.runBy.userName)}
        </span>
      </div>
      <ul aria-label={s.ranges} className="flex flex-wrap gap-x-6 gap-y-1">
        {MissingRange.options.map((key) => {
          const range = run.ranges[key]
          return (
            <li key={key}>
              <span className="font-medium">{key}</span>{' '}
              {range ? `${formatBusinessDateTime(range.min)} – ${formatBusinessDateTime(range.max)}` : s.noRange}
            </li>
          )
        })}
      </ul>
      <ul aria-label={s.counters} className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
        {counters.map(([label, value]) => (
          <li key={label}>
            {label} <span className="font-semibold tabular-nums text-foreground">{value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
