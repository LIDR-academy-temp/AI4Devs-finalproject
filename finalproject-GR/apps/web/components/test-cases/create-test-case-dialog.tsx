'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiClient } from '../../lib/api-client';
import { createTestCase, type TestCase } from '../../lib/test-cases-api';
import { createTag, listTags, tagKeys } from '../../lib/tags-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { notifySuccess } from '../../lib/notify';
import type { FolderNode } from '../../lib/test-case-tree';
import { FormDialog } from '../form-dialog';
import { FolderPicker } from './folder-picker';
import { TagBadge } from '../tags/tag-badge';
import { TagPicker } from '../tags/tag-picker';

const createTestCaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gherkinScript: z.string().optional(),
});

type CreateTestCaseFormValues = z.infer<typeof createTestCaseSchema>;

export interface CreateTestCaseDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (testCase: TestCase) => void;
  /** Folder-only tree for the destination picker (PRD §7.1); omitted = no picker, root. */
  folders?: FolderNode[];
  /** Pre-selected destination: the selected folder, or the one whose "New test case here" was used. */
  initialFolderId?: string | null;
}

/**
 * The New Test Case modal (PRD §7.1). The form is mounted only while open, so closing
 * discards the input and each opening starts from the defaults (design.md decision 2).
 */
export function CreateTestCaseDialog({ open, ...props }: CreateTestCaseDialogProps) {
  return open ? <CreateTestCaseForm {...props} /> : null;
}

function CreateTestCaseForm({
  projectId,
  onOpenChange,
  onCreated,
  folders,
  initialFolderId = null,
}: Omit<CreateTestCaseDialogProps, 'open'>) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const { data: tags = [] } = useQuery({ queryKey: tagKeys.list(projectId), queryFn: () => listTags(apiClient, projectId) });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTestCaseFormValues>({
    resolver: zodResolver(createTestCaseSchema),
    defaultValues: { name: '', gherkinScript: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: CreateTestCaseFormValues) =>
      createTestCase(apiClient, projectId, {
        name: values.name,
        ...(values.gherkinScript ? { gherkinScript: values.gherkinScript } : {}),
        ...(folders ? { folderId } : {}),
        ...(tagIds.length > 0 ? { tagIds } : {}),
      }),
    onSuccess: (created) => {
      notifySuccess('Test case created');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'test-cases'] });
      if (tagIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: tagKeys.list(projectId) });
      }
      onCreated(created);
      onOpenChange(false);
    },
  });

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="New test case"
      submitLabel="Create test case"
      pending={createMutation.isPending}
      error={createMutation.error}
      onSubmit={handleSubmit((values) => createMutation.mutate(values))}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-test-case-name">Name</Label>
        <Input id="new-test-case-name" aria-label="New test case name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      {folders && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Folder</span>
          <FolderPicker folders={folders} value={folderId} onChange={setFolderId} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Tags</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags
            .filter((tag) => tagIds.includes(tag.id))
            .map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color} />
            ))}
          <TagPicker
            tags={tags}
            selectedIds={tagIds}
            onChange={setTagIds}
            onCreate={async (name) => {
              const created = await createTag(apiClient, projectId, { name });
              await queryClient.invalidateQueries({ queryKey: tagKeys.list(projectId) });
              return created;
            }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-test-case-script">Initial Gherkin script (optional)</Label>
        <Textarea
          id="new-test-case-script"
          aria-label="New test case script"
          className="min-h-32"
          {...register('gherkinScript')}
        />
      </div>
    </FormDialog>
  );
}
