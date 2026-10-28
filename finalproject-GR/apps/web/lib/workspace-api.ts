import type { ApiClient } from './api-client';

export type WorkspaceRole = 'Owner' | 'Collaborator';

export interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}

/** Mirrors the API's WorkspaceProjectsResponse (apps/api/src/workspace/workspace.controller.ts). */
export interface WorkspaceProjects {
  projects: { id: string; name: string; slug: string; testCaseCount: number; executionCount: number }[];
  deleted: {
    id: string;
    name: string;
    deletedAt: string;
    deletedBy: { id: string; displayName: string } | null;
    daysLeft: number;
  }[];
}

export function renameWorkspace(client: ApiClient, input: { name: string }): Promise<Workspace> {
  return client.request('/workspace', { method: 'PATCH', body: JSON.stringify(input) });
}

/** Workspace Owners only: live projects with counts, and the ones in the trash. */
export function getWorkspaceProjects(client: ApiClient): Promise<WorkspaceProjects> {
  return client.request('/workspace/projects');
}

export const workspaceKeys = {
  projects: ['workspace', 'projects'] as const,
};
