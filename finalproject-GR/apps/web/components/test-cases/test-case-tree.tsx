'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, type SortingStrategy } from '@dnd-kit/sortable';
import { FilePlus2, FileText, Folder as FolderIcon, FolderPlus, ListChecks } from 'lucide-react';
import { useApiClient } from '../../lib/api-client';
import { folderKeys, listFolders, moveFolder } from '../../lib/folders-api';
import { listTestCases, moveTestCase, type TestCaseStatus } from '../../lib/test-cases-api';
import {
  buildTree,
  filterTree,
  findNode,
  flattenVisible,
  resolveDrop,
  type DropTarget,
  type DropZone,
  type TreeNode,
} from '../../lib/test-case-tree';
import { listTags, tagKeys } from '../../lib/tags-api';
import { notifySuccess } from '../../lib/notify';
import { ManageTagsDialog } from '../tags/manage-tags-dialog';
import { TagFilter } from '../tags/tag-filter';
import { ActionError } from '../action-error';
import { EmptyState, ErrorState, ListSkeleton } from '../states';
import { actionsFor, type TreeAction } from './tree-actions';
import { TreeRow } from './tree-row';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type TreeSelection = { kind: 'folder' | 'testCase'; id: string };

const ALL = '__all__';
const STATUSES: TestCaseStatus[] = ['Draft', 'Ready', 'Deprecated'];
const testCasesKey = (projectId: string) => ['projects', projectId, 'test-cases'] as const;
const expandedStorageKey = (projectId: string) => `test-case-tree:expanded:${projectId}`;

/**
 * Keep every row where it is while dragging: no item slides out of the way (which made
 * folders dodge a test case being dropped into them). The drop line shows the target;
 * the tree reorders once the server confirms the move.
 */
const stayInPlace: SortingStrategy = () => null;

export interface TestCaseTreeProps {
  projectId: string;
  selected: TreeSelection | null;
  onSelect: (selection: TreeSelection) => void;
  canCreate: boolean;
  canDelete: boolean;
  /** An action on an item (null = the root), handled by the screen's dialogs. */
  onAction: (action: TreeAction, node: TreeNode | null) => void;
}

/** Pointer zone within the row under the cursor (design.md: 25% / 50% / 25%). */
function zoneFor(pointerY: number, rect: { top: number; height: number }): DropZone {
  const offset = (pointerY - rect.top) / Math.max(rect.height, 1);
  return offset < 0.25 ? 'before' : offset > 0.75 ? 'after' : 'into';
}

/**
 * The Test Cases folder tree (test-cases-screen): folders before test cases, outcome
 * dots, name/status filter, remembered expansion, per-item actions menus, and drag and
 * drop (pointer + keyboard) through dnd-kit (ADR 0014).
 */
export function TestCaseTree({ projectId, selected, onSelect, canCreate, canDelete, onAction }: TestCaseTreeProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestCaseStatus | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [managingTags, setManagingTags] = useState(false);
  const [drop, setDrop] = useState<{ overId: string; zone: DropZone } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const foldersQuery = useQuery({ queryKey: folderKeys.list(projectId), queryFn: () => listFolders(apiClient, projectId) });
  const testCasesQuery = useQuery({ queryKey: testCasesKey(projectId), queryFn: () => listTestCases(apiClient, projectId) });
  const tagsQuery = useQuery({ queryKey: tagKeys.list(projectId), queryFn: () => listTags(apiClient, projectId) });
  const tags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  // A deleted tag drops out of the filter.
  const activeTagFilter = useMemo(() => tagFilter.filter((id) => tags.some((tag) => tag.id === id)), [tagFilter, tags]);

  // Expansion is remembered per browser; restored after mount so SSR markup matches.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(expandedStorageKey(projectId));
      if (stored) setExpanded(new Set(JSON.parse(stored) as string[]));
    } catch {
      // Unavailable storage just means nothing is remembered.
    }
  }, [projectId]);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(expandedStorageKey(projectId), JSON.stringify([...next]));
      } catch {
        // Ignore: remembering is a convenience.
      }
      return next;
    });

  const tree = useMemo(
    () => buildTree(foldersQuery.data ?? [], testCasesQuery.data ?? []),
    [foldersQuery.data, testCasesQuery.data],
  );
  const filtered = useMemo(
    () => filterTree(tree, { name: nameFilter, status: statusFilter, tagIds: activeTagFilter }),
    [tree, nameFilter, statusFilter, activeTagFilter],
  );
  const visibleExpanded = useMemo(() => new Set([...expanded, ...filtered.expand]), [expanded, filtered.expand]);
  const rows = useMemo(() => flattenVisible(filtered.nodes, visibleExpanded), [filtered.nodes, visibleExpanded]);
  const filtering = nameFilter.trim() !== '' || statusFilter !== undefined || activeTagFilter.length > 0;
  const permissions = { canEdit: canCreate, canDelete };

  const move = useMutation({
    mutationFn: (target: DropTarget): Promise<unknown> =>
      target.kind === 'folder'
        ? moveFolder(apiClient, projectId, target.id, { parentFolderId: target.parentId, afterId: target.afterId })
        : moveTestCase(apiClient, projectId, target.id, { folderId: target.parentId, afterId: target.afterId }),
    onSuccess: (_result, target) => {
      notifySuccess(target.kind === 'folder' ? 'Folder moved' : 'Test case moved');
      if (target.parentId) {
        setExpanded((current) => new Set(current).add(target.parentId!));
      }
    },
    // The server is the source of truth for order keys: refetch, never guess.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: folderKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: testCasesKey(projectId) });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const zoneFromEvent = (event: DragMoveEvent | DragEndEvent): DropZone | null => {
    const { over, active, activatorEvent, delta } = event;
    if (!over) return null;
    if ('clientY' in activatorEvent && typeof activatorEvent.clientY === 'number') {
      return zoneFor(activatorEvent.clientY + delta.y, over.rect);
    }
    // Keyboard drags have no pointer: moving down drops after, moving up drops before.
    const from = rows.findIndex((r) => r.node.id === active.id);
    const to = rows.findIndex((r) => r.node.id === over.id);
    return to > from ? 'after' : 'before';
  };

  const onDragMove = (event: DragMoveEvent) => {
    let zone = zoneFromEvent(event);
    // Only folders can be dropped into; over a test case the middle means "after"
    // (as resolveDrop treats it), so show the line, not a drop-inside highlight.
    if (zone === 'into' && event.over && findNode(tree, String(event.over.id))?.kind !== 'folder') {
      zone = 'after';
    }
    setDrop(event.over && zone && event.over.id !== event.active.id ? { overId: String(event.over.id), zone } : null);
  };

  const onDragStart = (event: DragStartEvent) => setDraggingId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    const zone = zoneFromEvent(event);
    setDrop(null);
    setDraggingId(null);
    if (!event.over || !zone) return;
    const target = resolveDrop(tree, String(event.active.id), String(event.over.id), zone);
    if (target) {
      move.mutate(target);
    }
  };

  const isLoading = foldersQuery.isLoading || testCasesQuery.isLoading;
  const isError = foldersQuery.isError || testCasesQuery.isError;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Test Cases</CardTitle>
        {canCreate && (
          <div className="flex gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => onAction('newFolder', null)}>
              <FolderPlus /> New folder
            </Button>
            <Button type="button" size="sm" onClick={() => onAction('newTestCase', null)}>
              <FilePlus2 /> New test case
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-[1fr_9rem_7rem] gap-2">
          <Input
            aria-label="Filter by name"
            placeholder="Filter by name"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
          />
          <Select value={statusFilter ?? ALL} onValueChange={(value) => setStatusFilter(value === ALL ? undefined : (value as TestCaseStatus))}>
            <SelectTrigger aria-label="Filter by status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TagFilter tags={tags} selectedIds={activeTagFilter} onChange={setTagFilter} onManage={() => setManagingTags(true)} />
        </div>
        <ManageTagsDialog
          projectId={projectId}
          open={managingTags}
          onOpenChange={setManagingTags}
          canEdit={canCreate}
          canDelete={canDelete}
        />

        <ActionError error={move.error} />

        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState
            message="Couldn't load test cases."
            onRetry={() => {
              foldersQuery.refetch();
              testCasesQuery.refetch();
            }}
          />
        ) : tree.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No test cases yet."
            description="Create folders for your feature areas, then add test cases to them."
          />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test cases match these filters.</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragMove={onDragMove}
            onDragOver={onDragMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => {
              setDrop(null);
              setDraggingId(null);
            }}
          >
            <SortableContext items={rows.map((r) => r.node.id)} strategy={stayInPlace}>
              <div role="tree" aria-label="Test cases" className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                {rows.map((row) => (
                  <TreeRow
                    key={row.node.id}
                    row={row}
                    selected={selected?.id === row.node.id}
                    expanded={visibleExpanded.has(row.node.id)}
                    // Reordering a filtered view is ambiguous (hidden siblings), so dragging pauses while filtering.
                    draggable={canCreate && !filtering && !move.isPending}
                    dragActive={draggingId !== null}
                    dropZone={drop?.overId === row.node.id ? drop.zone : null}
                    actions={actionsFor(findNode(tree, row.node.id), permissions)}
                    onSelect={() => onSelect({ kind: row.node.kind, id: row.node.id })}
                    onToggle={() => toggle(row.node.id)}
                    onAction={(action) => onAction(action, findNode(tree, row.node.id))}
                  />
                ))}
              </div>
            </SortableContext>
            {/* What follows the pointer while dragging; the original row stays put, faded. */}
            <DragOverlay dropAnimation={null}>
              {draggingId ? <DragGhost node={findNode(tree, draggingId)} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

function DragGhost({ node }: { node: TreeNode | null }) {
  if (!node) return null;
  const Icon = node.kind === 'folder' ? FolderIcon : FileText;
  return (
    <div className="flex w-max max-w-64 items-center gap-2 rounded-md border bg-popover px-2 py-1.5 text-sm shadow-md">
      <Icon className={node.kind === 'folder' ? 'size-4 text-primary' : 'size-4 text-muted-foreground'} />
      <span className="truncate">{node.name}</span>
    </div>
  );
}
