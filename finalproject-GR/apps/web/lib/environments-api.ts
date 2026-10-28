import type { ApiClient } from './api-client';
import type { Browser } from './executions-api';

export interface EnvironmentCredential {
  id: string;
  alias: string;
  email: string;
}

export interface Environment {
  id: string;
  name: string;
  baseUrl: string;
  defaultBrowser: Browser;
  credentials: EnvironmentCredential[];
}

const base = (projectId: string) => `/projects/${projectId}/environments`;

export function listEnvironments(client: ApiClient, projectId: string): Promise<Environment[]> {
  return client.request(base(projectId));
}

export function getEnvironment(client: ApiClient, projectId: string, environmentId: string): Promise<Environment> {
  return client.request(`${base(projectId)}/${environmentId}`);
}

/** Audited, rate-limited reveal (environment-credentials spec). Never cache the result. */
export function revealCredential(
  client: ApiClient,
  projectId: string,
  environmentId: string,
  credentialId: string,
): Promise<{ password: string }> {
  return client.request(`${base(projectId)}/${environmentId}/credentials/${credentialId}/reveal`, { method: 'POST' });
}
