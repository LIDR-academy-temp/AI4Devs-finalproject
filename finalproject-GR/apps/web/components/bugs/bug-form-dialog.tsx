'use client';

import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiClient } from '../../lib/api-client';
import { BUG_SEVERITIES, bugKeys, createBug, type Bug } from '../../lib/bugs-api';
import type { Run } from '../../lib/executions-api';
import { ActionError } from '../action-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { notifySuccess } from '../../lib/notify';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  severity: z.enum(['Critical', 'High', 'Medium', 'Low']),
  description: z.string(),
  stepsToReproduce: z.string(),
  failedStep: z.string(),
});

type FormValues = z.infer<typeof schema>;

export interface BugFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filing from a run: pre-fills the title and offers the run's script lines as the failed step. */
  run?: Run;
  onSaved: (bug: Bug) => void;
}

/** The non-blank lines of a script, trimmed — the values the API accepts as a failed step. */
export function scriptSteps(script: string | null): string[] {
  return (script ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

/** New Bug (PRD §7.3, without tags and images). */
export function BugFormDialog({ projectId, open, onOpenChange, run, onSaved }: BugFormDialogProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const defaults: FormValues = {
    title: run?.testCaseName ?? '',
    severity: 'Medium',
    description: '',
    stepsToReproduce: '',
    failedStep: '',
  };
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults });

  // Re-seed on each open so it never shows a previous draft.
  useEffect(() => {
    if (open) {
      reset(defaults);
    }
    // Deliberately keyed on `open` only: the props are read at the moment it opens.
  }, [open]);

  const steps = run ? scriptSteps(run.gherkinScript) : [];
  const failedStep = watch('failedStep');

  const save = useMutation({
    mutationFn: (values: FormValues) =>
      createBug(apiClient, projectId, {
        title: values.title,
        severity: values.severity,
        description: values.description.trim() === '' ? null : values.description,
        stepsToReproduce: values.stepsToReproduce.trim() === '' ? null : values.stepsToReproduce,
        ...(run ? { testRunId: run.id } : {}),
        ...(run && values.failedStep ? { failedStep: values.failedStep } : {}),
      }),
    onSuccess: (bug) => {
      notifySuccess('Bug filed');
      queryClient.invalidateQueries({ queryKey: bugKeys.all(projectId) });
      onSaved(bug);
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{run ? 'File bug for this run' : 'New bug'}</DialogTitle>
          {run && (
            <DialogDescription>
              Linked to run #{run.position} ({run.testCaseName ?? 'unknown test case'}).
            </DialogDescription>
          )}
        </DialogHeader>
        <form id="bug-form" onSubmit={handleSubmit((values) => save.mutate(values))} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bug-title">Title</Label>
            <Input id="bug-title" aria-invalid={!!errors.title} {...register('title')} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Severity</Label>
            <Controller
              control={control}
              name="severity"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-label="Severity" className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUG_SEVERITIES.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {severity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bug-description">Description</Label>
            <Textarea id="bug-description" rows={3} {...register('description')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bug-steps">Steps to reproduce</Label>
            <Textarea id="bug-steps" rows={3} {...register('stepsToReproduce')} />
          </div>

          {run && steps.length > 0 && (
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-sm font-medium">Failed step (optional)</legend>
              <div role="radiogroup" aria-label="Failed step" className="flex flex-col gap-1 rounded-md border p-2 text-xs">
                <label className="flex items-center gap-2">
                  <input type="radio" value="" checked={failedStep === ''} onChange={() => setValue('failedStep', '')} />
                  <span className="text-muted-foreground">Not specified</span>
                </label>
                {steps.map((step, index) => (
                  <label key={`${index}-${step}`} className={cn('flex items-center gap-2 font-mono', failedStep === step && 'text-red-700')}>
                    <input
                      type="radio"
                      value={step}
                      checked={failedStep === step}
                      onChange={() => setValue('failedStep', step)}
                    />
                    {step}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <ActionError error={save.error} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="bug-form" disabled={save.isPending}>
            File bug
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
