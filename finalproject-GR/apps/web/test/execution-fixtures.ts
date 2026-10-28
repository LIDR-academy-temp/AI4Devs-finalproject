import type { Execution, Run } from '../lib/executions-api';

/** A complete Execution with sensible defaults, overridable per test. */
export function makeExecution(overrides: Partial<Execution> = {}): Execution {
  return {
    id: 'exec-1',
    name: 'Smoke',
    description: null,
    status: 'Draft',
    environmentId: 'env-1',
    environmentName: 'Staging',
    browser: 'Chromium',
    viewportWidth: 1280,
    viewportHeight: 720,
    locale: 'en-US',
    timezone: 'UTC',
    autoCreateBug: false,
    elapsedMsAccumulated: 0,
    lastResumedAt: null,
    startedAt: null,
    completedAt: null,
    signedOffAt: null,
    signedOffBy: null,
    createdAt: '2026-10-25T09:00:00.000Z',
    updatedAt: '2026-10-25T09:00:00.000Z',
    counts: { total: 0, done: 0, pass: 0, fail: 0, needsReview: 0 },
    now: '2026-10-25T10:00:00.000Z',
    ...overrides,
  };
}

export function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    id: 'run-1',
    position: 1,
    testCaseId: 'tc-1',
    testCaseName: 'Login works',
    gherkinScript: 'Given a user',
    testCaseDeleted: false,
    outcome: 'Pending',
    outcomeUpdatedAt: null,
    ...overrides,
  };
}

/** An execution whose counts are derived from its runs, as the API computes them. */
export function makeExecutionWithRuns(runs: Run[], overrides: Partial<Execution> = {}): Execution {
  const count = (outcome: Run['outcome']) => runs.filter((r) => r.outcome === outcome).length;
  return makeExecution({
    runs,
    counts: {
      total: runs.length,
      done: runs.length - count('Pending'),
      pass: count('Pass'),
      fail: count('Fail'),
      needsReview: count('NeedsReview'),
    },
    ...overrides,
  });
}
