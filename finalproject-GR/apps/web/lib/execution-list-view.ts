import type { Browser, Execution, ExecutionStatus } from './executions-api';

export type ExecutionSortKey = 'updatedAt' | 'createdAt' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface ExecutionFilters {
  name?: string;
  status?: ExecutionStatus;
  /** Matches the execution's kept environment name, so deleted environments still filter. */
  environmentName?: string;
  browser?: Browser;
}

/** Lifecycle order, so sorting by status reads Draft → … → Done. */
const STATUS_ORDER: ExecutionStatus[] = ['Draft', 'Ready', 'InProgress', 'Paused', 'Completed', 'Done', 'Canceled'];

/** Client-side sort over the list the API returns (PRD §6.3.2). Returns a new array. */
export function sortExecutions(list: Execution[], key: ExecutionSortKey, direction: SortDirection): Execution[] {
  const compare = (a: Execution, b: Execution): number => {
    if (key === 'status') {
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    }
    return Date.parse(a[key]) - Date.parse(b[key]);
  };
  const sign = direction === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => sign * compare(a, b));
}

export function filterExecutions(list: Execution[], filters: ExecutionFilters): Execution[] {
  const name = filters.name?.trim().toLowerCase();
  return list.filter(
    (execution) =>
      (!name || execution.name.toLowerCase().includes(name)) &&
      (!filters.status || execution.status === filters.status) &&
      (!filters.environmentName || execution.environmentName === filters.environmentName) &&
      (!filters.browser || execution.browser === filters.browser),
  );
}
