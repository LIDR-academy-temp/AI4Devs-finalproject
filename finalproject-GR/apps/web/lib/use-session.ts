'use client';

import { useQuery } from '@tanstack/react-query';
import { useApiClient } from './api-client';
import { projectKeys, type ProjectRole } from './projects-api';
import type { WorkspaceRole } from './workspace-api';

interface MeResponse {
  id: string;
  displayName: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole | null;
  projectId: string;
}

interface ProjectResponse {
  id: string;
  name: string;
  slug: string;
  role?: ProjectRole;
}

export interface SessionData {
  workspaceId: string;
  workspaceName: string;
  workspaceRole: WorkspaceRole | null;
  projectId: string;
  projectName: string;
  projectSlug: string;
  role: ProjectRole | null;
}

export interface UseSessionResult {
  data: SessionData | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Composes GET /me and GET /projects/:projectId into the resolved session a
 * component needs: which workspace/project, and the caller's effective role
 * for gating its own controls. role resolves to null if the project response
 * carries none (the access-denied case — web-app-shell spec). Returns the
 * same { data, loading, error } shape frontend-bootstrap's manual-fetch
 * version did, so Shell and other consumers don't need to change.
 */
export function useSession(): UseSessionResult {
  const { request } = useApiClient();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => request<MeResponse>('/me'),
  });

  const projectId = meQuery.data?.projectId;

  const projectQuery = useQuery({
    queryKey: projectKeys.detail(projectId ?? ''),
    queryFn: () => request<ProjectResponse>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
  });

  const error = meQuery.error ?? projectQuery.error;
  if (error) {
    return { data: null, loading: false, error: error instanceof Error ? error : new Error(String(error)) };
  }

  if (meQuery.data && projectQuery.data) {
    return {
      data: {
        workspaceId: meQuery.data.workspaceId,
        workspaceName: meQuery.data.workspaceName,
        workspaceRole: meQuery.data.workspaceRole,
        projectId: meQuery.data.projectId,
        projectName: projectQuery.data.name,
        projectSlug: projectQuery.data.slug,
        role: projectQuery.data.role ?? null,
      },
      loading: false,
      error: null,
    };
  }

  return { data: null, loading: true, error: null };
}
