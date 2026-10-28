import type { ComponentType } from 'react';
import { FilePlus2, FolderInput, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import type { TreeNode } from '../../lib/test-case-tree';

/** What a tree item's actions menu (or the folder summary) can ask the screen to do. */
export type TreeAction = 'newFolder' | 'newTestCase' | 'rename' | 'move' | 'delete';

export interface TreeActionItem {
  action: TreeAction;
  label: string;
  icon: ComponentType<{ className?: string }>;
  destructive?: boolean;
}

export interface TreePermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * The actions offered for an item (null = the root), per role (test-cases-screen spec):
 * create on folders and the root, rename/move for Contributors+, delete for Admins.
 */
export function actionsFor(node: TreeNode | null, { canEdit, canDelete }: TreePermissions): TreeActionItem[] {
  if (!canEdit) {
    return [];
  }
  const items: TreeActionItem[] = [];
  if (node === null || node.kind === 'folder') {
    items.push({ action: 'newFolder', label: 'New folder here', icon: FolderPlus });
    items.push({ action: 'newTestCase', label: 'New test case here', icon: FilePlus2 });
  }
  if (node !== null) {
    if (node.kind === 'folder') {
      items.push({ action: 'rename', label: 'Rename', icon: Pencil });
    }
    items.push({ action: 'move', label: 'Move to…', icon: FolderInput });
    if (canDelete) {
      items.push({ action: 'delete', label: 'Delete', icon: Trash2, destructive: true });
    }
  }
  return items;
}
