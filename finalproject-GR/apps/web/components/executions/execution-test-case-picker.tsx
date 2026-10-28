'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, FileText, Folder as FolderIcon } from 'lucide-react';
import { useApiClient } from '../../lib/api-client';
import { folderKeys, listFolders } from '../../lib/folders-api';
import { listTestCases } from '../../lib/test-cases-api';
import {
  buildTree,
  filterTree,
  findNode,
  flattenVisible,
  folderCheckState,
  toggleFolder,
  type FlatRow,
} from '../../lib/test-case-tree';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ExecutionTestCasePickerProps {
  projectId: string;
  /** Selected test case ids, in run order. */
  selected: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Folder-tree picker for the execution form (PRD §7.2). Only Ready test cases can be
 * checked; checking a folder picks every Ready test case under it, in tree order.
 */
export function ExecutionTestCasePicker({ projectId, selected, onChange }: ExecutionTestCasePickerProps) {
  const apiClient = useApiClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [nameFilter, setNameFilter] = useState('');
  const [seeded, setSeeded] = useState(false);

  const foldersQuery = useQuery({ queryKey: folderKeys.list(projectId), queryFn: () => listFolders(apiClient, projectId) });
  const testCasesQuery = useQuery({
    queryKey: ['projects', projectId, 'test-cases'],
    queryFn: () => listTestCases(apiClient, projectId),
  });

  const tree = useMemo(
    () => buildTree(foldersQuery.data ?? [], testCasesQuery.data ?? []),
    [foldersQuery.data, testCasesQuery.data],
  );
  const filtered = useMemo(() => filterTree(tree, { name: nameFilter }), [tree, nameFilter]);
  const visibleExpanded = useMemo(() => new Set([...expanded, ...filtered.expand]), [expanded, filtered.expand]);
  const rows = useMemo(() => flattenVisible(filtered.nodes, visibleExpanded), [filtered.nodes, visibleExpanded]);

  // Once loaded, open the folders above what's already selected (edit, or Run on a test case).
  useEffect(() => {
    if (seeded || !foldersQuery.data || !testCasesQuery.data) {
      return;
    }
    const open = new Set<string>();
    for (const id of selected) {
      let parentId = findNode(tree, id)?.parentId ?? null;
      while (parentId) {
        open.add(parentId);
        parentId = findNode(tree, parentId)?.parentId ?? null;
      }
    }
    setExpanded(open);
    setSeeded(true);
  }, [seeded, foldersQuery.data, testCasesQuery.data, tree, selected]);

  const toggleExpanded = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (foldersQuery.isLoading || testCasesQuery.isLoading) {
    return <p className="p-2 text-sm text-muted-foreground">Loading test cases…</p>;
  }
  if (foldersQuery.isError || testCasesQuery.isError) {
    return <p className="p-2 text-sm text-destructive">Test cases could not be loaded.</p>;
  }
  if (!(testCasesQuery.data ?? []).some((testCase) => testCase.status === 'Ready')) {
    return <p className="p-2 text-sm text-muted-foreground">No Ready test cases. Mark a test case Ready to run it.</p>;
  }

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Input
        aria-label="Filter test cases"
        placeholder="Filter by name"
        value={nameFilter}
        onChange={(event) => setNameFilter(event.target.value)}
      />
      <div role="tree" aria-label="Test cases" className="flex max-h-72 flex-col overflow-y-auto">
        {rows.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">No test cases match.</p>
        ) : (
          rows.map((row) => (
            <PickerRow
              key={row.node.id}
              row={row}
              selected={selected}
              expanded={visibleExpanded.has(row.node.id)}
              onToggleExpanded={() => toggleExpanded(row.node.id)}
              onChange={onChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

// The shared Checkbox's enlarged hit area (after:-inset-x-3) overlapped the expand
// chevron; here the whole row is the hit area instead.
const CHECKBOX_CLASS = 'after:hidden';

interface PickerRowProps {
  row: FlatRow;
  selected: string[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onChange: (ids: string[]) => void;
}

function PickerRow({ row, selected, expanded, onToggleExpanded, onChange }: PickerRowProps) {
  const { node, depth } = row;
  const inputId = `pick-${node.id}`;
  const isFolder = node.kind === 'folder';
  const expandable = isFolder && node.children.length > 0;

  let checkbox;
  let disabled: boolean;
  let status: string | null;
  if (node.kind === 'folder') {
    const state = folderCheckState(node, selected);
    disabled = state === 'empty';
    // Nothing under it could ever be picked; say so instead of leaving a dead checkbox.
    status = disabled ? 'No Ready test cases' : null;
    checkbox = (
      <Checkbox
        id={inputId}
        checked={state === 'checked' ? true : state === 'indeterminate' ? 'indeterminate' : false}
        disabled={disabled}
        className={CHECKBOX_CLASS}
        onCheckedChange={() => onChange(toggleFolder(selected, node, state !== 'checked'))}
      />
    );
  } else {
    const ready = node.testCase.status === 'Ready';
    status = ready ? null : node.testCase.status;
    const checked = selected.includes(node.id);
    disabled = !ready;
    checkbox = (
      <Checkbox
        id={inputId}
        checked={checked}
        disabled={disabled}
        className={CHECKBOX_CLASS}
        onCheckedChange={(value) =>
          onChange(value === true ? [...selected, node.id] : selected.filter((id) => id !== node.id))
        }
      />
    );
  }

  const Icon = isFolder ? FolderIcon : FileText;
  return (
    <div
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={expandable ? expanded : undefined}
      aria-selected={false}
      className="flex items-center gap-1.5 rounded px-1 py-0.5 text-sm hover:bg-muted/60"
      style={{ paddingLeft: `${depth * 1.1 + 0.25}rem` }}
    >
      {expandable ? (
        <button
          type="button"
          aria-label={`${expanded ? 'Collapse' : 'Expand'} ${node.name}`}
          onClick={onToggleExpanded}
          className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-muted"
        >
          <ChevronRight className={cn('size-4 transition-transform', expanded && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}
      {/* The whole row (checkbox, icon, name) is one label, so clicking anywhere toggles it. */}
      <label
        htmlFor={inputId}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-1.5 py-0.5',
          disabled ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer',
        )}
      >
        {checkbox}
        <Icon className={cn('size-4 shrink-0', isFolder ? 'text-primary' : 'text-muted-foreground')} />
        <span className="truncate">{node.name}</span>
      </label>
      {status && (
        <Badge variant="outline" className="ml-auto text-xs">
          {status}
        </Badge>
      )}
    </div>
  );
}
