'use client';

import { useSortable } from '@dnd-kit/sortable';
import { ChevronRight, FileText, Folder as FolderIcon, FolderOpen, MoreHorizontal } from 'lucide-react';
import type { DropZone, FlatRow } from '../../lib/test-case-tree';
import { OUTCOME_COLORS, OUTCOME_LABELS } from '../executions/status-badge';
import type { TreeAction, TreeActionItem } from './tree-actions';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';

export interface TreeRowProps {
  row: FlatRow;
  selected: boolean;
  expanded: boolean;
  draggable: boolean;
  /** Some item is being dragged: rows drop their hover styling (only drop targets highlight). */
  dragActive: boolean;
  /** The drop zone currently shown on this row while something is dragged over it. */
  dropZone: DropZone | null;
  actions: TreeActionItem[];
  onSelect: () => void;
  onToggle: () => void;
  onAction: (action: TreeAction) => void;
}

/** One tree item: sortable (dnd-kit), with a right-click menu and a "⋯" menu offering the same actions. */
export function TreeRow({
  row,
  selected,
  expanded,
  draggable,
  dragActive,
  dropZone,
  actions,
  onSelect,
  onToggle,
  onAction,
}: TreeRowProps) {
  const { node, depth } = row;
  // No transform is applied: rows never move while dragging (the drop line shows where
  // the item will land; a DragOverlay follows the pointer). Everything reorders on drop.
  const { attributes, listeners, setNodeRef, isDragging } = useSortable({ id: node.id, disabled: !draggable });
  const isFolder = node.kind === 'folder';
  // Empty folders have nothing to show, so they're never expandable.
  const expandable = isFolder && node.children.length > 0;
  const outcome = node.kind === 'testCase' ? node.testCase.lastOutcome ?? null : null;
  const open = expandable && expanded;
  const Icon = isFolder ? (open ? FolderOpen : FolderIcon) : FileText;

  const content = (
    <div
      ref={setNodeRef}
      style={{ paddingLeft: `${depth * 1.1 + 0.25}rem` }}
      className={cn(
        'group relative flex items-center gap-1 rounded-md pr-1 text-sm',
        selected ? 'bg-muted' : !dragActive && 'hover:bg-muted/60',
        isDragging && 'opacity-40',
        // The drop-inside highlight is for folders only; test cases can't contain anything.
        dropZone === 'into' && isFolder && 'bg-primary/10 ring-2 ring-primary',
      )}
      data-row-id={node.id}
      {...attributes}
      {...listeners}
      // The whole row is the drag handle (focusable via dnd-kit's attributes, so Space /
      // arrows / Space drags by keyboard). It's a treeitem, not dnd-kit's default
      // role="button", because it contains the expand / select / menu buttons.
      role="treeitem"
      aria-selected={selected}
      aria-expanded={expandable ? open : undefined}
      aria-level={depth + 1}
      aria-label={`${isFolder ? 'Folder' : 'Test case'} ${node.name}`}
    >
      {dropZone === 'before' && (
        <span aria-hidden data-testid="drop-line" className="pointer-events-none absolute inset-x-0 -top-px h-0.5 rounded-full bg-primary" />
      )}
      {dropZone === 'after' && (
        <span aria-hidden data-testid="drop-line" className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
      )}
      {expandable ? (
        <button
          type="button"
          aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`}
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
        >
          <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
        </button>
      ) : (
        <span className="size-6 shrink-0" />
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
      >
        <Icon className={cn('size-4 shrink-0', isFolder ? 'text-primary' : 'text-muted-foreground')} />
        <span className="truncate">{node.name}</span>
        {outcome && (
          <span
            role="img"
            aria-label={`Last run: ${OUTCOME_LABELS[outcome]}`}
            className={cn('ml-auto size-2 shrink-0 rounded-full', OUTCOME_COLORS[outcome])}
          />
        )}
      </button>
      {actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${node.name}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="flex size-6 shrink-0 items-center justify-center rounded opacity-0 hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map(({ action, label, icon: ItemIcon, destructive }) => (
              <DropdownMenuItem key={action} variant={destructive ? 'destructive' : 'default'} onSelect={() => onAction(action)}>
                <ItemIcon /> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  if (actions.length === 0) {
    return content;
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{content}</ContextMenuTrigger>
      <ContextMenuContent>
        {actions.map(({ action, label, icon: ItemIcon, destructive }) => (
          <ContextMenuItem key={action} variant={destructive ? 'destructive' : 'default'} onSelect={() => onAction(action)}>
            <ItemIcon /> {label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
