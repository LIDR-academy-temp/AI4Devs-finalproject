'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSessionContext } from '../../lib/session-context';
import { PageHeader } from '../page-header';
import { canCreateExecution } from '../../lib/execution-permissions';
import { ExecutionList } from './execution-list';
import { ExecutionDetail } from './execution-detail';
import { ExecutionFormDialog } from './execution-form-dialog';

/** Query-string key holding the selected execution, so links and "Run" can open one. */
export const SELECTED_EXECUTION_PARAM = 'execution';

/**
 * PRD §6.3.1 split layout: list on the left, the selected execution on the right.
 * Uses useSearchParams, so the page wraps it in <Suspense> (Next 16 docs).
 */
export function ExecutionsScreen() {
  const session = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);

  if (session.loading || !session.data) {
    return null;
  }

  const { projectId, role } = session.data;
  const selectedId = searchParams.get(SELECTED_EXECUTION_PARAM);
  const select = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set(SELECTED_EXECUTION_PARAM, id);
    } else {
      params.delete(SELECTED_EXECUTION_PARAM);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <PageHeader title="Executions" description="Plan, run and review batches of test cases." />
      <div className="grid h-[calc(100vh-10rem)] grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        <ExecutionList
          projectId={projectId}
          selectedId={selectedId}
          onSelect={select}
          canCreate={canCreateExecution(role)}
          onCreateClick={() => setCreating(true)}
        />
        <div className="min-h-0 overflow-y-auto">
          {selectedId ? (
            <ExecutionDetail
              key={selectedId}
              projectId={projectId}
              executionId={selectedId}
              role={role}
              onDeleted={() => select(null)}
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Select an execution to see its runs.</p>
          )}
        </div>
        <ExecutionFormDialog
          projectId={projectId}
          open={creating}
          onOpenChange={setCreating}
          onSaved={(execution) => select(execution.id)}
        />
      </div>
    </>
  );
}
