import { BUG_STATUS_LABELS, type BugSeverity, type BugStatus } from '../../lib/bugs-api';
import { Badge } from '@/components/ui/badge';

/** Color per severity (PRD §6.4.2: "colour-coded dot"). */
export const SEVERITY_COLORS: Record<BugSeverity, string> = {
  Critical: 'bg-sev-critical',
  High: 'bg-sev-high',
  Medium: 'bg-sev-medium',
  Low: 'bg-sev-low',
};

export function SeverityDot({ severity }: { severity: BugSeverity }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden className={`size-2 rounded-full ${SEVERITY_COLORS[severity]}`} />
      {severity}
    </span>
  );
}

export function BugStatusBadge({ status }: { status: BugStatus }) {
  const variant = status === 'Open' ? 'default' : status === 'InProgress' ? 'secondary' : 'outline';
  return <Badge variant={variant}>{BUG_STATUS_LABELS[status]}</Badge>;
}
