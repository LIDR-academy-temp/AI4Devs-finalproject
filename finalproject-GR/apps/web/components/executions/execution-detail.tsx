'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import { useApiClient } from '../../lib/api-client';
import { executionKeys, getExecution, moveRun, type Execution } from '../../lib/executions-api';
import { canReorderRuns } from '../../lib/execution-permissions';
import { useApplyExecution } from '../../lib/use-execution-cache';
import { notifySuccess } from '../../lib/notify';
import { ActionError } from '../action-error';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { ExecutionHeader } from './execution-header';
import { LifecycleActions } from './lifecycle-actions';
import { StatsBar, type OutcomeFilter } from './stats-bar';
import { RunsTable } from './runs-table';
import { RunPanel } from './run-panel';
import { EnvironmentPanel } from './environment-panel';
import { ExecutionFormDialog } from './execution-form-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { DetailSkeleton, ErrorState } from '../states';

/** How often a live execution is refetched (spec: at least every 5 seconds). */
export const LIVE_REFETCH_MS = 5_000;

export interface ExecutionDetailProps {
  projectId: string;
  executionId: string;
  role: ProjectRole | null;
  onDeleted: () => void;
}

export function ExecutionDetail({ projectId, executionId, role, onDeleted }: ExecutionDetailProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const applyExecution = useApplyExecution(projectId);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [environmentOpen, setEnvironmentOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const {
    data: execution,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: executionKeys.detail(projectId, executionId),
    queryFn: () => getExecution(apiClient, projectId, executionId),
    // Polling instead of SSE (ADR 0005/0011): only while work is under way.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'InProgress' || status === 'Paused' ? LIVE_REFETCH_MS : false;
    },
  });

  const detailKey = executionKeys.detail(projectId, executionId);
  // Positions are deterministic (renumbered 1..n), so the drop shows at once; the
  // server's response replaces it, and a refusal restores the previous order.
  const reorder = useMutation({
    mutationFn: ({ runId, afterRunId }: { runId: string; afterRunId: string | null }) =>
      moveRun(apiClient, projectId, executionId, runId, afterRunId),
    onMutate: async ({ runId, afterRunId }) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<Execution>(detailKey);
      if (previous?.runs) {
        const from = previous.runs.findIndex((run) => run.id === runId);
        const rest = previous.runs.filter((run) => run.id !== runId);
        const to = afterRunId === null ? 0 : rest.findIndex((run) => run.id === afterRunId) + 1;
        // `to` is the moved run's final index: its place among the other runs.
        const reordered = arrayMove(previous.runs, from, to).map((run, index) => ({ ...run, position: index + 1 }));
        queryClient.setQueryData<Execution>(detailKey, { ...previous, runs: reordered });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },
    onSuccess: (saved) => {
      notifySuccess('Run order updated');
      applyExecution(saved);
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }
  if (isError || !execution) {
    return (
      <ErrorState message="This execution could not be loaded. It may have been deleted." onRetry={() => refetch()} />
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <ExecutionHeader
          execution={execution}
          onOpenEnvironment={() => setEnvironmentOpen(true)}
          actions={
            <LifecycleActions
              projectId={projectId}
              execution={execution}
              role={role}
              onEdit={() => setEditing(true)}
              onDeleted={onDeleted}
            />
          }
        />
        <StatsBar counts={execution.counts} filter={outcomeFilter} onFilterChange={setOutcomeFilter} />
        <RunsTable
          runs={execution.runs ?? []}
          filter={outcomeFilter}
          onSelectRun={setSelectedRunId}
          reorderable={canReorderRuns(execution.status, role) && outcomeFilter === null && !reorder.isPending}
          onMove={(runId, afterRunId) => reorder.mutate({ runId, afterRunId })}
        />
        <ActionError error={reorder.error} />
      </CardContent>

      <RunPanel
        projectId={projectId}
        execution={execution}
        runId={selectedRunId}
        role={role}
        onClose={() => setSelectedRunId(null)}
      />
      {execution.environmentId && (
        <EnvironmentPanel
          projectId={projectId}
          environmentId={execution.environmentId}
          open={environmentOpen}
          role={role}
          onClose={() => setEnvironmentOpen(false)}
        />
      )}
      {execution.status === 'Draft' && (
        <ExecutionFormDialog
          projectId={projectId}
          open={editing}
          onOpenChange={setEditing}
          execution={execution}
          onSaved={() => {}}
        />
      )}
    </Card>
  );
}
