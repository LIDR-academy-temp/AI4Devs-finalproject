import type { ApiClient } from './api-client';
import type { RunOutcome } from './executions-api';

export type BugStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed' | 'WontFix';
export type BugSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

/** Mirrors the API's BugResponse (apps/api/src/bugs/bug-queries.ts). */
export interface Bug {
  id: string;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  description: string | null;
  stepsToReproduce: string | null;
  testCaseNameSnapshot: string | null;
  gherkinSnapshot: string | null;
  failedStep: string | null;
  reporterName: string;
  autoCreated: boolean;
  createdAt: string;
  updatedAt: string;
  run: {
    id: string;
    executionId: string;
    executionName: string;
    position: number;
    outcome: RunOutcome;
    deleted: boolean;
  } | null;
  testCase: { id: string; deleted: boolean } | null;
}

export interface CreateBugInput {
  title: string;
  severity: BugSeverity;
  description?: string | null;
  stepsToReproduce?: string | null;
  testRunId?: string;
  failedStep?: string;
}

export interface UpdateBugInput {
  title?: string;
  severity?: BugSeverity;
  status?: BugStatus;
  description?: string | null;
  stepsToReproduce?: string | null;
}

export const BUG_STATUSES: BugStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed', 'WontFix'];
export const BUG_SEVERITIES: BugSeverity[] = ['Critical', 'High', 'Medium', 'Low'];

export const BUG_STATUS_LABELS: Record<BugStatus, string> = {
  Open: 'Open',
  InProgress: 'In Progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
  WontFix: "Won't Fix",
};

const base = (projectId: string) => `/projects/${projectId}/bugs`;

export function listBugs(client: ApiClient, projectId: string, testRunId?: string): Promise<Bug[]> {
  return client.request(testRunId ? `${base(projectId)}?testRunId=${testRunId}` : base(projectId));
}

export function getBug(client: ApiClient, projectId: string, bugId: string): Promise<Bug> {
  return client.request(`${base(projectId)}/${bugId}`);
}

export function createBug(client: ApiClient, projectId: string, input: CreateBugInput): Promise<Bug> {
  return client.request(base(projectId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateBug(client: ApiClient, projectId: string, bugId: string, input: UpdateBugInput): Promise<Bug> {
  return client.request(`${base(projectId)}/${bugId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteBug(client: ApiClient, projectId: string, bugId: string): Promise<void> {
  return client.request(`${base(projectId)}/${bugId}`, { method: 'DELETE' });
}

export function linkBugToRun(client: ApiClient, projectId: string, bugId: string, testRunId: string): Promise<Bug> {
  return client.request(`${base(projectId)}/${bugId}/link-run`, {
    method: 'POST',
    body: JSON.stringify({ testRunId }),
  });
}

/**
 * Query keys mirror the REST paths. `all` is the prefix of every bug query, so
 * invalidating it refreshes the list, details and per-run lists together.
 */
export const bugKeys = {
  all: (projectId: string) => ['projects', projectId, 'bugs'] as const,
  list: (projectId: string) => ['projects', projectId, 'bugs', 'list'] as const,
  detail: (projectId: string, bugId: string) => ['projects', projectId, 'bugs', 'detail', bugId] as const,
  forRun: (projectId: string, runId: string) => ['projects', projectId, 'bugs', 'run', runId] as const,
};
