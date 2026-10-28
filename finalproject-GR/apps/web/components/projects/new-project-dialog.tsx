'use client';

import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiClient } from '../../lib/api-client';
import { createProject } from '../../lib/projects-api';
import { notifySuccess } from '../../lib/notify';
import { useSwitchProject } from '../../lib/use-switch-project';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormDialog } from '../form-dialog';

const newProjectSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
});

type NewProjectFormValues = z.infer<typeof newProjectSchema>;

export interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to go once the new project is active; Test Cases by default. */
  destination?: string;
}

/**
 * The New Project flow (PRD §7.5), name only for now: environments are added later in
 * Project Settings. Creating makes the project active and opens `destination`.
 * Mounted only while open, so each opening starts empty.
 */
export function NewProjectDialog({ open, ...props }: NewProjectDialogProps) {
  return open ? <NewProjectForm {...props} /> : null;
}

function NewProjectForm({ onOpenChange, destination }: Omit<NewProjectDialogProps, 'open'>) {
  const apiClient = useApiClient();
  const switchProject = useSwitchProject();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewProjectFormValues>({ resolver: zodResolver(newProjectSchema), defaultValues: { name: '' } });

  const createMutation = useMutation({
    mutationFn: (values: NewProjectFormValues) => createProject(apiClient, { name: values.name }),
    onSuccess: (created) => {
      notifySuccess(`Project "${created.name}" created`);
      // The switch refetches everything, the project list included.
      switchProject.mutate({ projectId: created.id, destination }, { onSuccess: () => onOpenChange(false) });
    },
  });

  return (
    <FormDialog
      open
      onOpenChange={onOpenChange}
      title="New project"
      description="You can add environments afterwards, in Project Settings."
      submitLabel="Create project"
      pending={createMutation.isPending || switchProject.isPending}
      error={createMutation.error ?? switchProject.error}
      onSubmit={handleSubmit((values) => createMutation.mutate(values))}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-project-name">Name</Label>
        <Input id="new-project-name" aria-invalid={!!errors.name} autoFocus {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
    </FormDialog>
  );
}
