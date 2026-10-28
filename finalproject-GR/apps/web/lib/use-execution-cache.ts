'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { executionKeys, type Execution } from './executions-api';

/**
 * Every execution mutation returns the full execution, so the user's own change is
 * written straight into the detail cache (shows instantly, no refetch) and the list —
 * whose counts and order may have changed — is invalidated.
 */
export function useApplyExecution(projectId: string): (execution: Execution) => void {
  const queryClient = useQueryClient();
  return useCallback(
    (execution: Execution) => {
      queryClient.setQueryData(executionKeys.detail(projectId, execution.id), execution);
      queryClient.invalidateQueries({ queryKey: executionKeys.list(projectId), exact: true });
    },
    [queryClient, projectId],
  );
}
