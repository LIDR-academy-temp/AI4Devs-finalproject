import type { Bug } from '../lib/bugs-api';

/** A complete Bug with sensible defaults, overridable per test. */
export function makeBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: 'bug-1',
    title: 'Checkout total is wrong',
    severity: 'Medium',
    status: 'Open',
    description: null,
    stepsToReproduce: null,
    testCaseNameSnapshot: null,
    gherkinSnapshot: null,
    failedStep: null,
    reporterName: 'Test User',
    autoCreated: false,
    createdAt: '2026-10-25T09:00:00.000Z',
    updatedAt: '2026-10-25T09:00:00.000Z',
    run: null,
    testCase: null,
    ...overrides,
  };
}
