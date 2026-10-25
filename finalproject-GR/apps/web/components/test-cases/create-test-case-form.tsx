'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiClient } from '../../lib/api-client';
import { createTestCase, type TestCase } from '../../lib/test-cases-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { notifySuccess } from '../../lib/notify';
import type { FolderNode } from '../../lib/test-case-tree';
import { FolderPicker } from './folder-picker';

const createTestCaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  gherkinScript: z.string().optional(),
});

type CreateTestCaseFormValues = z.infer<typeof createTestCaseSchema>;

export interface CreateTestCaseFormProps {
  projectId: string;
  onCreated: (testCase: TestCase) => void;
  onCancel: () => void;
  /** Folder-only tree for the destination picker (PRD §7.1); omitted = no picker, root. */
  folders?: FolderNode[];
  /** Pre-selected destination: the selected folder, or the one whose "New test case here" was used. */
  initialFolderId?: string | null;
}

export function CreateTestCaseForm({ projectId, onCreated, onCancel, folders, initialFolderId = null }: CreateTestCaseFormProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(initialFolderId);
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
      }),
    onSuccess: (created) => {
      notifySuccess('Test case created');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'test-cases'] });
      onCreated(created);
    },
  });

  function onSubmit(values: CreateTestCaseFormValues) {
    createMutation.mutate(values);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New test case</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-test-case-name">Name</Label>
            <Input id="new-test-case-name" aria-label="New test case name" {...register('name')} />
            {errors.name && <p role="alert">{errors.name.message}</p>}
          </div>
          {folders && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Folder</span>
              <FolderPicker folders={folders} value={folderId} onChange={setFolderId} />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-test-case-script">Initial Gherkin script (optional)</Label>
            <Textarea
              id="new-test-case-script"
              aria-label="New test case script"
              className="min-h-32"
              {...register('gherkinScript')}
            />
          </div>
        </CardContent>
        <CardFooter className="gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
