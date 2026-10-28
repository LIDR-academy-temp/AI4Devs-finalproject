'use client';

import { Settings2, Tags } from 'lucide-react';
import type { Tag } from '../../lib/tags-api';
import { TAG_COLOR_CLASSES } from './tag-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface TagFilterProps {
  tags: Tag[];
  selectedIds: readonly string[];
  onChange: (tagIds: string[]) => void;
  /** Opens the Manage tags dialog; omitted = no Manage action (e.g. executions carry no tags). */
  onManage?: () => void;
}

/** Multi-select tag filter (ADR 0016 decision 7: any of the picked tags). */
export function TagFilter({ tags, selectedIds, onChange, onManage }: TagFilterProps) {
  const toggle = (tagId: string, checked: boolean) =>
    onChange(checked ? [...selectedIds, tagId] : selectedIds.filter((id) => id !== tagId));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" aria-label="Filter by tags" className="w-full justify-start">
          <Tags /> {selectedIds.length > 0 ? `Tags (${selectedIds.length})` : 'Tags'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="end">
        {tags.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">No tags yet.</p>
        ) : (
          <ul aria-label="Tags" className="flex max-h-64 flex-col overflow-y-auto">
            {tags.map((tag) => (
              <li key={tag.id}>
                {/* The whole row toggles the tag. */}
                <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                  <Checkbox
                    className="after:hidden"
                    checked={selectedIds.includes(tag.id)}
                    onCheckedChange={(checked) => toggle(tag.id, checked === true)}
                  />
                  <span className={cn('size-2.5 shrink-0 rounded-full', TAG_COLOR_CLASSES[tag.color].swatch)} />
                  <span className="flex-1 truncate">{tag.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex gap-1 border-t pt-2">
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange([])} disabled={selectedIds.length === 0}>
            Clear
          </Button>
          {onManage && (
            <Button type="button" size="sm" variant="ghost" className="ml-auto" onClick={onManage}>
              <Settings2 /> Manage tags…
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
