'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import { setRunOutcome, type Execution, type RecordableOutcome } from '../../lib/executions-api';
import { canRecordOutcome } from '../../lib/execution-permissions';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { useApplyExecution } from '../../lib/use-execution-cache';
import { ActionError } from '../action-error';
import { OUTCOME_LABELS, OutcomeBadge } from './status-badge';
import { RunBugs } from './run-bugs';
import { bugKeys } from '../../lib/bugs-api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { GherkinView } from '../gherkin-view';
import { notifySuccess } from '../../lib/notify';

const OUTCOMES: RecordableOutcome[] = ['Pass', 'Fail', 'NeedsReview'];

export interface RunPanelProps {
  projectId: string;
  execution: Execution;
  runId: string | null;
  role: ProjectRole | null;
  onClose: () => void;
}

/** Run detail side panel: the (snapshotted) test case and, when allowed, the outcome control. */
export function RunPanel({ projectId, execution, runId, role, onClose }: RunPanelProps) {
  const apiClient = useApiClient();
  const applyExecution = useApplyExecution(projectId);
  const queryClient = useQueryClient();
  const run = execution.runs?.find((candidate) => candidate.id === runId) ?? null;
  const editable = canRecordOutcome(execution.status, role);

  const record = useMutation({
    mutationFn: (outcome: RecordableOutcome) => setRunOutcome(apiClient, projectId, execution.id, runId!, outcome),
    onSuccess: (updated, outcome) => {
      notifySuccess(`Outcome recorded: ${OUTCOME_LABELS[outcome]}`);
      applyExecution(updated);
      // Setting Fail may auto-create a bug (ADR 0013), so refresh bug lists too.
      queryClient.invalidateQueries({ queryKey: bugKeys.all(projectId) });
    },
  });

  return (
    <Sheet open={run !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg">
        {run && (
          <>
            <SheetHeader>
              <SheetTitle>
                #{run.position} {run.testCaseName ?? 'Unknown test case'}
              </SheetTitle>
              <SheetDescription>
                {run.testCaseDeleted ? 'This test case has since been deleted.' : 'Test case for this run.'}
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 px-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Status</span>
                <OutcomeBadge outcome={run.outcome} />
              </div>
              {run.gherkinScript ? (
                <GherkinView script={run.gherkinScript} />
              ) : (
                <p className="text-sm text-muted-foreground">Manual test case — no Gherkin script.</p>
              )}
              {editable && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Set outcome</span>
                  <div className="flex gap-2" role="group" aria-label="Set outcome">
                    {OUTCOMES.map((outcome) => (
                      <Button
                        key={outcome}
                        type="button"
                        size="sm"
                        variant={run.outcome === outcome ? 'default' : 'outline'}
                        aria-pressed={run.outcome === outcome}
                        disabled={record.isPending}
                        onClick={() => record.mutate(outcome)}
                      >
                        {OUTCOME_LABELS[outcome]}
                      </Button>
                    ))}
                  </div>
                  <ActionError error={record.error} />
                </div>
              )}
              <RunBugs projectId={projectId} execution={execution} run={run} role={role} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
