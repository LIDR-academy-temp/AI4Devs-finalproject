'use client';

import type { ReactNode } from 'react';
import type { Execution } from '../../lib/executions-api';
import { formatElapsed } from '../../lib/elapsed-time';
import { useElapsed } from '../../lib/use-elapsed';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';

export interface ExecutionHeaderProps {
  execution: Execution;
  onOpenEnvironment: () => void;
  /** Lifecycle buttons, rendered beside the title. */
  actions: ReactNode;
}

/** Name, status, live timer and run conditions (PRD §6.3.3 header area). */
export function ExecutionHeader({ execution, onOpenEnvironment, actions }: ExecutionHeaderProps) {
  const elapsed = useElapsed(execution);

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{execution.name}</h2>
          {execution.description && <p className="text-sm text-muted-foreground">{execution.description}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={execution.status} />
        <span className="font-mono text-sm tabular-nums" aria-label="Elapsed time">
          {formatElapsed(elapsed)}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <Meta label="Environment">
          {execution.environmentId ? (
            <Button type="button" variant="link" className="h-auto p-0" onClick={onOpenEnvironment}>
              {execution.environmentName}
            </Button>
          ) : execution.environmentName ? (
            <span className="text-muted-foreground">{execution.environmentName} (no longer available)</span>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </Meta>
        <Meta label="Browser">{execution.browser}</Meta>
        <Meta label="Viewport">
          {execution.viewportWidth}×{execution.viewportHeight}
        </Meta>
        <Meta label="Locale">{execution.locale}</Meta>
        <Meta label="Timezone">{execution.timezone}</Meta>
      </dl>
    </header>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
