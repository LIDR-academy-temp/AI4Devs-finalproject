import type { ImportStatus, ValidationCode } from '@recon/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCanProcess } from '@/features/imports/permissions'
import type { ImportSearch } from '@/features/imports/validate-search'
import type { ImportDetail } from '@/lib/api/types'
import { requestListFocus } from '@/lib/list-focus'
import { DecisionBar } from './DecisionBar'
import { InvalidatedReviewNotice } from './InvalidatedReviewNotice'
import { IssueDrawer } from './IssueDrawer'
import { FINDINGS_LIST, IssuesList } from './IssuesList'
import { useReview, useRunValidations } from './mutations'
import { validationRunKey, validationRunQuery } from './queries'
import { RunButton } from './RunButton'
import { RunHeader } from './RunHeader'
import { strings } from './strings'
import { ValidationsTable } from './ValidationsTable'

/** Statuses in which the validations can run (design D10); presentation only, the API decides. */
const RUNNABLE: readonly ImportStatus[] = ['analyzed', 'validated']

/**
 * The validations of Analysis & Validations, between the analysis result and its rows (design D1): the run, the
 * eight validations and the decision on the whole.
 */
export function ValidationsSection({ detail }: { detail: ImportDetail }) {
  const query = useQuery(validationRunQuery(detail.importId))
  const runner = useRunValidations(detail.importId)
  const reviewer = useReview(detail.importId)
  const [patching, setPatching] = useState(false)
  // One write at a time: while a run, the review or a change of the drawer is on its way, Run, Continue and Cancel
  // and reprocess wait, and all point at the same text saying what they wait for.
  const busyText = runner.running
    ? strings.run.running
    : reviewer.pending
      ? strings.decision.reviewing
      : patching
        ? strings.inclusion.saving
        : null
  const busy = busyText !== null
  const busyId = useId()
  const canProcess = useCanProcess()
  const search = useSearch({ from: '/app/imports/$importId' })
  const navigate = useNavigate({ from: '/imports/$importId' })

  // Only what the section shows changes: the page stays where it is (ui-polish design D13).
  const go = (change: Partial<ImportSearch>) =>
    navigate({
      search: (prev: ImportSearch) => ({ ...prev, step: 'analysis', ...change }),
      replace: true,
      resetScroll: false,
    })
  // Choosing a validation, from its table or from the decision, takes the focus to its findings.
  const select = (validation: ValidationCode) => {
    requestListFocus(FINDINGS_LIST)
    return go({ validation, ipage: undefined, issue: undefined })
  }
  // Stable, because the drawer closes itself from an effect when its finding is gone.
  const close = useCallback(
    () =>
      navigate({ search: (prev: ImportSearch) => ({ ...prev, issue: undefined }), replace: true, resetScroll: false }),
    [navigate],
  )

  const view = query.data
  // The import changed elsewhere (cancelled, reviewed, back to analyzed): the run says the same status again.
  const queryClient = useQueryClient()
  const stale = view !== undefined && view.importStatus !== detail.status
  useEffect(() => {
    if (stale) void queryClient.invalidateQueries({ queryKey: validationRunKey(detail.importId), exact: true })
  }, [stale, queryClient, detail.importId])
  // The finding of the address is read at the same time as the run, not after it.
  const drawer = <IssueDrawer issueId={search.issue} onClose={close} onPending={setPatching} />
  // The region appears with its content; while the first read is on its way there is only a placeholder.
  if (query.isPending) {
    return (
      <>
        <Skeleton className="h-24 w-full" aria-label={strings.loading} />
        {drawer}
      </>
    )
  }

  return (
    <section aria-label={strings.title} className="flex flex-col gap-3 rounded-md border bg-background p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium" tabIndex={-1} data-validations-heading>
          {strings.title}
        </h3>
        {view && canProcess && RUNNABLE.includes(view.importStatus) && (
          <RunButton view={view} runner={runner} busy={busy} busyId={busyId} />
        )}
      </div>
      <div aria-live="polite" className="text-sm">
        {busyText && <p id={busyId}>{busyText}</p>}
        {runner.error && <p className="text-destructive">{runner.error}</p>}
      </div>
      {query.isError ? (
        <div className="flex items-center gap-3 text-sm">
          <span>{strings.loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {strings.retry}
          </Button>
        </div>
      ) : view?.run ? (
        <>
          <InvalidatedReviewNotice view={view} />
          <RunHeader run={view.run} />
          <ValidationsTable results={view.run.results} selected={search.validation} onSelect={select} />
          {search.validation && (
            <IssuesList
              importId={detail.importId}
              validationCode={search.validation}
              page={search.ipage ?? 1}
              onPage={(page) => go({ ipage: page > 1 ? page : undefined })}
              onOpen={(issue) => go({ issue })}
            />
          )}
        </>
      ) : (
        <>
          {view && <InvalidatedReviewNotice view={view} />}
          <p className="text-sm text-muted-foreground">{strings.noRun}</p>
        </>
      )}
      {view && (
        <DecisionBar
          detail={detail}
          view={view}
          reviewer={reviewer}
          busy={busy}
          busyId={busyId}
          onShowBlocking={select}
        />
      )}
      {drawer}
    </section>
  )
}
