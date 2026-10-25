import type { ApiClient } from './api-client';
import type { RunOutcome } from './executions-api';

export type TestCaseStatus = 'Draft' | 'Ready' | 'Deprecated';
export type SourceType = 'Gherkin' | 'Manual';

export interface TestCase {
  id: string;
  name: string;
  gherkinScript: string | null;
  status: TestCaseStatus;
  sourceType: SourceType;
  /*
   * Tree placement (folder-tree). Always sent by the API; optional here only so test
   * fixtures that predate the tree can stay minimal (missing = root / no outcome).
   */
  /** null = the root of the tree. */
  folderId?: string | null;
  /** Fractional ordering key among sibling test cases (ADR 0014). */
  positionKey?: string;
  /** Newest recorded run outcome, or null if never run. */
  lastOutcome?: RunOutcome | null;
}

export interface CreateTestCaseInput {
  name: string;
  gherkinScript?: string;
  /** Destination folder; omitted or null = the root. */
  folderId?: string | null;
}

export interface UpdateTestCaseInput {
  name?: string;
  gherkinScript?: string | null;
  status?: TestCaseStatus;
}

export function listTestCases(client: ApiClient, projectId: string): Promise<TestCase[]> {
  return client.request(`/projects/${projectId}/test-cases`);
}

export function getTestCase(client: ApiClient, projectId: string, testCaseId: string): Promise<TestCase> {
  return client.request(`/projects/${projectId}/test-cases/${testCaseId}`);
}

export function createTestCase(client: ApiClient, projectId: string, input: CreateTestCaseInput): Promise<TestCase> {
  return client.request(`/projects/${projectId}/test-cases`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTestCase(
  client: ApiClient,
  projectId: string,
  testCaseId: string,
  input: UpdateTestCaseInput,
): Promise<TestCase> {
  return client.request(`/projects/${projectId}/test-cases/${testCaseId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTestCase(client: ApiClient, projectId: string, testCaseId: string): Promise<void> {
  return client.request(`/projects/${projectId}/test-cases/${testCaseId}`, { method: 'DELETE' });
}

/** Moves a test case to a folder (null = root), after a sibling test case (null = first). */
export function moveTestCase(
  client: ApiClient,
  projectId: string,
  testCaseId: string,
  target: { folderId: string | null; afterId: string | null },
): Promise<TestCase> {
  return client.request(`/projects/${projectId}/test-cases/${testCaseId}/move`, {
    method: 'POST',
    body: JSON.stringify(target),
  });
}
