import type { ApiClient } from './api-client';

/** Mirrors the API's FolderResponse (apps/api/src/folders/folder-queries.ts). */
export interface Folder {
  id: string;
  /** null = a root folder. */
  parentFolderId: string | null;
  name: string;
  /** Fractional ordering key among sibling folders (ADR 0014). */
  positionKey: string;
}

const base = (projectId: string) => `/projects/${projectId}/folders`;

export function listFolders(client: ApiClient, projectId: string): Promise<Folder[]> {
  return client.request(base(projectId));
}

export function createFolder(
  client: ApiClient,
  projectId: string,
  input: { name: string; parentFolderId: string | null },
): Promise<Folder> {
  return client.request(base(projectId), { method: 'POST', body: JSON.stringify(input) });
}

export function renameFolder(client: ApiClient, projectId: string, folderId: string, name: string): Promise<Folder> {
  return client.request(`${base(projectId)}/${folderId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}

/** Moves a folder under a parent (null = root), after a sibling folder (null = first). */
export function moveFolder(
  client: ApiClient,
  projectId: string,
  folderId: string,
  target: { parentFolderId: string | null; afterId: string | null },
): Promise<Folder> {
  return client.request(`${base(projectId)}/${folderId}/move`, { method: 'POST', body: JSON.stringify(target) });
}

export function folderDeleteImpact(
  client: ApiClient,
  projectId: string,
  folderId: string,
): Promise<{ folders: number; testCases: number }> {
  return client.request(`${base(projectId)}/${folderId}/delete-impact`);
}

export function deleteFolder(client: ApiClient, projectId: string, folderId: string): Promise<void> {
  return client.request(`${base(projectId)}/${folderId}`, { method: 'DELETE' });
}

export const folderKeys = {
  list: (projectId: string) => ['projects', projectId, 'folders'] as const,
};
