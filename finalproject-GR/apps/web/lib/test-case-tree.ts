import type { Folder } from './folders-api';
import type { TestCase, TestCaseStatus } from './test-cases-api';

/**
 * Pure tree helpers for the Test Cases screen (folder-tree). Within a parent, folders
 * come before test cases, each ordered by their fractional key then id (ADR 0014) —
 * plain string comparison matches the API's COLLATE "C" ordering for these keys.
 */

export interface FolderNode {
  kind: 'folder';
  id: string;
  name: string;
  parentId: string | null;
  children: TreeNode[];
}

export interface TestCaseNode {
  kind: 'testCase';
  id: string;
  name: string;
  parentId: string | null;
  testCase: TestCase;
}

export type TreeNode = FolderNode | TestCaseNode;

const byKey = (a: { positionKey?: string; id: string }, b: { positionKey?: string; id: string }) => {
  const ka = a.positionKey ?? '';
  const kb = b.positionKey ?? '';
  return ka < kb ? -1 : ka > kb ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
};

/** Builds the nested tree. Items whose folder is missing (e.g. just deleted) go to the root. */
export function buildTree(folders: Folder[], testCases: TestCase[]): TreeNode[] {
  const folderIds = new Set(folders.map((f) => f.id));
  const parentOf = (id: string | null | undefined) => (id && folderIds.has(id) ? id : null);
  const nodes = new Map<string, FolderNode>();
  for (const folder of folders) {
    nodes.set(folder.id, { kind: 'folder', id: folder.id, name: folder.name, parentId: parentOf(folder.parentFolderId), children: [] });
  }

  const childrenOf = (parentId: string | null): TreeNode[] => {
    const subfolders = folders
      .filter((f) => parentOf(f.parentFolderId) === parentId)
      .sort(byKey)
      .map((f) => {
        const node = nodes.get(f.id)!;
        node.children = childrenOf(f.id);
        return node;
      });
    const cases: TestCaseNode[] = testCases
      .filter((t) => parentOf(t.folderId) === parentId)
      .sort(byKey)
      .map((t) => ({ kind: 'testCase', id: t.id, name: t.name, parentId, testCase: t }));
    return [...subfolders, ...cases];
  };

  return childrenOf(null);
}

export interface FlatRow {
  node: TreeNode;
  /** 0 for root items. */
  depth: number;
}

/** Visible rows in display order: children of expanded folders only. */
export function flattenVisible(nodes: TreeNode[], expanded: ReadonlySet<string>, depth = 0): FlatRow[] {
  return nodes.flatMap((node) => [
    { node, depth },
    ...(node.kind === 'folder' && expanded.has(node.id) ? flattenVisible(node.children, expanded, depth + 1) : []),
  ]);
}

export interface TreeFilter {
  name?: string;
  status?: TestCaseStatus;
}

/**
 * Keeps matching test cases, folders whose names match (with their whole subtree, when
 * filtering by name only), and the folders above any match. Returns the folders to
 * force-expand so every match is visible.
 */
export function filterTree(nodes: TreeNode[], filter: TreeFilter): { nodes: TreeNode[]; expand: Set<string> } {
  const text = filter.name?.trim().toLowerCase() ?? '';
  const expand = new Set<string>();
  if (!text && !filter.status) {
    return { nodes, expand };
  }
  const nameMatches = (name: string) => !text || name.toLowerCase().includes(text);

  const walk = (list: TreeNode[]): TreeNode[] =>
    list.flatMap((node): TreeNode[] => {
      if (node.kind === 'testCase') {
        const statusOk = !filter.status || node.testCase.status === filter.status;
        return nameMatches(node.name) && statusOk ? [node] : [];
      }
      const children = walk(node.children);
      // A folder matches on its name only when no status filter applies (folders have no
      // status). A matching folder keeps its whole subtree, and still expands when
      // something inside it matches too, so that match is visible.
      if (text && !filter.status && nameMatches(node.name)) {
        if (children.length > 0) expand.add(node.id);
        return [node];
      }
      if (children.length === 0) {
        return [];
      }
      expand.add(node.id);
      return [{ ...node, children }];
    });

  return { nodes: walk(nodes), expand };
}

/** Folder names from the root down to `folderId` (inclusive). */
export function breadcrumb(folders: Folder[], folderId: string | null): string[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const path: string[] = [];
  let current = folderId ? byId.get(folderId) : undefined;
  while (current) {
    path.unshift(current.name);
    current = current.parentFolderId ? byId.get(current.parentFolderId) : undefined;
  }
  return path;
}

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.kind === 'folder') {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function folderCounts(folder: FolderNode): { subfolders: number; directTestCases: number; totalTestCases: number } {
  const total = (node: FolderNode): number =>
    node.children.reduce((sum, child) => sum + (child.kind === 'testCase' ? 1 : total(child)), 0);
  return {
    subfolders: folder.children.filter((c) => c.kind === 'folder').length,
    directTestCases: folder.children.filter((c) => c.kind === 'testCase').length,
    totalTestCases: total(folder),
  };
}

/** Ids of a folder and everything under it. */
export function subtreeIds(node: TreeNode): Set<string> {
  const ids = new Set<string>([node.id]);
  if (node.kind === 'folder') {
    for (const child of node.children) {
      for (const id of subtreeIds(child)) ids.add(id);
    }
  }
  return ids;
}

export type DropZone = 'before' | 'after' | 'into';

export interface DropTarget {
  kind: TreeNode['kind'];
  id: string;
  /** New parent folder; null = root. */
  parentId: string | null;
  /** Same-kind sibling it goes after; null = first. */
  afterId: string | null;
}

function childrenOfParent(tree: TreeNode[], parentId: string | null): TreeNode[] {
  if (parentId === null) return tree;
  const parent = findNode(tree, parentId);
  return parent?.kind === 'folder' ? parent.children : [];
}

/**
 * Turns a drop (dragged `activeId` onto `overId` in `zone`) into an API move, honoring
 * folders-first. Returns null for drops that would change nothing or that put a folder
 * inside itself.
 */
export function resolveDrop(tree: TreeNode[], activeId: string, overId: string, zone: DropZone): DropTarget | null {
  const active = findNode(tree, activeId);
  const over = findNode(tree, overId);
  if (!active || !over || active.id === over.id) {
    return null;
  }

  const into = zone === 'into' && over.kind === 'folder';
  const parentId = into ? over.id : over.parentId;
  if (active.kind === 'folder' && parentId !== null && subtreeIds(active).has(parentId)) {
    return null;
  }

  const sameKind = childrenOfParent(tree, parentId).filter((n) => n.kind === active.kind && n.id !== active.id);
  let afterId: string | null;
  if (into) {
    afterId = sameKind.length > 0 ? sameKind[sameKind.length - 1].id : null;
  } else if (over.kind === active.kind) {
    const index = sameKind.findIndex((n) => n.id === over.id);
    afterId = zone === 'before' ? (index > 0 ? sameKind[index - 1].id : null) : over.id;
  } else if (active.kind === 'testCase') {
    // Near a folder row: test cases start right after the folders.
    afterId = null;
  } else {
    // A folder near a test case row: after the last folder.
    afterId = sameKind.length > 0 ? sameKind[sameKind.length - 1].id : null;
  }

  // No-op: same parent, same predecessor.
  if (parentId === active.parentId) {
    const current = childrenOfParent(tree, parentId).filter((n) => n.kind === active.kind);
    const index = current.findIndex((n) => n.id === active.id);
    const currentAfter = index > 0 ? current[index - 1].id : null;
    if (currentAfter === afterId) {
      return null;
    }
  }

  return { kind: active.kind, id: active.id, parentId, afterId };
}

/** Same limit as the API (PRD §2.3, amended): a root folder is level 1. */
export const MAX_FOLDER_DEPTH = 4;

/** Level of a folder (1 = root folder); 0 for the root itself. */
export function folderLevel(folders: Folder[], folderId: string | null): number {
  return breadcrumb(folders, folderId).length;
}

/** Levels in a folder's subtree, counting itself. */
export function subtreeHeight(node: FolderNode): number {
  const childHeights = node.children.filter((c): c is FolderNode => c.kind === 'folder').map(subtreeHeight);
  return 1 + (childHeights.length > 0 ? Math.max(...childHeights) : 0);
}

/** Folder nodes only, keeping nesting — what folder pickers show. */
export function foldersOnly(nodes: TreeNode[]): FolderNode[] {
  return nodes
    .filter((n): n is FolderNode => n.kind === 'folder')
    .map((n) => ({ ...n, children: foldersOnly(n.children) }));
}

/** Ready test case ids under a node (the node itself if it is one), in tree order. */
export function pickableIds(node: TreeNode): string[] {
  if (node.kind === 'testCase') {
    return node.testCase.status === 'Ready' ? [node.id] : [];
  }
  return node.children.flatMap(pickableIds);
}

/** `empty` = the folder holds no Ready test case, so it can't be checked. */
export type FolderCheckState = 'checked' | 'indeterminate' | 'unchecked' | 'empty';

export function folderCheckState(folder: FolderNode, selected: readonly string[]): FolderCheckState {
  const ids = pickableIds(folder);
  if (ids.length === 0) return 'empty';
  const picked = ids.filter((id) => selected.includes(id)).length;
  return picked === 0 ? 'unchecked' : picked === ids.length ? 'checked' : 'indeterminate';
}

/**
 * Checking appends the folder's not-yet-selected Ready test cases in tree order;
 * unchecking removes all of them. Everything else keeps its order.
 */
export function toggleFolder(selected: readonly string[], folder: FolderNode, checked: boolean): string[] {
  const ids = pickableIds(folder);
  if (checked) {
    return [...selected, ...ids.filter((id) => !selected.includes(id))];
  }
  const remove = new Set(ids);
  return selected.filter((id) => !remove.has(id));
}
