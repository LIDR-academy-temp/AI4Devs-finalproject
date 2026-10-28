'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useApiClient } from '../../lib/api-client';
import { deleteTag, listTags, TAG_COLORS, tagKeys, updateTag, type Tag, type TagColor } from '../../lib/tags-api';
import { notifySuccess } from '../../lib/notify';
import { bugKeys } from '../../lib/bugs-api';
import { ActionError } from '../action-error';
import { TAG_COLOR_CLASSES } from './tag-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface ManageTagsDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contributors and Admins rename and recolour. */
  canEdit: boolean;
  /** Admins delete. */
  canDelete: boolean;
}

const testCasesKey = (projectId: string) => ['projects', projectId, 'test-cases'] as const;
const testCasesLabel = (n: number) => `${n} test case${n === 1 ? '' : 's'}`;
const bugsLabel = (n: number) => `${n} bug${n === 1 ? '' : 's'}`;

/** Manage tags (ADR 0016 decision 4): a list, not a create form, so a plain Dialog. */
export function ManageTagsDialog({ projectId, open, onOpenChange, canEdit, canDelete }: ManageTagsDialogProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const { data: tags = [] } = useQuery({
    queryKey: tagKeys.list(projectId),
    queryFn: () => listTags(apiClient, projectId),
    enabled: open,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: tagKeys.list(projectId) });
    queryClient.invalidateQueries({ queryKey: testCasesKey(projectId) });
    queryClient.invalidateQueries({ queryKey: bugKeys.all(projectId) });
  };

  const remove = useMutation({
    mutationFn: (tag: Tag) => deleteTag(apiClient, projectId, tag.id),
    onSuccess: (_result, tag) => {
      notifySuccess(`Tag "${tag.name}" deleted`);
      setDeleting(null);
      refresh();
    },
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage tags</DialogTitle>
          </DialogHeader>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags yet. Add them from a test case.</p>
          ) : (
            <ul aria-label="Project tags" className="flex flex-col gap-1">
              {tags.map((tag) => (
                <TagRow
                  key={tag.id}
                  projectId={projectId}
                  tag={tag}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onSaved={refresh}
                  onDelete={() => setDeleting(tag)}
                />
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{deleting?.name}”?</DialogTitle>
            <DialogDescription>
              It will be removed from {testCasesLabel(deleting?.testCaseCount ?? 0)} and {bugsLabel(deleting?.bugCount ?? 0)}. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <ActionError error={remove.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => deleting && remove.mutate(deleting)}>
              Delete tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface TagRowProps {
  projectId: string;
  tag: Tag;
  canEdit: boolean;
  canDelete: boolean;
  onSaved: () => void;
  onDelete: () => void;
}

function TagRow({ projectId, tag, canEdit, canDelete, onSaved, onDelete }: TagRowProps) {
  const apiClient = useApiClient();
  const [name, setName] = useState(tag.name);

  // Follow the server's value (after a save, a refetch, or a refused rename).
  useEffect(() => setName(tag.name), [tag.name]);

  const save = useMutation({
    mutationFn: (input: { name?: string; color?: TagColor }) => updateTag(apiClient, projectId, tag.id, input),
    onSuccess: (_updated, input) => {
      notifySuccess(input.color ? 'Tag colour changed' : 'Tag renamed');
      onSaved();
    },
    onError: () => setName(tag.name),
  });

  const rename = () => {
    const next = name.trim();
    if (next === '' || next === tag.name) {
      setName(tag.name);
      return;
    }
    save.mutate({ name: next });
  };

  return (
    <li className="flex flex-col gap-1 rounded-md border px-2 py-1.5">
      <div className="flex items-center gap-2">
        {canEdit ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Colour of ${tag.name}`}
                className={cn('size-4 shrink-0 rounded-full ring-offset-2 hover:ring-2 hover:ring-ring', TAG_COLOR_CLASSES[tag.color].swatch)}
              />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div role="radiogroup" aria-label={`Colour of ${tag.name}`} className="grid grid-cols-4 gap-2">
                {TAG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={color === tag.color}
                    aria-label={color}
                    onClick={() => color !== tag.color && save.mutate({ color })}
                    className={cn('size-6 rounded-full', TAG_COLOR_CLASSES[color].swatch, color === tag.color && 'ring-2 ring-ring ring-offset-2')}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : (
          <span className={cn('size-4 shrink-0 rounded-full', TAG_COLOR_CLASSES[tag.color].swatch)} />
        )}
        {canEdit ? (
          <Input
            aria-label={`Name of ${tag.name}`}
            value={name}
            maxLength={50}
            onChange={(event) => setName(event.target.value)}
            onBlur={rename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                rename();
              }
            }}
            className="h-8 flex-1"
          />
        ) : (
          <span className="flex-1 truncate text-sm">{tag.name}</span>
        )}
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {testCasesLabel(tag.testCaseCount)} · {bugsLabel(tag.bugCount)}
        </span>
        {canDelete && (
          <Button type="button" size="icon" variant="ghost" className="size-7" aria-label={`Delete ${tag.name}`} onClick={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <ActionError error={save.error} />
    </li>
  );
}
