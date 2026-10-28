'use client';

import { useState } from 'react';
import { Check, Plus, Tags } from 'lucide-react';
import type { Tag } from '../../lib/tags-api';
import { TAG_COLOR_CLASSES } from './tag-badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface TagPickerProps {
  /** The project's tags. */
  tags: Tag[];
  selectedIds: readonly string[];
  /** The full new set of tag ids, after a tag is toggled or created. */
  onChange: (tagIds: string[]) => void;
  /** Creates a tag from typed text; omitted = the user can't create tags. */
  onCreate?: (name: string) => Promise<Tag>;
  disabled?: boolean;
}

/**
 * Searchable tag picker (ADR 0016 decisions 3 and 6): selecting toggles a tag, and a
 * typed name that matches no tag (ignoring case) can be created on the spot.
 */
export function TagPicker({ tags, selectedIds, onChange, onCreate, disabled = false }: TagPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const query = search.trim();
  const matches = tags.filter((tag) => tag.name.toLowerCase().includes(query.toLowerCase()));
  const exists = tags.some((tag) => tag.name.toLowerCase() === query.toLowerCase());
  const canCreate = onCreate !== undefined && query.length > 0 && !exists;

  const toggle = (tagId: string) =>
    onChange(selectedIds.includes(tagId) ? selectedIds.filter((id) => id !== tagId) : [...selectedIds, tagId]);

  const create = async () => {
    if (!onCreate || creating) return;
    setCreating(true);
    try {
      const created = await onCreate(query);
      onChange([...selectedIds, created.id]);
      setSearch('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled} aria-label="Edit tags">
          <Tags /> Tags
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or create a tag" value={search} onValueChange={setSearch} />
          <CommandList>
            {!canCreate && <CommandEmpty>No tags found.</CommandEmpty>}
            {matches.length > 0 && (
              <CommandGroup>
                {matches.map((tag) => {
                  const selected = selectedIds.includes(tag.id);
                  return (
                    <CommandItem key={tag.id} value={tag.id} onSelect={() => toggle(tag.id)} aria-selected={selected}>
                      <span className={cn('size-2.5 shrink-0 rounded-full', TAG_COLOR_CLASSES[tag.color].swatch)} />
                      <span className="flex-1 truncate">{tag.name}</span>
                      <Check className={cn('size-4', selected ? 'opacity-100' : 'opacity-0')} aria-hidden />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {canCreate && (
              <CommandGroup>
                <CommandItem value="__create__" onSelect={create} disabled={creating}>
                  <Plus /> Create “{query}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
