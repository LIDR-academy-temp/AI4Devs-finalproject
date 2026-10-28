'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, DragOverlay, closestCenter, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, type SortingStrategy } from '@dnd-kit/sortable';
import { GripVertical, X } from 'lucide-react';
import type { TestCaseStatus } from '../../lib/test-cases-api';
import { dropResult, useListSensors } from '../../lib/sortable-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SelectedItem {
  id: string;
  name: string;
  /** Undefined when the test case is unknown (e.g. no longer listed). */
  status?: TestCaseStatus;
}

export interface SelectedTestCasesProps {
  items: SelectedItem[];
  onChange: (ids: string[]) => void;
}

/**
 * Rows never move while dragging, as in the Test Cases tree: a drop line shows where
 * the item will land and a floating label follows the pointer. The list reorders on drop.
 */
const stayInPlace: SortingStrategy = () => null;

/** The execution form's "Selected" panel: the run order, reorderable by drag (ADR 0014). */
export function SelectedTestCases({ items, onChange }: SelectedTestCasesProps) {
  const sensors = useListSensors();
  const ids = items.map((item) => item.id);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reset = () => {
    setActiveId(null);
    setOverId(null);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    reset();
    const result = over ? dropResult(ids, String(active.id), String(over.id)) : null;
    if (result) {
      onChange(result.ids);
    }
  };

  // Moving down lands after the target row, moving up lands before it.
  const from = activeId ? ids.indexOf(activeId) : -1;
  const to = overId ? ids.indexOf(overId) : -1;
  const dropLine = (id: string): 'before' | 'after' | null =>
    from === -1 || to === -1 || from === to || id !== overId ? null : to > from ? 'after' : 'before';
  const active = items.find((item) => item.id === activeId);

  if (items.length === 0) {
    return <p className="p-2 text-sm text-muted-foreground">No test cases selected yet.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active: started }: DragStartEvent) => setActiveId(String(started.id))}
      onDragOver={({ over }: DragOverEvent) => setOverId(over ? String(over.id) : null)}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
    >
      <SortableContext items={ids} strategy={stayInPlace}>
        <ol aria-label="Selected test cases" className="flex flex-col gap-0.5">
          {items.map((item, index) => (
            <SelectedRow
              key={item.id}
              item={item}
              position={index + 1}
              dropLine={dropLine(item.id)}
              onRemove={() => onChange(ids.filter((id) => id !== item.id))}
            />
          ))}
        </ol>
      </SortableContext>
      {/* Portalled to <body>: the dialog is CSS-transformed, which would make the
          overlay's position: fixed relative to the dialog (far off-screen, and
          stretching the dialog's scroll area) instead of the viewport. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {active && (
              <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-sm shadow-md">
                <GripVertical className="size-4 text-muted-foreground" />
                {active.name}
              </div>
            )}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
}

interface SelectedRowProps {
  item: SelectedItem;
  position: number;
  dropLine: 'before' | 'after' | null;
  onRemove: () => void;
}

function SelectedRow({ item, position, dropLine, onRemove }: SelectedRowProps) {
  // No transform is applied: the row stays where it is until the drop.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      data-sortable-id={item.id}
      className={cn('relative flex items-center gap-2 rounded px-1 py-1 text-sm', isDragging && 'opacity-40')}
    >
      {dropLine && (
        <span
          aria-hidden
          data-testid="drop-line"
          className={cn(
            'pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-primary',
            dropLine === 'before' ? '-top-px' : '-bottom-px',
          )}
        />
      )}
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Reorder ${item.name}`}
        className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="w-6 text-right tabular-nums text-muted-foreground">{position}</span>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {item.status !== 'Ready' && (
        <Badge variant="outline" className="text-xs">
          {item.status ?? 'Unavailable'}
        </Badge>
      )}
      <Button type="button" size="icon" variant="ghost" className="size-6" aria-label={`Remove ${item.name}`} onClick={onRemove}>
        <X className="size-3.5" />
      </Button>
    </li>
  );
}
