'use client';

import { Folder as FolderIcon, Home } from 'lucide-react';
import type { FolderNode } from '../../lib/test-case-tree';
import { cn } from '@/lib/utils';

export interface FolderPickerProps {
  /** Folder-only tree (see foldersOnly). */
  folders: FolderNode[];
  /** Selected folder id; null = the root. */
  value: string | null;
  onChange: (folderId: string | null) => void;
  /** Why a folder can't be picked, or null if it can (e.g. itself, a descendant, too deep). */
  disabledReason?: (folder: FolderNode, level: number) => string | null;
  label?: string;
}

/**
 * Pick a destination folder or the root (New Test Case, Move to…). Native radio inputs
 * keep it keyboard- and screen-reader-friendly with no extra component.
 */
export function FolderPicker({ folders, value, onChange, disabledReason, label = 'Destination folder' }: FolderPickerProps) {
  const option = (id: string | null, name: string, level: number, reason: string | null) => (
    <label
      key={id ?? '__root__'}
      className={cn(
        'flex items-center gap-2 rounded px-2 py-1 text-sm',
        reason ? 'cursor-not-allowed text-muted-foreground' : 'cursor-pointer hover:bg-muted',
        value === id && !reason && 'bg-muted font-medium',
      )}
      style={{ paddingLeft: `${level * 1.1 + 0.5}rem` }}
      title={reason ?? undefined}
    >
      <input
        type="radio"
        name="folder-picker"
        className="sr-only"
        checked={value === id}
        disabled={reason !== null}
        onChange={() => onChange(id)}
      />
      {id === null ? <Home className="size-4" /> : <FolderIcon className="size-4 text-primary" />}
      <span className="truncate">{name}</span>
      {reason && <span className="ml-auto text-xs">({reason})</span>}
    </label>
  );

  const walk = (nodes: FolderNode[], level: number): React.ReactNode[] =>
    nodes.flatMap((folder) => [
      option(folder.id, folder.name, level, disabledReason?.(folder, level) ?? null),
      ...walk(folder.children.filter((c): c is FolderNode => c.kind === 'folder'), level + 1),
    ]);

  return (
    <div role="radiogroup" aria-label={label} className="flex max-h-64 flex-col overflow-y-auto rounded-md border p-1">
      {option(null, 'Root (no folder)', 0, null)}
      {walk(folders, 1)}
    </div>
  );
}
