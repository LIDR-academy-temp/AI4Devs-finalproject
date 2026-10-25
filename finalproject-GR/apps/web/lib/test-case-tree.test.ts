import { describe, expect, it } from 'vitest';
import {
  breadcrumb,
  buildTree,
  filterTree,
  findNode,
  flattenVisible,
  folderCheckState,
  folderCounts,
  pickableIds,
  resolveDrop,
  toggleFolder,
  type FolderNode,
} from './test-case-tree';
import type { Folder } from './folders-api';
import type { TestCase } from './test-cases-api';

const folder = (id: string, name: string, parentFolderId: string | null, positionKey: string): Folder => ({
  id,
  name,
  parentFolderId,
  positionKey,
});
const tc = (id: string, name: string, folderId: string | null, positionKey: string, status: TestCase['status'] = 'Ready'): TestCase => ({
  id,
  name,
  folderId,
  positionKey,
  status,
  gherkinScript: null,
  sourceType: 'Manual',
  lastOutcome: null,
});

// Checkout (c) > Payments (p) > [Pay]; Checkout > [Direct]; Refunds (r); root: Login, Signup
const folders = [folder('r', 'Refunds', null, 'm'), folder('c', 'Checkout', null, 'g'), folder('p', 'Payments', 'c', 'i')];
const cases = [
  tc('signup', 'Signup', null, 'k'),
  tc('login', 'Login', null, 'b'),
  tc('direct', 'Direct', 'c', 'i'),
  tc('pay', 'Pay', 'p', 'i', 'Draft'),
];
const tree = buildTree(folders, cases);
const names = (nodes: { name: string }[]) => nodes.map((n) => n.name);

describe('buildTree', () => {
  it('lists folders before test cases, each by key', () => {
    expect(names(tree)).toEqual(['Checkout', 'Refunds', 'Login', 'Signup']);
    expect(names((tree[0] as FolderNode).children)).toEqual(['Payments', 'Direct']);
  });

  it('puts folders first regardless of keys or creation order', () => {
    const t = buildTree([folder('x', 'Zed', null, 'z')], [tc('a', 'Aardvark', null, '0001')]);
    expect(names(t)).toEqual(['Zed', 'Aardvark']);
  });

  it('breaks key ties by id', () => {
    const t = buildTree([], [tc('b', 'B', null, 'i'), tc('a', 'A', null, 'i')]);
    expect(names(t)).toEqual(['A', 'B']);
  });

  it('puts items of a missing folder at the root', () => {
    const t = buildTree([], [tc('orphan', 'Orphan', 'gone', 'i')]);
    expect(t[0]).toMatchObject({ name: 'Orphan', parentId: null });
  });
});

describe('flattenVisible', () => {
  it('includes children of expanded folders only, with depth', () => {
    const rows = flattenVisible(tree, new Set(['c']));
    expect(rows.map((r) => [r.node.name, r.depth])).toEqual([
      ['Checkout', 0],
      ['Payments', 1],
      ['Direct', 1],
      ['Refunds', 0],
      ['Login', 0],
      ['Signup', 0],
    ]);
  });
});

describe('filterTree', () => {
  it('keeps a matching test case with its ancestors, expanded', () => {
    const { nodes, expand } = filterTree(tree, { name: 'pay' });
    // "Payments" matches by name too, so Checkout is kept and expanded.
    expect(names(nodes)).toEqual(['Checkout']);
    expect(expand.has('c')).toBe(true);
    const flat = flattenVisible(nodes, expand).map((r) => r.node.name);
    expect(flat).toContain('Payments');
  });

  it('filters by status, ignoring folder names', () => {
    const { nodes, expand } = filterTree(tree, { status: 'Draft' });
    expect(flattenVisible(nodes, expand).map((r) => r.node.name)).toEqual(['Checkout', 'Payments', 'Pay']);
  });

  it('returns the tree unchanged without filters', () => {
    expect(filterTree(tree, {}).nodes).toBe(tree);
  });

  it('drops folders with no matches', () => {
    expect(names(filterTree(tree, { name: 'login' }).nodes)).toEqual(['Login']);
  });
});

describe('breadcrumb and counts', () => {
  it('builds the path from the root', () => {
    expect(breadcrumb(folders, 'p')).toEqual(['Checkout', 'Payments']);
    expect(breadcrumb(folders, null)).toEqual([]);
  });

  it('counts subfolders, direct and total test cases', () => {
    expect(folderCounts(findNode(tree, 'c') as FolderNode)).toEqual({ subfolders: 1, directTestCases: 1, totalTestCases: 2 });
  });
});

describe('resolveDrop', () => {
  it('reorders a test case after a sibling', () => {
    expect(resolveDrop(tree, 'login', 'signup', 'after')).toEqual({ kind: 'testCase', id: 'login', parentId: null, afterId: 'signup' });
  });

  it('places before the first sibling as first', () => {
    expect(resolveDrop(tree, 'signup', 'login', 'before')).toEqual({ kind: 'testCase', id: 'signup', parentId: null, afterId: null });
  });

  it('moves into a folder, appended after its same-kind children', () => {
    expect(resolveDrop(tree, 'login', 'c', 'into')).toEqual({ kind: 'testCase', id: 'login', parentId: 'c', afterId: 'direct' });
    expect(resolveDrop(tree, 'r', 'c', 'into')).toEqual({ kind: 'folder', id: 'r', parentId: 'c', afterId: 'p' });
  });

  it('treats "into" a test case as "after" it', () => {
    expect(resolveDrop(tree, 'pay', 'login', 'into')).toEqual({ kind: 'testCase', id: 'pay', parentId: null, afterId: 'login' });
  });

  it('a test case dropped near a folder row becomes the first test case of that parent', () => {
    expect(resolveDrop(tree, 'signup', 'r', 'after')).toEqual({ kind: 'testCase', id: 'signup', parentId: null, afterId: null });
  });

  it('a folder dropped near a test case row goes after the last folder of that parent', () => {
    expect(resolveDrop(tree, 'p', 'login', 'before')).toEqual({ kind: 'folder', id: 'p', parentId: null, afterId: 'r' });
  });

  it('returns null for no-op drops', () => {
    expect(resolveDrop(tree, 'signup', 'login', 'after')).toBeNull();
    expect(resolveDrop(tree, 'login', 'login', 'after')).toBeNull();
  });

  it('refuses dropping a folder into itself or its subtree', () => {
    expect(resolveDrop(tree, 'c', 'p', 'into')).toBeNull();
    expect(resolveDrop(tree, 'c', 'pay', 'after')).toBeNull();
  });
});

describe('depth helpers', () => {
  it('reports folder levels and subtree heights', async () => {
    const { folderLevel, subtreeHeight, foldersOnly } = await import('./test-case-tree');
    expect(folderLevel(folders, 'p')).toBe(2);
    expect(folderLevel(folders, null)).toBe(0);
    expect(subtreeHeight(findNode(tree, 'c') as FolderNode)).toBe(2);
    expect(names(foldersOnly(tree))).toEqual(['Checkout', 'Refunds']);
  });
});

describe('picker helpers', () => {
  // Checkout > [Payments > Pay (Draft), Card (Ready), Wallet (Deprecated)], Checkout > Direct; Refunds is empty.
  const pickerTree = buildTree(folders, [
    ...cases,
    tc('card', 'Card', 'p', 'k'),
    tc('wallet', 'Wallet', 'p', 'm', 'Deprecated'),
  ]);
  const checkout = findNode(pickerTree, 'c') as FolderNode;
  const refunds = findNode(pickerTree, 'r') as FolderNode;

  it('pickableIds lists nested Ready test cases in tree order, skipping Draft and Deprecated', () => {
    expect(pickableIds(checkout)).toEqual(['card', 'direct']);
    expect(pickableIds(refunds)).toEqual([]);
  });

  it('folderCheckState reports checked, indeterminate, unchecked and empty', () => {
    expect(folderCheckState(checkout, ['card', 'direct'])).toBe('checked');
    expect(folderCheckState(checkout, ['direct'])).toBe('indeterminate');
    expect(folderCheckState(checkout, ['login'])).toBe('unchecked');
    expect(folderCheckState(refunds, [])).toBe('empty');
  });

  it('checking appends only the missing ids, in tree order', () => {
    expect(toggleFolder(['direct', 'login'], checkout, true)).toEqual(['direct', 'login', 'card']);
  });

  it('unchecking removes the subtree ids and keeps the rest in order', () => {
    expect(toggleFolder(['signup', 'card', 'login', 'direct'], checkout, false)).toEqual(['signup', 'login']);
  });
});
