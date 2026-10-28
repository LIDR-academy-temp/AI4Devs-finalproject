import { describe, expect, it } from 'vitest';
import { canCreateExecution, canRecordOutcome, executionActionsFor } from './execution-permissions';
import type { ExecutionStatus } from './executions-api';
import type { ProjectRole } from './test-case-permissions';

const STATUSES: ExecutionStatus[] = ['Draft', 'Ready', 'InProgress', 'Paused', 'Completed', 'Done', 'Canceled'];

const EXPECTED: Record<ProjectRole, Record<ExecutionStatus, string[]>> = {
  Viewer: { Draft: [], Ready: [], InProgress: [], Paused: [], Completed: [], Done: [], Canceled: [] },
  Contributor: {
    Draft: ['edit', 'markReady'],
    Ready: ['backToDraft', 'runAll'],
    InProgress: ['pause'],
    Paused: ['resume'],
    Completed: [],
    Done: [],
    Canceled: [],
  },
  Admin: {
    Draft: ['edit', 'markReady', 'delete'],
    Ready: ['backToDraft', 'runAll'],
    InProgress: ['pause'],
    Paused: ['resume'],
    Completed: ['signOff'],
    Done: [],
    Canceled: [],
  },
};

describe('executionActionsFor', () => {
  for (const role of Object.keys(EXPECTED) as ProjectRole[]) {
    it.each(STATUSES)(`${role} on %s`, (status) => {
      expect(executionActionsFor(status, role)).toEqual(EXPECTED[role][status]);
    });
  }

  it('offers nothing without a role', () => {
    expect(executionActionsFor('Draft', null)).toEqual([]);
  });
});

describe('canCreateExecution', () => {
  it('allows Contributors and Admins only', () => {
    expect([canCreateExecution('Viewer'), canCreateExecution('Contributor'), canCreateExecution('Admin')]).toEqual([
      false,
      true,
      true,
    ]);
  });
});

describe('canRecordOutcome', () => {
  it('allows Contributor+ only while In Progress or Completed', () => {
    const allowed = STATUSES.filter((status) => canRecordOutcome(status, 'Contributor'));
    expect(allowed).toEqual(['InProgress', 'Completed']);
  });

  it('never allows a Viewer', () => {
    expect(STATUSES.some((status) => canRecordOutcome(status, 'Viewer'))).toBe(false);
  });
});
