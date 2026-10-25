'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApiClient } from '../../lib/api-client';
import { useSessionContext } from '../../lib/session-context';
import { testCasePermissionsForRole } from '../../lib/test-case-permissions';
import { folderKeys, listFolders } from '../../lib/folders-api';
import { listTestCases, type TestCase } from '../../lib/test-cases-api';
import { breadcrumb, buildTree, findNode, foldersOnly, type TreeNode } from '../../lib/test-case-tree';
import { TestCaseTree, type TreeSelection } from './test-case-tree';
import { TestCaseDetail } from './test-case-detail';
import { CreateTestCaseForm } from './create-test-case-form';
import { FolderSummary } from './folder-summary';
import { Breadcrumb } from './breadcrumb';
import { TreeDialogs, type TreeDialog } from './tree-dialogs';
import { actionsFor, type TreeAction } from './tree-actions';
import { PageHeader } from '../page-header';
import { ExecutionFormDialog } from '../executions/execution-form-dialog';
import { SELECTED_EXECUTION_PARAM } from '../executions/executions-screen';

/** `?testCase=<id>` (bugs link here) or `?folder=<id>` opens with that item selected. */
function initialSelection(params: URLSearchParams): TreeSelection | null {
  const testCaseId = params.get('testCase');
  if (testCaseId) return { kind: 'testCase', id: testCaseId };
  const folderId = params.get('folder');
  return folderId ? { kind: 'folder', id: folderId } : null;
}

/**
 * The Test Cases screen (test-cases-screen): folder tree on the left; the selected
 * folder's summary, the selected test case (with its breadcrumb), or the create form on
 * the right; and the tree's dialogs. Each piece invalidates its own query keys.
 */
export function TestCasesScreen() {
  const session = useSessionContext();
  const apiClient = useApiClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState<TreeSelection | null>(() => initialSelection(searchParams));
  /** Set while creating a test case: its preselected destination folder (null = root). */
  const [creatingIn, setCreatingIn] = useState<string | null | undefined>(undefined);
  const [dialog, setDialog] = useState<TreeDialog | null>(null);
  const [running, setRunning] = useState<TestCase | null>(null);

  const projectId = session.data?.projectId ?? '';
  const ready = !session.loading && !!session.data;
  // Same keys as the tree's queries, so these are shared from the cache.
  const folders = useQuery({ queryKey: folderKeys.list(projectId), queryFn: () => listFolders(apiClient, projectId), enabled: ready });
  const testCases = useQuery({
    queryKey: ['projects', projectId, 'test-cases'],
    queryFn: () => listTestCases(apiClient, projectId),
    enabled: ready,
  });
  const tree = useMemo(() => buildTree(folders.data ?? [], testCases.data ?? []), [folders.data, testCases.data]);

  if (!ready) {
    return null;
  }

  const permissions = testCasePermissionsForRole(session.data!.role);
  const treePermissions = { canEdit: permissions.canEdit, canDelete: permissions.canDelete };
  const selectedNode = selected ? findNode(tree, selected.id) : null;
  const selectedFolderId = selectedNode?.kind === 'folder' ? selectedNode.id : selectedNode?.parentId ?? null;

  const onAction = (action: TreeAction, node: TreeNode | null) => {
    if (action === 'newTestCase') {
      setCreatingIn(node?.kind === 'folder' ? node.id : node === null ? selectedFolderId : node.parentId);
    } else if (action === 'newFolder') {
      setDialog({ type: 'newFolder', parentId: node?.kind === 'folder' ? node.id : null });
    } else if (action === 'rename' && node?.kind === 'folder') {
      setDialog({ type: 'rename', node });
    } else if ((action === 'move' || action === 'delete') && node) {
      setDialog({ type: action, node });
    }
  };

  const select = (selection: TreeSelection) => {
    setSelected(selection);
    setCreatingIn(undefined);
  };

  return (
    <>
      <PageHeader title="Test Cases" description="Organize test cases into folders and author their scripts." />
      <div className="grid h-[calc(100vh-10rem)] grid-cols-1 gap-4 lg:grid-cols-[24rem_1fr]">
        <TestCaseTree
          projectId={projectId}
          selected={selected}
          onSelect={select}
          canCreate={permissions.canCreate}
          canDelete={permissions.canDelete}
          onAction={onAction}
        />
        <div className="min-h-0 overflow-y-auto">
          {creatingIn !== undefined ? (
            <CreateTestCaseForm
              key={creatingIn ?? 'root'}
              projectId={projectId}
              folders={foldersOnly(tree)}
              initialFolderId={creatingIn}
              onCreated={(testCase) => {
                setCreatingIn(undefined);
                setSelected({ kind: 'testCase', id: testCase.id });
              }}
              onCancel={() => setCreatingIn(undefined)}
            />
          ) : selectedNode?.kind === 'folder' ? (
            <FolderSummary
              folder={selectedNode}
              path={breadcrumb(folders.data ?? [], selectedNode.id)}
              actions={actionsFor(selectedNode, treePermissions)}
              onAction={onAction}
            />
          ) : selected?.kind === 'testCase' ? (
            <div className="flex flex-col gap-2">
              <Breadcrumb path={breadcrumb(folders.data ?? [], selectedNode?.parentId ?? null)} />
              <TestCaseDetail
                projectId={projectId}
                testCaseId={selected.id}
                canEdit={permissions.canEdit}
                canDelete={permissions.canDelete}
                onUpdated={() => {}}
                onDeleted={() => setSelected(null)}
                onRun={permissions.canEdit ? setRunning : undefined}
              />
            </div>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Select a test case to see its details.</p>
          )}
        </div>
      </div>
      <TreeDialogs
        projectId={projectId}
        dialog={dialog}
        onClose={() => setDialog(null)}
        tree={tree}
        onDeleted={(node) => {
          if (selected && (selected.id === node.id || (node.kind === 'folder' && findNode([node], selected.id)))) {
            setSelected(null);
          }
        }}
      />
      {running && (
        <ExecutionFormDialog
          projectId={projectId}
          open
          onOpenChange={(open) => !open && setRunning(null)}
          initialTestCaseIds={[running.id]}
          defaultName={running.name}
          onSaved={(execution) => router.push(`/executions?${SELECTED_EXECUTION_PARAM}=${execution.id}`)}
        />
      )}
    </>
  );
}
