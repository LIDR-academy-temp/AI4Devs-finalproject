import { STATUS_LABELS, type ReconciliationStatus } from '@/features/reconciliations/api';

export function StatusBadge({ status }: { status: ReconciliationStatus }) {
  return (
    <span className="rounded-full border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
      {STATUS_LABELS[status]}
    </span>
  );
}
