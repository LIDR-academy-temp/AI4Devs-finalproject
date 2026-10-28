import type { ApiClient } from './api-client';

export type ProjectRole = 'Viewer' | 'Contributor' | 'Admin';

/** Mirrors the API's ProjectResponse (apps/api/src/projects/projects.controller.ts). */
export interface Project {
  id: string;
  name: string;
  slug: string;
  role: ProjectRole;
}

/** The live projects the caller can access in the active workspace (the switcher). */
export function listProjects(client: ApiClient): Promise<Project[]> {
  return client.request('/projects');
}

/** Workspace Owners only; the slug is derived from the name, once. */
export function createProject(client: ApiClient, input: { name: string }): Promise<Project> {
  return client.request('/projects', { method: 'POST', body: JSON.stringify(input) });
}

export function renameProject(client: ApiClient, projectId: string, input: { name: string }): Promise<Project> {
  return client.request(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

/** Moves the project to the trash (Workspace Owners); the last live project is refused (409). */
export function deleteProject(client: ApiClient, projectId: string): Promise<void> {
  return client.request(`/projects/${projectId}`, { method: 'DELETE' });
}

export function restoreProject(client: ApiClient, projectId: string): Promise<Project> {
  return client.request(`/projects/${projectId}/restore`, { method: 'POST' });
}

/** ADR 0017: the server remembers the active project; switching only updates it. */
export function switchActiveProject(client: ApiClient, projectId: string): Promise<void> {
  return client.request('/me/active-project', { method: 'PUT', body: JSON.stringify({ projectId }) });
}

/**
 * Query keys mirror the REST paths (frontend-ui-stack convention). `list` is a prefix of
 * every project-scoped key, so invalidate it with `exact: true`.
 */
export const projectKeys = {
  list: ['projects'] as const,
  detail: (projectId: string) => ['projects', projectId] as const,
};
