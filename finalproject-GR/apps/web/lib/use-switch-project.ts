'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useApiClient } from './api-client';
import { switchActiveProject } from './projects-api';

/**
 * Makes another project active (ADR 0017), then drops and refetches every cached query
 * so nothing from the previous project lingers, and opens `destination` (Test Cases by
 * default; Workspace Settings' "Settings" opens Project Settings).
 */
export function useSwitchProject() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ projectId }: { projectId: string; destination?: string }) =>
      switchActiveProject(apiClient, projectId),
    onSuccess: async (_, { destination = '/test-cases' }) => {
      await queryClient.resetQueries();
      router.push(destination);
    },
  });
}
