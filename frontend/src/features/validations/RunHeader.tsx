import { DateRangesTable } from '@/components/DateRangesTable'
import { Badge } from '@/components/ui/badge'
import { formatAuditDateTime } from '@/lib/format'
import { RUN_OVERALL_TONE, type RunOverall } from '@/lib/status-tone'
import type { ValidationRun } from './contract'
import { strings } from './strings'

const s = strings.header

/** An aggregate to present, not a rule: blocking comes from the API (design D5). */
function overall(run: ValidationRun): RunOverall {
  if (run.blocked) return 'blocked'
  if (run.results.some((r) => r.outcome === 'warning')) return 'warnings'
  return 'passed'
}

/**
 * The overall result next to the title of the section, then the run as secondary text (design D10): the first thing
 * the analyst wants to know.
 */
export function OverallResult({ run }: { run: ValidationRun }) {
  const state = overall(run)
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span className="text-muted-foreground">{s.overallLabel}</span>
      <Badge variant={RUN_OVERALL_TONE[state]}>{s.overall[state]}</Badge>
      <span className="text-muted-foreground">
        {s.run(run.runId, formatAuditDateTime(run.runAt), run.runBy.userName)}
      </span>
    </p>
  )
}

/**
 * The ranges the run used and its informative counters (spec "cabecera de la corrida"). A blocked run has no table
 * of ranges: provider_mismatch stops the import and the ranges do not help to solve it (design D9).
 */
export function RunHeader({ run }: { run: ValidationRun }) {
  const counters = [
    [s.pendingInRange, run.pendingInRangeCount, s.explain.pendingInRange],
    [s.undatedAdjustments, run.undatedAdjustmentCount, s.explain.undatedAdjustments],
    [s.undatedCandidates, run.undatedCandidateCount, s.explain.undatedCandidates],
  ] as const

  return (
    <section aria-label={s.label} className="flex flex-col gap-3 text-sm">
      {!run.blocked && <DateRangesTable title={s.ranges} ranges={run.ranges} />}
      <section aria-label={s.counters} className="flex flex-col gap-1">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
          {counters.map(([label, value, explain]) => (
            <div key={label} className="flex flex-col">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-semibold tabular-nums">{value}</dd>
              <dd className="text-xs text-muted-foreground">{explain}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">{s.explain.note}</p>
      </section>
    </section>
  )
}
