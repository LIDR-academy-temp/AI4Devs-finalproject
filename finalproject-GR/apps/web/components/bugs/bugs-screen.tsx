'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSessionContext } from '../../lib/session-context';
import { PageHeader } from '../page-header';
import { canDeleteBug, canEditBug } from '../../lib/bug-permissions';
import { BugList } from './bug-list';
import { BugDetail } from './bug-detail';
import { BugFormDialog } from './bug-form-dialog';

/** Query-string key holding the selected bug, so other screens can link to one. */
export const SELECTED_BUG_PARAM = 'bug';

/**
 * PRD §6.4.1 split layout: list on the left, the selected bug on the right. Uses
 * useSearchParams, so the page wraps it in <Suspense> (Next 16 docs).
 */
export function BugsScreen() {
  const session = useSessionContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);

  if (session.loading || !session.data) {
    return null;
  }

  const { projectId, role } = session.data;
  const selectedId = searchParams.get(SELECTED_BUG_PARAM);
  const select = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set(SELECTED_BUG_PARAM, id);
    } else {
      params.delete(SELECTED_BUG_PARAM);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <>
      <PageHeader title="Bugs" description="Track defects found while testing." />
      <div className="grid h-[calc(100vh-10rem)] grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
        <BugList
          projectId={projectId}
          selectedId={selectedId}
          onSelect={select}
          canCreate={canEditBug(role)}
          canDeleteTags={canDeleteBug(role)}
          onCreateClick={() => setCreating(true)}
        />
        <div className="min-h-0 overflow-y-auto">
          {selectedId ? (
            <BugDetail
              key={selectedId}
              projectId={projectId}
              bugId={selectedId}
              role={role}
              onDeleted={() => select(null)}
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">Select a bug to see its details.</p>
          )}
        </div>
        <BugFormDialog
          projectId={projectId}
          open={creating}
          onOpenChange={setCreating}
          onSaved={(bug) => select(bug.id)}
        />
      </div>
    </>
  );
}
