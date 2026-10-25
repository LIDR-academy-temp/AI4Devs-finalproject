import { BUG_SEVERITIES, BUG_STATUSES, type Bug, type BugSeverity, type BugStatus } from './bugs-api';
import type { SortDirection } from './execution-list-view';

export type BugSortKey = 'updatedAt' | 'createdAt' | 'status' | 'severity';

export interface BugFilters {
  title?: string;
  status?: BugStatus;
  severity?: BugSeverity;
}

/**
 * Client-side sort (PRD §6.4.2). Status follows the lifecycle (Open first); severity is
 * ranked so "descending" reads Critical → Low. Returns a new array.
 */
export function sortBugs(list: Bug[], key: BugSortKey, direction: SortDirection): Bug[] {
  const compare = (a: Bug, b: Bug): number => {
    if (key === 'status') {
      return BUG_STATUSES.indexOf(a.status) - BUG_STATUSES.indexOf(b.status);
    }
    if (key === 'severity') {
      // BUG_SEVERITIES is Critical-first, so a higher index means less severe.
      return BUG_SEVERITIES.indexOf(b.severity) - BUG_SEVERITIES.indexOf(a.severity);
    }
    return Date.parse(a[key]) - Date.parse(b[key]);
  };
  const sign = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => sign * compare(a, b));
}

export function filterBugs(list: Bug[], filters: BugFilters): Bug[] {
  const title = filters.title?.trim().toLowerCase();
  return list.filter(
    (bug) =>
      (!title || bug.title.toLowerCase().includes(title)) &&
      (!filters.status || bug.status === filters.status) &&
      (!filters.severity || bug.severity === filters.severity),
  );
}
