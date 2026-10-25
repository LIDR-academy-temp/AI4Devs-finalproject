'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import {
  deleteExecution,
  transitionExecution,
  type Execution,
  type LifecycleVerb,
  type RunMode,
} from '../../lib/executions-api';
import { executionActionsFor, type ExecutionAction } from '../../lib/execution-permissions';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { useApplyExecution } from '../../lib/use-execution-cache';
import { ActionError } from '../action-error';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notifySuccess } from '../../lib/notify';

const TRANSITION_BUTTONS: { action: ExecutionAction; verb: LifecycleVerb; label: string }[] = [
  { action: 'markReady', verb: 'mark-ready', label: 'Mark as Ready' },
  { action: 'backToDraft', verb: 'back-to-draft', label: 'Back to Draft' },
  { action: 'pause', verb: 'pause', label: 'Pause' },
  { action: 'resume', verb: 'resume', label: 'Resume' },
  { action: 'signOff', verb: 'sign-off', label: 'Sign Off' },
];

const TRANSITION_MESSAGES: Record<LifecycleVerb, string> = {
  'mark-ready': 'Execution marked as Ready',
  'back-to-draft': 'Execution moved back to Draft',
  'run-all': 'Execution started',
  pause: 'Execution paused',
  resume: 'Execution resumed',
  'sign-off': 'Execution signed off',
};

export interface LifecycleActionsProps {
  projectId: string;
  execution: Execution;
  role: ProjectRole | null;
  onEdit: () => void;
  onDeleted: () => void;
}

/** The status- and role-appropriate actions (PRD §6.3.4); refusals show the API's reason. */
export function LifecycleActions({ projectId, execution, role, onEdit, onDeleted }: LifecycleActionsProps) {
  const apiClient = useApiClient();
  const applyExecution = useApplyExecution(projectId);
  const [dialog, setDialog] = useState<'runAll' | 'delete' | null>(null);
  const actions = executionActionsFor(execution.status, role);

  const transition = useMutation({
    mutationFn: ({ verb, mode }: { verb: LifecycleVerb; mode?: RunMode }) =>
      transitionExecution(apiClient, projectId, execution.id, verb, mode),
    onSuccess: (updated, { verb }) => {
      notifySuccess(TRANSITION_MESSAGES[verb]);
      applyExecution(updated);
      setDialog(null);
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteExecution(apiClient, projectId, execution.id),
    onSuccess: () => {
      notifySuccess('Execution deleted');
      setDialog(null);
      onDeleted();
    },
  });

  if (actions.length === 0) {
    return null;
  }

  return (
    <>
      {actions.includes('edit') && (
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          Edit
        </Button>
      )}
      {TRANSITION_BUTTONS.filter((button) => actions.includes(button.action)).map((button) => (
        <Button
          key={button.action}
          type="button"
          size="sm"
          variant={button.action === 'backToDraft' ? 'outline' : 'default'}
          disabled={transition.isPending}
          onClick={() => transition.mutate({ verb: button.verb })}
        >
          {button.label}
        </Button>
      ))}
      {actions.includes('runAll') && (
        <Button type="button" size="sm" onClick={() => setDialog('runAll')}>
          Run All
        </Button>
      )}
      {actions.includes('delete') && (
        <Button type="button" size="sm" variant="destructive" onClick={() => setDialog('delete')}>
          Delete
        </Button>
      )}
      {!dialog && transition.error && (
        <div className="basis-full">
          <ActionError error={transition.error} />
        </div>
      )}

      <Dialog open={dialog === 'runAll'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run all test cases</DialogTitle>
            <DialogDescription>Choose how this execution runs.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 text-sm">
            <p>
              <strong>Manual</strong>: testers record each run&apos;s outcome themselves from the run panel.
            </p>
            <p className="text-muted-foreground">
              <strong>Automated</strong>: currently unavailable while the automation engine is rebuilt.
            </p>
          </div>
          {transition.error && <ActionError error={transition.error} />}
          <DialogFooter>
            <Button type="button" variant="outline" disabled>
              Automated (unavailable)
            </Button>
            <Button
              type="button"
              disabled={transition.isPending}
              onClick={() => transition.mutate({ verb: 'run-all', mode: 'Manual' })}
            >
              Run manually
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'delete'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete execution?</DialogTitle>
            <DialogDescription>&ldquo;{execution.name}&rdquo; will be moved to the trash.</DialogDescription>
          </DialogHeader>
          {remove.error && <ActionError error={remove.error} />}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
