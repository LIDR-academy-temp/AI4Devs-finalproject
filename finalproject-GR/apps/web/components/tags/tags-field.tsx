'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import { createTag, listTags, tagKeys } from '../../lib/tags-api';
import { TagBadge } from './tag-badge';
import { TagPicker } from './tag-picker';

export interface TagsFieldProps {
  projectId: string;
  tagIds: readonly string[];
  canEdit: boolean;
  /** Saves the item's new full tag set. */
  onChange: (tagIds: string[]) => void;
  disabled?: boolean;
}

/** A detail view's Tags row (test case or bug): badges, plus the picker for Contributors and Admins. */
export function TagsField({ projectId, tagIds, canEdit, onChange, disabled }: TagsFieldProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { data: tags = [] } = useQuery({ queryKey: tagKeys.list(projectId), queryFn: () => listTags(apiClient, projectId) });

  const carried = tags.filter((tag) => tagIds.includes(tag.id));

  const create = async (name: string) => {
    const created = await createTag(apiClient, projectId, { name });
    await queryClient.invalidateQueries({ queryKey: tagKeys.list(projectId) });
    return created;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Tags</span>
      <div className="flex flex-wrap items-center gap-1.5" aria-label="Tags">
        {carried.map((tag) => (
          <TagBadge key={tag.id} name={tag.name} color={tag.color} />
        ))}
        {carried.length === 0 && !canEdit && <span className="text-sm text-muted-foreground">No tags</span>}
        {canEdit && <TagPicker tags={tags} selectedIds={tagIds} onChange={onChange} onCreate={create} disabled={disabled} />}
      </div>
    </div>
  );
}
