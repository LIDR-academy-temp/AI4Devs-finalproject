'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import {
  createFolder,
  deleteFolder,
  folderDeleteImpact,
  folderKeys,
  moveFolder,
  renameFolder,
} from '../../lib/folders-api';
import { deleteTestCase, moveTestCase } from '../../lib/test-cases-api';
import {
  MAX_FOLDER_DEPTH,
  foldersOnly,
  subtreeHeight,
  subtreeIds,
  type FolderNode,
  type TreeNode,
} from '../../lib/test-case-tree';
import { notifySuccess } from '../../lib/notify';
import { ActionError } from '../action-error';
import { FolderPicker } from './folder-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/** Which tree dialog is open, and on what (set by the tree's menus and the folder summary). */
export type TreeDialog =
  | { type: 'newFolder'; parentId: string | null }
  | { type: 'rename'; node: FolderNode }
  | { type: 'move'; node: TreeNode }
  | { type: 'delete'; node: TreeNode };

export interface TreeDialogsProps {
  projectId: string;
  dialog: TreeDialog | null;
  onClose: () => void;
  tree: TreeNode[];
  /** After a delete, so the screen can clear a selection that no longer exists. */
  onDeleted: (node: TreeNode) => void;
}

const testCasesKey = (projectId: string) => ['projects', projectId, 'test-cases'] as const;

export function TreeDialogs({ projectId, dialog, onClose, tree, onDeleted }: TreeDialogsProps) {
  return (
    <>
      <FolderNameDialog projectId={projectId} dialog={dialog?.type === 'newFolder' || dialog?.type === 'rename' ? dialog : null} onClose={onClose} />
      <MoveDialog projectId={projectId} node={dialog?.type === 'move' ? dialog.node : null} tree={tree} onClose={onClose} />
      <DeleteDialog projectId={projectId} node={dialog?.type === 'delete' ? dialog.node : null} onClose={onClose} onDeleted={onDeleted} />
    </>
  );
}

function FolderNameDialog({
  projectId,
  dialog,
  onClose,
}: {
  projectId: string;
  dialog: Extract<TreeDialog, { type: 'newFolder' | 'rename' }> | null;
  onClose: () => void;
}) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const renaming = dialog?.type === 'rename';

  const save = useMutation({
    mutationFn: (value: string) =>
      dialog?.type === 'rename'
        ? renameFolder(apiClient, projectId, dialog.node.id, value)
        : createFolder(apiClient, projectId, { name: value, parentFolderId: dialog?.type === 'newFolder' ? dialog.parentId : null }),
    onSuccess: () => {
      notifySuccess(renaming ? 'Folder renamed' : 'Folder created');
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      onClose();
    },
  });

  useEffect(() => {
    if (dialog) {
      setName(dialog.type === 'rename' ? dialog.node.name : '');
      save.reset();
    }
    // Reset only when a dialog opens.
  }, [dialog]);

  return (
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{renaming ? 'Rename folder' : 'New folder'}</DialogTitle>
        </DialogHeader>
        <form
          id="folder-name-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) save.mutate(name.trim());
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="folder-name">Folder name</Label>
          <Input id="folder-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          <ActionError error={save.error} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="folder-name-form" disabled={!name.trim() || save.isPending}>
            {renaming ? 'Rename' : 'Create folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({
  projectId,
  node,
  tree,
  onClose,
}: {
  projectId: string;
  node: TreeNode | null;
  tree: TreeNode[];
  onClose: () => void;
}) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (node) setTarget(node.parentId);
  }, [node]);

  const move = useMutation({
    // Move to… appends at the end of the destination's same-kind children.
    mutationFn: async (parentId: string | null): Promise<unknown> => {
      const destination = parentId === null ? tree : (findFolder(tree, parentId)?.children ?? []);
      const siblings = destination.filter((n) => n.kind === node!.kind && n.id !== node!.id);
      const afterId = siblings.length > 0 ? siblings[siblings.length - 1].id : null;
      return node!.kind === 'folder'
        ? moveFolder(apiClient, projectId, node!.id, { parentFolderId: parentId, afterId })
        : moveTestCase(apiClient, projectId, node!.id, { folderId: parentId, afterId });
    },
    onSuccess: () => {
      notifySuccess(node?.kind === 'folder' ? 'Folder moved' : 'Test case moved');
      onClose();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: testCasesKey(projectId) });
    },
  });

  const blocked = node?.kind === 'folder' ? subtreeIds(node) : new Set<string>();
  const height = node?.kind === 'folder' ? subtreeHeight(node) : 0;
  const disabledReason = (folder: FolderNode, level: number): string | null => {
    if (blocked.has(folder.id)) return folder.id === node?.id ? 'this folder' : 'inside it';
    if (node?.kind === 'folder' && level + height > MAX_FOLDER_DEPTH) return 'too deep';
    return null;
  };

  return (
    <Dialog open={node !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move “{node?.name}”</DialogTitle>
          <DialogDescription>Choose where it should go. It's placed last in that folder.</DialogDescription>
        </DialogHeader>
        <FolderPicker folders={foldersOnly(tree)} value={target} onChange={setTarget} disabledReason={disabledReason} />
        <ActionError error={move.error} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={move.isPending || (node !== null && target === node.parentId)}
            onClick={() => move.mutate(target)}
          >
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function findFolder(tree: TreeNode[], id: string): FolderNode | null {
  for (const node of tree) {
    if (node.kind === 'folder') {
      if (node.id === id) return node;
      const found = findFolder(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function DeleteDialog({
  projectId,
  node,
  onClose,
  onDeleted,
}: {
  projectId: string;
  node: TreeNode | null;
  onClose: () => void;
  onDeleted: (node: TreeNode) => void;
}) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const isFolder = node?.kind === 'folder';

  const impact = useQuery({
    queryKey: ['projects', projectId, 'folders', node?.id, 'delete-impact'],
    queryFn: () => folderDeleteImpact(apiClient, projectId, node!.id),
    enabled: isFolder,
    staleTime: 0,
  });

  const remove = useMutation({
    mutationFn: () => (isFolder ? deleteFolder(apiClient, projectId, node!.id) : deleteTestCase(apiClient, projectId, node!.id)),
    onSuccess: () => {
      notifySuccess(isFolder ? 'Folder deleted' : 'Test case deleted');
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: testCasesKey(projectId) });
      onDeleted(node!);
      onClose();
    },
  });

  useEffect(() => {
    if (node) remove.reset();
    // Reset only when a dialog opens.
  }, [node]);

  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;
  const description = isFolder
    ? impact.data
      ? `${plural(impact.data.folders, 'folder')} and ${plural(impact.data.testCases, 'test case')} will be deleted.`
      : 'Counting what this folder contains…'
    : `“${node?.name}” will be deleted.`;

  return (
    <Dialog open={node !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {isFolder ? 'folder' : 'test case'} “{node?.name}”?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ActionError error={remove.error} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={remove.isPending || (isFolder && !impact.data)}
            onClick={() => remove.mutate()}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
