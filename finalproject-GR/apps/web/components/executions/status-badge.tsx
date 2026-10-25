import type { ExecutionStatus, RunOutcome } from '../../lib/executions-api';
import { Badge } from '@/components/ui/badge';

const STATUS_LABELS: Record<ExecutionStatus, string> = {
  Draft: 'Draft',
  Ready: 'Ready',
  InProgress: 'In Progress',
  Paused: 'Paused',
  Completed: 'Completed',
  Done: 'Done',
  Canceled: 'Canceled',
};

export const OUTCOME_LABELS: Record<RunOutcome, string> = {
  Pending: 'Pending',
  Pass: 'Pass',
  Fail: 'Fail',
  NeedsReview: 'Needs Review',
};

/** Tailwind background per outcome, shared by the run badges and the progress bar. */
export const OUTCOME_COLORS: Record<RunOutcome, string> = {
  Pending: 'bg-pending',
  Pass: 'bg-pass',
  Fail: 'bg-fail',
  NeedsReview: 'bg-review',
};

export function statusLabel(status: ExecutionStatus): string {
  return STATUS_LABELS[status];
}

export function StatusBadge({ status }: { status: ExecutionStatus }) {
  const variant = status === 'InProgress' ? 'default' : status === 'Draft' || status === 'Ready' ? 'outline' : 'secondary';
  return (
    <Badge variant={variant} className={status === 'InProgress' ? 'bg-live' : undefined}>
      {status === 'InProgress' && (
        // "Live" pulse for the one status that changes on its own; static under reduced motion.
        <span data-testid="live-dot" aria-hidden className="size-1.5 rounded-full bg-primary-foreground motion-safe:animate-pulse" />
      )}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function OutcomeBadge({ outcome }: { outcome: RunOutcome }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={`size-2 rounded-full ${OUTCOME_COLORS[outcome]}`} />
      {OUTCOME_LABELS[outcome]}
    </span>
  );
}
