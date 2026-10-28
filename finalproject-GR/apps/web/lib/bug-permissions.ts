import type { ExecutionStatus } from './executions-api';
import type { ProjectRole } from './test-case-permissions';

const isContributorOrAbove = (role: ProjectRole | null) => role === 'Contributor' || role === 'Admin';

/** Contributors file and update bugs (PRD §3.2); any status may change to any other (ADR 0013). */
export function canEditBug(role: ProjectRole | null): boolean {
  return isContributorOrAbove(role);
}

/** Deleting is Admin-only, as everywhere in the product. */
export function canDeleteBug(role: ProjectRole | null): boolean {
  return role === 'Admin';
}

/** A run only carries a snapshot once its execution has started (ADR 0013 decision 3). */
export function canFileBugFromRun(status: ExecutionStatus, role: ProjectRole | null): boolean {
  return isContributorOrAbove(role) && status !== 'Draft' && status !== 'Ready';
}
