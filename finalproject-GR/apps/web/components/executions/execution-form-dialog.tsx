'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Controller, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApiClient } from '../../lib/api-client';
import { listTestCases } from '../../lib/test-cases-api';
import { listEnvironments } from '../../lib/environments-api';
import {
  createExecution,
  updateExecution,
  type Browser,
  type Execution,
  type ExecutionInput,
} from '../../lib/executions-api';
import { useApplyExecution } from '../../lib/use-execution-cache';
import { FormDialog } from '../form-dialog';
import { ExecutionTestCasePicker } from './execution-test-case-picker';
import { SelectedTestCases, type SelectedItem } from './selected-test-cases';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { notifySuccess } from '../../lib/notify';

const NONE = '__none__';
const OTHER = '__other__';
const CUSTOM = 'custom';
const BROWSERS: Browser[] = ['Chromium', 'Firefox', 'WebKit'];
const VIEWPORT_PRESETS = [
  { value: '1280x720', label: 'Laptop 1280×720' },
  { value: '1366x768', label: 'Laptop 1366×768' },
  { value: '1920x1080', label: 'Desktop 1920×1080' },
  { value: '390x844', label: 'Mobile 390×844' },
];
// Common choices only — the full curated lists are open question G9; "Other…" accepts
// any value and the API validates it.
const LOCALES = ['en-US', 'en-GB', 'es-ES', 'pt-BR', 'fr-FR', 'de-DE', 'ja-JP'];
const TIMEZONES = ['UTC', 'America/New_York', 'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string(),
  testCaseIds: z.array(z.string()).min(1, 'Pick at least one test case'),
  environmentId: z.string(),
  browser: z.enum(['Chromium', 'Firefox', 'WebKit']),
  viewportWidth: z.number({ error: 'Width is required' }).int().positive('Width must be positive'),
  viewportHeight: z.number({ error: 'Height is required' }).int().positive('Height must be positive'),
  locale: z.string().trim().min(1, 'Locale is required'),
  timezone: z.string().trim().min(1, 'Timezone is required'),
  autoCreateBug: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export interface ExecutionFormDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit mode when set (Draft executions only); create mode otherwise. */
  execution?: Execution;
  /** Create mode: test cases picked up front (e.g. "Run" on a test case). */
  initialTestCaseIds?: string[];
  defaultName?: string;
  onSaved: (execution: Execution) => void;
}

function initialValues(execution?: Execution, initialTestCaseIds: string[] = [], defaultName = ''): FormValues {
  return {
    name: execution?.name ?? defaultName,
    description: execution?.description ?? '',
    testCaseIds: execution?.runs?.map((run) => run.testCaseId).filter((id): id is string => id !== null) ?? initialTestCaseIds,
    environmentId: execution?.environmentId ?? NONE,
    browser: execution?.browser ?? 'Chromium',
    viewportWidth: execution?.viewportWidth ?? 1280,
    viewportHeight: execution?.viewportHeight ?? 720,
    locale: execution?.locale ?? 'en-US',
    timezone: execution?.timezone ?? 'UTC',
    autoCreateBug: execution?.autoCreateBug ?? false,
  };
}

const sameOrder = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

/** New / Edit Execution (PRD §7.2). The Selected panel's order is the run order. */
export function ExecutionFormDialog({
  projectId,
  open,
  onOpenChange,
  execution,
  initialTestCaseIds,
  defaultName,
  onSaved,
}: ExecutionFormDialogProps) {
  const apiClient = useApiClient();
  const applyExecution = useApplyExecution(projectId);
  const editing = execution !== undefined;
  const original = initialValues(execution, initialTestCaseIds, defaultName);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: original });

  const [viewportPreset, setViewportPreset] = useState(CUSTOM);
  const [otherLocale, setOtherLocale] = useState(false);
  const [otherTimezone, setOtherTimezone] = useState(false);

  // Re-seed the form each time the dialog opens, so it never shows a stale draft.
  useEffect(() => {
    if (!open) {
      return;
    }
    const values = initialValues(execution, initialTestCaseIds, defaultName);
    reset(values);
    const preset = `${values.viewportWidth}x${values.viewportHeight}`;
    setViewportPreset(VIEWPORT_PRESETS.some((p) => p.value === preset) ? preset : CUSTOM);
    setOtherLocale(!LOCALES.includes(values.locale));
    setOtherTimezone(!TIMEZONES.includes(values.timezone));
    // Deliberately keyed on `open` only: the props are read at the moment it opens.
  }, [open]);

  const { data: testCases = [] } = useQuery({
    queryKey: ['projects', projectId, 'test-cases'],
    queryFn: () => listTestCases(apiClient, projectId),
    enabled: open,
  });
  const { data: environments = [] } = useQuery({
    queryKey: ['projects', projectId, 'environments'],
    queryFn: () => listEnvironments(apiClient, projectId),
    enabled: open,
  });

  const picked = watch('testCaseIds');
  const selectedItems: SelectedItem[] = picked.map((id) => {
    const testCase = testCases.find((candidate) => candidate.id === id);
    const runName = execution?.runs?.find((run) => run.testCaseId === id)?.testCaseName;
    return { id, name: testCase?.name ?? runName ?? 'Unknown test case', status: testCase?.status };
  });
  const setPicked = (ids: string[]) => setValue('testCaseIds', ids, { shouldValidate: true, shouldDirty: true });

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const input: ExecutionInput = {
        name: values.name,
        description: values.description.trim() === '' ? null : values.description,
        environmentId: values.environmentId === NONE ? null : values.environmentId,
        browser: values.browser,
        viewportWidth: values.viewportWidth,
        viewportHeight: values.viewportHeight,
        locale: values.locale,
        timezone: values.timezone,
        autoCreateBug: values.autoCreateBug,
      };
      if (!editing) {
        return createExecution(apiClient, projectId, { ...input, testCaseIds: values.testCaseIds });
      }
      // Re-sending an unchanged list would recreate every run (new run ids) for nothing.
      const changed = !sameOrder(values.testCaseIds, original.testCaseIds);
      return updateExecution(apiClient, projectId, execution.id, {
        ...input,
        ...(changed ? { testCaseIds: values.testCaseIds } : {}),
      });
    },
    onSuccess: (saved) => {
      notifySuccess(editing ? 'Execution updated' : 'Execution created');
      applyExecution(saved);
      onSaved(saved);
      onOpenChange(false);
    },
  });

  const onEnvironmentChange = (environmentId: string) => {
    setValue('environmentId', environmentId);
    // Pre-fill the browser from the environment's default unless the user chose one.
    const environment = environments.find((candidate) => candidate.id === environmentId);
    if (environment && !getFieldState('browser').isDirty) {
      setValue('browser', environment.defaultBrowser);
    }
  };

  const onViewportPresetChange = (preset: string) => {
    setViewportPreset(preset);
    if (preset !== CUSTOM) {
      const [width, height] = preset.split('x').map(Number);
      setValue('viewportWidth', width, { shouldValidate: true });
      setValue('viewportHeight', height, { shouldValidate: true });
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? 'Edit execution' : 'New execution'}
      size="extraWide"
      submitLabel={editing ? 'Save changes' : 'Create execution'}
      pending={save.isPending}
      error={save.error}
      onSubmit={handleSubmit((values) => save.mutate(values))}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="execution-name">Name</Label>
        <Input id="execution-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="execution-description">Description</Label>
        <Textarea id="execution-description" rows={2} {...register('description')} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Test cases (Ready only)</legend>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border p-2">
            <ExecutionTestCasePicker projectId={projectId} selected={picked} onChange={setPicked} />
          </div>
          <div className="flex flex-col gap-1 rounded-md border p-2">
            <span className="text-sm text-muted-foreground">Selected, in run order (drag to reorder)</span>
            <div className="max-h-80 overflow-y-auto">
              <SelectedTestCases items={selectedItems} onChange={setPicked} />
            </div>
          </div>
        </div>
        {errors.testCaseIds && <p className="text-sm text-destructive">{errors.testCaseIds.message}</p>}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Environment</Label>
          <Controller
            control={control}
            name="environmentId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={onEnvironmentChange}>
                <SelectTrigger aria-label="Environment" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {environments.map((environment) => (
                    <SelectItem key={environment.id} value={environment.id}>
                      {environment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Browser</Label>
          <Controller
            control={control}
            name="browser"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger aria-label="Browser" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BROWSERS.map((browser) => (
                    <SelectItem key={browser} value={browser}>
                      {browser}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>Viewport</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={viewportPreset} onValueChange={onViewportPresetChange}>
              <SelectTrigger aria-label="Viewport preset" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWPORT_PRESETS.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Custom</SelectItem>
              </SelectContent>
            </Select>
            <Input
              aria-label="Viewport width"
              type="number"
              className="w-24"
              disabled={viewportPreset !== CUSTOM}
              {...register('viewportWidth', { valueAsNumber: true })}
            />
            <span aria-hidden>×</span>
            <Input
              aria-label="Viewport height"
              type="number"
              className="w-24"
              disabled={viewportPreset !== CUSTOM}
              {...register('viewportHeight', { valueAsNumber: true })}
            />
          </div>
          {(errors.viewportWidth || errors.viewportHeight) && (
            <p className="text-sm text-destructive">
              {errors.viewportWidth?.message ?? errors.viewportHeight?.message}
            </p>
          )}
        </div>

        <ChoiceWithOther
          label="Locale"
          options={LOCALES}
          other={otherLocale}
          onOtherChange={setOtherLocale}
          value={watch('locale')}
          onValueChange={(value) => setValue('locale', value, { shouldValidate: true })}
          inputProps={register('locale')}
          error={errors.locale?.message}
        />
        <ChoiceWithOther
          label="Timezone"
          options={TIMEZONES}
          other={otherTimezone}
          onOtherChange={setOtherTimezone}
          value={watch('timezone')}
          onValueChange={(value) => setValue('timezone', value, { shouldValidate: true })}
          inputProps={register('timezone')}
          error={errors.timezone?.message}
        />
      </div>

      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name="autoCreateBug"
          render={({ field }) => (
            <Switch id="execution-auto-bug" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="execution-auto-bug" className="font-normal">
          Auto-create bug on failure
        </Label>
      </div>
    </FormDialog>
  );
}

interface ChoiceWithOtherProps {
  label: string;
  options: string[];
  other: boolean;
  onOtherChange: (other: boolean) => void;
  value: string;
  onValueChange: (value: string) => void;
  inputProps: UseFormRegisterReturn;
  error?: string;
}

/** A short common list plus "Other…" free entry (G9 keeps the full lists open). */
function ChoiceWithOther({ label, options, other, onOtherChange, value, onValueChange, inputProps, error }: ChoiceWithOtherProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        value={other ? OTHER : value}
        onValueChange={(choice) => {
          if (choice === OTHER) {
            onOtherChange(true);
            onValueChange('');
          } else {
            onOtherChange(false);
            onValueChange(choice);
          }
        }}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={OTHER}>Other…</SelectItem>
        </SelectContent>
      </Select>
      {other && <Input aria-label={`${label} (other)`} placeholder={label === 'Locale' ? 'e.g. it-IT' : 'e.g. Asia/Kolkata'} {...inputProps} />}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
