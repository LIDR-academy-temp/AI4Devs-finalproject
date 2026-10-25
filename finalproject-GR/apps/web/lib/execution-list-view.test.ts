import { describe, expect, it } from 'vitest';
import { filterExecutions, sortExecutions } from './execution-list-view';
import { makeExecution } from '../test/execution-fixtures';

const a = makeExecution({ id: 'a', name: 'Smoke suite', status: 'Done', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z', browser: 'Firefox', environmentName: 'Staging' });
const b = makeExecution({ id: 'b', name: 'Regression', status: 'InProgress', createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z', browser: 'Chromium', environmentName: null });
const c = makeExecution({ id: 'c', name: 'smoke nightly', status: 'Draft', createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z', browser: 'Chromium', environmentId: null, environmentName: 'Old env' });
const ids = (list: { id: string }[]) => list.map((e) => e.id);

describe('sortExecutions', () => {
  it('sorts by last updated, newest first', () => {
    expect(ids(sortExecutions([a, b, c], 'updatedAt', 'desc'))).toEqual(['c', 'a', 'b']);
  });

  it('sorts by creation date ascending', () => {
    expect(ids(sortExecutions([a, b, c], 'createdAt', 'asc'))).toEqual(['a', 'c', 'b']);
  });

  it('sorts by status in lifecycle order, both directions', () => {
    expect(ids(sortExecutions([a, b, c], 'status', 'asc'))).toEqual(['c', 'b', 'a']);
    expect(ids(sortExecutions([a, b, c], 'status', 'desc'))).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const list = [a, b, c];
    sortExecutions(list, 'createdAt', 'asc');
    expect(ids(list)).toEqual(['a', 'b', 'c']);
  });
});

describe('filterExecutions', () => {
  it('matches name text case-insensitively', () => {
    expect(ids(filterExecutions([a, b, c], { name: 'SMOKE' }))).toEqual(['a', 'c']);
  });

  it('combines status and name', () => {
    expect(ids(filterExecutions([a, b, c], { name: 'smoke', status: 'Draft' }))).toEqual(['c']);
  });

  it('filters by browser', () => {
    expect(ids(filterExecutions([a, b, c], { browser: 'Chromium' }))).toEqual(['b', 'c']);
  });

  it("filters by a deleted environment's kept name", () => {
    expect(ids(filterExecutions([a, b, c], { environmentName: 'Old env' }))).toEqual(['c']);
  });

  it('returns everything with no filters', () => {
    expect(ids(filterExecutions([a, b, c], {}))).toEqual(['a', 'b', 'c']);
  });
});
