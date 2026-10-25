'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import { deleteTestCase, getTestCase, updateTestCase, type TestCase, type TestCaseStatus } from '../../lib/test-cases-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionError } from '../action-error';
import { GherkinView } from '../gherkin-view';
import { notifySuccess } from '../../lib/notify';

const STATUSES: TestCaseStatus[] = ['Draft', 'Ready', 'Deprecated'];

export interface TestCaseDetailProps {
  projectId: string;
  testCaseId: string;
  canEdit: boolean;
  canDelete: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
  /** Starts a new execution with this test case; offered only while it is Ready (ADR 0012). */
  onRun?: (testCase: TestCase) => void;
}

export function TestCaseDetail({
  projectId,
  testCaseId,
  canEdit,
  canDelete,
  onUpdated,
  onDeleted,
  onRun,
}: TestCaseDetailProps) {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [script, setScript] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const detailKey = ['projects', projectId, 'test-cases', testCaseId];
  const listKey = ['projects', projectId, 'test-cases'];

  const { data: testCase } = useQuery({
    queryKey: detailKey,
    queryFn: () => getTestCase(apiClient, projectId, testCaseId),
  });

  // Resets edit state when the selected test case changes, and whenever a fresh
  // server value arrives for it (initial load, or after a mutation's invalidation
  // causes a refetch) — mirrors frontend-bootstrap's own reset-on-select behavior.
  useEffect(() => {
    setConfirmingDelete(false);
  }, [testCaseId]);

  useEffect(() => {
    if (testCase) {
      setName(testCase.name);
      setScript(testCase.gherkinScript ?? '');
    }
  }, [testCase]);

  const updateMutation = useMutation({
    mutationFn: (patch: Parameters<typeof updateTestCase>[3]) => updateTestCase(apiClient, projectId, testCaseId, patch),
    onSuccess: (updated, patch) => {
      notifySuccess(patch.status ? `Status changed to ${updated.status}` : 'Test case saved');
      queryClient.setQueryData(detailKey, updated);
      queryClient.invalidateQueries({ queryKey: listKey });
      onUpdated();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTestCase(apiClient, projectId, testCaseId),
    onSuccess: () => {
      notifySuccess('Test case deleted');
      queryClient.invalidateQueries({ queryKey: listKey });
      onDeleted();
    },
  });

  if (!testCase) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 pt-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  function handleNameBlur() {
    if (name !== testCase!.name) {
      updateMutation.mutate({ name });
    }
  }

  function handleScriptBlur() {
    if (script !== (testCase!.gherkinScript ?? '')) {
      updateMutation.mutate({ gherkinScript: script });
    }
  }

  function handleStatusChange(status: TestCaseStatus) {
    updateMutation.mutate({ status });
  }

  function handleDeleteConfirm() {
    deleteMutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        {canEdit ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="test-case-name">Name</Label>
            <Input
              id="test-case-name"
              aria-label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
            />
          </div>
        ) : (
          <CardTitle>{testCase.name}</CardTitle>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{testCase.sourceType}</span>
          {onRun && testCase.status === 'Ready' && (
            <Button type="button" size="sm" onClick={() => onRun(testCase)}>
              Run
            </Button>
          )}
        </div>

        {canEdit ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="test-case-status">Status</Label>
            <Select value={testCase.status} onValueChange={(value) => handleStatusChange(value as TestCaseStatus)}>
              <SelectTrigger id="test-case-status" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span>{testCase.status}</span>
        )}

        {canEdit ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="test-case-script">Gherkin script</Label>
            <Textarea
              id="test-case-script"
              aria-label="Gherkin script"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              onBlur={handleScriptBlur}
              className="min-h-32"
            />
          </div>
        ) : (
          testCase.gherkinScript ? (
            <GherkinView script={testCase.gherkinScript} />
          ) : (
            <p className="text-sm text-muted-foreground">Manual test case — no Gherkin script.</p>
          )
        )}

        {canDelete &&
          (confirmingDelete ? (
            <div className="flex gap-2">
              <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
                Confirm delete
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="destructive" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          ))}
        <ActionError error={deleteMutation.error} />
      </CardContent>
    </Card>
  );
}
