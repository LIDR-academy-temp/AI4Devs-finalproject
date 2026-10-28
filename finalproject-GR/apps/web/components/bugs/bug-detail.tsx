'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import {
  BUG_SEVERITIES,
  BUG_STATUSES,
  BUG_STATUS_LABELS,
  bugKeys,
  deleteBug,
  getBug,
  updateBug,
  type Bug,
  type BugSeverity,
  type BugStatus,
  type UpdateBugInput,
} from '../../lib/bugs-api';
import { canDeleteBug, canEditBug } from '../../lib/bug-permissions';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { SELECTED_EXECUTION_PARAM } from '../executions/executions-screen';
import { OUTCOME_LABELS } from '../executions/status-badge';
import { ActionError } from '../action-error';
import { BugStatusBadge, SeverityDot } from './bug-badges';
import { GherkinView } from '../gherkin-view';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DetailSkeleton, ErrorState } from '../states';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notifySuccess } from '../../lib/notify';
import { tagKeys } from '../../lib/tags-api';
import { TagsField } from '../tags/tags-field';

export interface BugDetailProps {
  projectId: string;
  bugId: string;
  role: ProjectRole | null;
  onDeleted: () => void;
}

/** Bug detail view (PRD §6.4.3, minus images and the activity panel). */
export function BugDetail({ projectId, bugId, role, onDeleted }: BugDetailProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const canEdit = canEditBug(role);

  const {
    data: bug,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: bugKeys.detail(projectId, bugId),
    queryFn: () => getBug(apiClient, projectId, bugId),
  });

  const update = useMutation({
    mutationFn: (input: UpdateBugInput) => updateBug(apiClient, projectId, bugId, input),
    onSuccess: (updated, input) => {
      notifySuccess(
        input.status ? `Status changed to ${BUG_STATUS_LABELS[updated.status]}` : input.tagIds ? 'Tags updated' : 'Bug saved',
      );
      queryClient.setQueryData(bugKeys.detail(projectId, bugId), updated);
      if (input.tagIds) {
        // Usage counts in the tag list changed too.
        queryClient.invalidateQueries({ queryKey: tagKeys.list(projectId) });
      }
      queryClient.invalidateQueries({ queryKey: bugKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'bugs', 'run'] });
    },
  });

  if (isLoading) {
    return <DetailSkeleton />;
  }
  if (isError || !bug) {
    return <ErrorState message="This bug could not be loaded. It may have been deleted." onRetry={() => refetch()} />;
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <header className="flex flex-col gap-3">
          {canEdit ? (
            <BlurInput
              label="Title"
              value={bug.title}
              onCommit={(title) => title.trim() !== '' && update.mutate({ title })}
            />
          ) : (
            <h2 className="text-lg font-semibold">{bug.title}</h2>
          )}
          <div className="flex flex-wrap items-center gap-4">
            {canEdit ? (
              <>
                <InlineSelect
                  label="Status"
                  value={bug.status}
                  options={BUG_STATUSES.map((status) => ({ value: status, label: BUG_STATUS_LABELS[status] }))}
                  onChange={(status) => update.mutate({ status: status as BugStatus })}
                />
                <InlineSelect
                  label="Severity"
                  value={bug.severity}
                  options={BUG_SEVERITIES.map((severity) => ({ value: severity, label: severity }))}
                  onChange={(severity) => update.mutate({ severity: severity as BugSeverity })}
                />
              </>
            ) : (
              <>
                <BugStatusBadge status={bug.status} />
                <SeverityDot severity={bug.severity} />
              </>
            )}
            <span className="text-sm text-muted-foreground">
              Reported by {bug.reporterName}
              {bug.autoCreated && ' (auto-created on failure)'}
            </span>
          </div>
          <TagsField
            projectId={projectId}
            tagIds={bug.tagIds ?? []}
            canEdit={canEdit}
            onChange={(tagIds) => update.mutate({ tagIds })}
            disabled={update.isPending}
          />
          <ActionError error={update.error} />
        </header>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Section label="Linked test run">
            <LinkedRun bug={bug} />
          </Section>
          <Section label="Linked test case">
            <LinkedTestCase bug={bug} />
          </Section>
        </dl>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Gherkin script snapshot</span>
          {bug.gherkinSnapshot ? (
            <GherkinView script={bug.gherkinSnapshot} failedStep={bug.failedStep} />
          ) : (
            <p className="text-sm text-muted-foreground">None — this bug wasn&apos;t filed from a run with a script.</p>
          )}
        </div>

        {canEdit ? (
          <>
            <BlurTextarea
              label="Description"
              value={bug.description ?? ''}
              onCommit={(description) => update.mutate({ description: description === '' ? null : description })}
            />
            <BlurTextarea
              label="Steps to reproduce"
              value={bug.stepsToReproduce ?? ''}
              onCommit={(steps) => update.mutate({ stepsToReproduce: steps === '' ? null : steps })}
            />
          </>
        ) : (
          <>
            <ReadOnlyText label="Description" value={bug.description} />
            <ReadOnlyText label="Steps to reproduce" value={bug.stepsToReproduce} />
          </>
        )}

        {canDeleteBug(role) && <DeleteBug projectId={projectId} bug={bug} onDeleted={onDeleted} />}
      </CardContent>
    </Card>
  );
}

function LinkedRun({ bug }: { bug: Bug }) {
  if (!bug.run) {
    return <span className="text-muted-foreground">None</span>;
  }
  const label = `${bug.run.executionName} · run #${bug.run.position} · ${OUTCOME_LABELS[bug.run.outcome]}`;
  return bug.run.deleted ? (
    <span className="text-muted-foreground">{label} (deleted)</span>
  ) : (
    <Link href={`/executions?${SELECTED_EXECUTION_PARAM}=${bug.run.executionId}`} className="underline">
      {label}
    </Link>
  );
}

function LinkedTestCase({ bug }: { bug: Bug }) {
  if (!bug.testCase) {
    return (
      <span className="text-muted-foreground">
        {bug.testCaseNameSnapshot ? `${bug.testCaseNameSnapshot} (deleted)` : 'None'}
      </span>
    );
  }
  const name = bug.testCaseNameSnapshot ?? 'Test case';
  return bug.testCase.deleted ? (
    <span className="text-muted-foreground">{name} (deleted)</span>
  ) : (
    <Link href={`/test-cases?testCase=${bug.testCase.id}`} className="underline">
      {name}
    </Link>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ReadOnlyText({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <p className="whitespace-pre-wrap text-muted-foreground">{value ?? '—'}</p>
    </div>
  );
}

/** Saves when focus leaves the field, if the value changed (same pattern as TestCaseDetail). */
function BlurInput({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="bug-detail-title">{label}</Label>
      <Input
        id="bug-detail-title"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
      />
    </div>
  );
}

function BlurTextarea({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const id = `bug-detail-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== value && onCommit(draft)}
      />
    </div>
  );
}

function InlineSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => next !== value && onChange(next)}>
      <SelectTrigger aria-label={label} size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function DeleteBug({ projectId, bug, onDeleted }: { projectId: string; bug: Bug; onDeleted: () => void }) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const remove = useMutation({
    mutationFn: () => deleteBug(apiClient, projectId, bug.id),
    onSuccess: () => {
      notifySuccess('Bug deleted');
      queryClient.invalidateQueries({ queryKey: bugKeys.all(projectId) });
      setConfirming(false);
      onDeleted();
    },
  });

  return (
    <>
      <Button type="button" variant="destructive" size="sm" className="self-start" onClick={() => setConfirming(true)}>
        Delete
      </Button>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete bug?</DialogTitle>
            <DialogDescription>&ldquo;{bug.title}&rdquo; will be moved to the trash.</DialogDescription>
          </DialogHeader>
          <ActionError error={remove.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
