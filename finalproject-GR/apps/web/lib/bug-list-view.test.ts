import { describe, expect, it } from 'vitest';
import { filterBugs, sortBugs } from './bug-list-view';
import { canDeleteBug, canEditBug, canFileBugFromRun } from './bug-permissions';
import { makeBug } from '../test/bug-fixtures';

const a = makeBug({ id: 'a', title: 'Login broken', severity: 'Low', status: 'Closed', createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z' });
const b = makeBug({ id: 'b', title: 'Checkout crash', severity: 'Critical', status: 'Open', createdAt: '2026-10-05T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z' });
const c = makeBug({ id: 'c', title: 'login slow', severity: 'Medium', status: 'InProgress', createdAt: '2026-10-03T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z' });
const ids = (list: { id: string }[]) => list.map((bug) => bug.id);

describe('sortBugs', () => {
  it('sorts by last updated, newest first', () => {
    expect(ids(sortBugs([a, b, c], 'updatedAt', 'desc'))).toEqual(['c', 'a', 'b']);
  });

  it('sorts by creation date ascending', () => {
    expect(ids(sortBugs([a, b, c], 'createdAt', 'asc'))).toEqual(['a', 'c', 'b']);
  });

  it('sorts by status in lifecycle order', () => {
    expect(ids(sortBugs([a, b, c], 'status', 'asc'))).toEqual(['b', 'c', 'a']);
  });

  it('severity descending puts Critical first and Low last', () => {
    expect(ids(sortBugs([a, b, c], 'severity', 'desc'))).toEqual(['b', 'c', 'a']);
    expect(ids(sortBugs([a, b, c], 'severity', 'asc'))).toEqual(['a', 'c', 'b']);
  });
});

describe('filterBugs', () => {
  it('matches title text case-insensitively', () => {
    expect(ids(filterBugs([a, b, c], { title: 'LOGIN' }))).toEqual(['a', 'c']);
  });

  it('filters by status and by severity', () => {
    expect(ids(filterBugs([a, b, c], { status: 'Open' }))).toEqual(['b']);
    expect(ids(filterBugs([a, b, c], { severity: 'Medium' }))).toEqual(['c']);
  });

  it('filters by any of the picked tags, combined with the other filters', () => {
    const tagged = [
      makeBug({ id: 't1', tagIds: ['checkout'], status: 'Open' }),
      makeBug({ id: 't2', tagIds: ['payments'], status: 'Closed' }),
      makeBug({ id: 't3' }),
    ];
    expect(ids(filterBugs(tagged, { tagIds: ['checkout', 'payments'] }))).toEqual(['t1', 't2']);
    expect(ids(filterBugs(tagged, { tagIds: ['checkout', 'payments'], status: 'Closed' }))).toEqual(['t2']);
    expect(ids(filterBugs(tagged, { tagIds: [] }))).toEqual(['t1', 't2', 't3']);
  });

  it('returns everything with no filters', () => {
    expect(ids(filterBugs([a, b, c], {}))).toEqual(['a', 'b', 'c']);
  });
});

describe('bug permissions', () => {
  it('Contributors and Admins edit; only Admins delete', () => {
    expect([canEditBug('Viewer'), canEditBug('Contributor'), canEditBug('Admin')]).toEqual([false, true, true]);
    expect([canDeleteBug('Viewer'), canDeleteBug('Contributor'), canDeleteBug('Admin')]).toEqual([false, false, true]);
  });

  it('filing from a run needs Contributor+ and a started execution', () => {
    expect(canFileBugFromRun('InProgress', 'Contributor')).toBe(true);
    expect(canFileBugFromRun('Done', 'Admin')).toBe(true);
    expect(canFileBugFromRun('Draft', 'Admin')).toBe(false);
    expect(canFileBugFromRun('Ready', 'Contributor')).toBe(false);
    expect(canFileBugFromRun('InProgress', 'Viewer')).toBe(false);
  });
});
