import type { Execution, RunOutcome } from '../../lib/executions-api';
import { OUTCOME_COLORS, OUTCOME_LABELS } from './status-badge';
import { cn } from '@/lib/utils';

/** null = Total (no filter). */
export type OutcomeFilter = RunOutcome | null;

export interface StatsBarProps {
  counts: Execution['counts'];
  filter: OutcomeFilter;
  onFilterChange: (filter: OutcomeFilter) => void;
}

/** The 5 clickable cells (PRD §6.3.3) plus the outcome-proportioned progress bar. */
export function StatsBar({ counts, filter, onFilterChange }: StatsBarProps) {
  const pending = counts.total - counts.done;
  const cells: { label: string; value: number; filter: OutcomeFilter }[] = [
    { label: 'Total', value: counts.total, filter: null },
    { label: OUTCOME_LABELS.Pass, value: counts.pass, filter: 'Pass' },
    { label: OUTCOME_LABELS.NeedsReview, value: counts.needsReview, filter: 'NeedsReview' },
    { label: OUTCOME_LABELS.Fail, value: counts.fail, filter: 'Fail' },
    { label: OUTCOME_LABELS.Pending, value: pending, filter: 'Pending' },
  ];
  const segments: { outcome: RunOutcome; value: number }[] = [
    { outcome: 'Pass', value: counts.pass },
    { outcome: 'NeedsReview', value: counts.needsReview },
    { outcome: 'Fail', value: counts.fail },
    { outcome: 'Pending', value: pending },
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="Run statistics">
        {cells.map((cell) => (
          <button
            key={cell.label}
            type="button"
            aria-pressed={filter === cell.filter}
            onClick={() => onFilterChange(cell.filter)}
            className={cn(
              'flex flex-col items-start rounded-md border px-3 py-2 text-left hover:bg-muted',
              filter === cell.filter && 'border-primary bg-muted',
            )}
          >
            <span className="text-xs text-muted-foreground">{cell.label}</span>
            <span className="text-lg font-semibold tabular-nums">{cell.value}</span>
          </button>
        ))}
      </div>
      <div
        className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${counts.done} of ${counts.total} runs have an outcome`}
      >
        {counts.total > 0 &&
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => (
              <div
                key={segment.outcome}
                className={OUTCOME_COLORS[segment.outcome]}
                style={{ width: `${(segment.value / counts.total) * 100}%` }}
              />
            ))}
      </div>
    </div>
  );
}
