import type { ExecutionStatus } from './executions-api';
import type { ProjectRole } from './test-case-permissions';

export type ExecutionAction = 'edit' | 'markReady' | 'delete' | 'backToDraft' | 'runAll' | 'pause' | 'resume' | 'signOff';

/**
 * Which actions each status offers (PRD §6.3.4, minus deferred Cancel/Try Again), and
 * the minimum role for each. Mirrors the API's transition table
 * (apps/api/src/executions/execution-lifecycle.ts) and ADR 0012 — the API stays the
 * authority, so a drifted entry shows up as a 409/403 the screen displays.
 */
const ACTIONS_BY_STATUS: Record<ExecutionStatus, ExecutionAction[]> = {
  Draft: ['edit', 'markReady', 'delete'],
  Ready: ['backToDraft', 'runAll'],
  InProgress: ['pause'],
  Paused: ['resume'],
  Completed: ['signOff'],
  Done: [],
  Canceled: [],
};

const ADMIN_ONLY: ExecutionAction[] = ['delete', 'signOff'];

const isContributorOrAbove = (role: ProjectRole | null) => role === 'Contributor' || role === 'Admin';

export function executionActionsFor(status: ExecutionStatus, role: ProjectRole | null): ExecutionAction[] {
  if (!isContributorOrAbove(role)) {
    return [];
  }
  return ACTIONS_BY_STATUS[status].filter((action) => role === 'Admin' || !ADMIN_ONLY.includes(action));
}

export function canCreateExecution(role: ProjectRole | null): boolean {
  return isContributorOrAbove(role);
}

/** Outcomes are recordable while In Progress or Completed (ADR 0012 decision 2). */
export function canRecordOutcome(status: ExecutionStatus, role: ProjectRole | null): boolean {
  return isContributorOrAbove(role) && (status === 'InProgress' || status === 'Completed');
}

/** Runs are reorderable only while Draft (PRD §6.3.3), by Contributors and Admins. */
export function canReorderRuns(status: ExecutionStatus, role: ProjectRole | null): boolean {
  return isContributorOrAbove(role) && status === 'Draft';
}
