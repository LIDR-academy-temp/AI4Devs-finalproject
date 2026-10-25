import type { ApiClient } from './api-client';

export type ExecutionStatus = 'Draft' | 'Ready' | 'InProgress' | 'Paused' | 'Completed' | 'Done' | 'Canceled';
export type RunOutcome = 'Pending' | 'Pass' | 'Fail' | 'NeedsReview';
export type RecordableOutcome = Exclude<RunOutcome, 'Pending'>;
export type Browser = 'Chromium' | 'Firefox' | 'WebKit';
export type RunMode = 'Manual' | 'Automated';

export interface Run {
  id: string;
  position: number;
  testCaseId: string | null;
  /** The snapshot once started; the test case's current values before that. */
  testCaseName: string | null;
  gherkinScript: string | null;
  testCaseDeleted: boolean;
  outcome: RunOutcome;
  outcomeUpdatedAt: string | null;
}

/** Mirrors the API's ExecutionResponse (apps/api/src/executions/execution-queries.ts). */
export interface Execution {
  id: string;
  name: string;
  description: string | null;
  status: ExecutionStatus;
  environmentId: string | null;
  environmentName: string | null;
  browser: Browser;
  viewportWidth: number;
  viewportHeight: number;
  locale: string;
  timezone: string;
  autoCreateBug: boolean;
  elapsedMsAccumulated: number;
  lastResumedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  signedOffAt: string | null;
  signedOffBy: string | null;
  createdAt: string;
  updatedAt: string;
  counts: { total: number; done: number; pass: number; fail: number; needsReview: number };
  /** Server time when the response was built, for clock-skew correction. */
  now: string;
  /** Present on detail responses only. */
  runs?: Run[];
}

export interface ExecutionInput {
  name: string;
  description?: string | null;
  testCaseIds?: string[];
  environmentId?: string | null;
  browser?: Browser;
  viewportWidth?: number;
  viewportHeight?: number;
  locale?: string;
  timezone?: string;
  autoCreateBug?: boolean;
}

/** The lifecycle verbs, as the API's route segments. */
export type LifecycleVerb = 'mark-ready' | 'back-to-draft' | 'run-all' | 'pause' | 'resume' | 'sign-off';

const base = (projectId: string) => `/projects/${projectId}/executions`;

export function listExecutions(client: ApiClient, projectId: string): Promise<Execution[]> {
  return client.request(base(projectId));
}

export function getExecution(client: ApiClient, projectId: string, executionId: string): Promise<Execution> {
  return client.request(`${base(projectId)}/${executionId}`);
}

export function createExecution(client: ApiClient, projectId: string, input: ExecutionInput): Promise<Execution> {
  return client.request(base(projectId), { method: 'POST', body: JSON.stringify(input) });
}

export function updateExecution(
  client: ApiClient,
  projectId: string,
  executionId: string,
  input: Partial<ExecutionInput>,
): Promise<Execution> {
  return client.request(`${base(projectId)}/${executionId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteExecution(client: ApiClient, projectId: string, executionId: string): Promise<void> {
  return client.request(`${base(projectId)}/${executionId}`, { method: 'DELETE' });
}

export function transitionExecution(
  client: ApiClient,
  projectId: string,
  executionId: string,
  verb: LifecycleVerb,
  mode?: RunMode,
): Promise<Execution> {
  return client.request(`${base(projectId)}/${executionId}/${verb}`, {
    method: 'POST',
    ...(mode ? { body: JSON.stringify({ mode }) } : {}),
  });
}

export function setRunOutcome(
  client: ApiClient,
  projectId: string,
  executionId: string,
  runId: string,
  outcome: RecordableOutcome,
): Promise<Execution> {
  return client.request(`${base(projectId)}/${executionId}/runs/${runId}`, {
    method: 'PATCH',
    body: JSON.stringify({ outcome }),
  });
}

/** Moves a Draft execution's run right after `afterRunId` (first when null). */
export function moveRun(
  client: ApiClient,
  projectId: string,
  executionId: string,
  runId: string,
  afterRunId: string | null,
): Promise<Execution> {
  return client.request(`${base(projectId)}/${executionId}/runs/${runId}/move`, {
    method: 'POST',
    body: JSON.stringify({ afterRunId }),
  });
}

/** Query keys mirror the REST paths (frontend-ui-stack convention). */
export const executionKeys = {
  list: (projectId: string) => ['projects', projectId, 'executions'] as const,
  detail: (projectId: string, executionId: string) => ['projects', projectId, 'executions', executionId] as const,
};
