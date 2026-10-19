// Writes of the validations block (design D3, D4). Answers are written into the cache; what they may have changed
// is invalidated. The import detail is read again only when the answer brings another import status.
import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { importKey } from '@/features/imports/queries'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { formatAuditDateTime } from '@/lib/format'
import {
  type ErrorDetails,
  type OccurrenceView,
  resolveIssue,
  reviewImport,
  runValidations,
  setOccurrenceInclusion,
  type ValidationIssueDetail,
  type ValidationRunView,
} from './contract'
import { validationIssueKey, validationRunKey } from './queries'
import { strings } from './strings'

/** The detail of the import is read again if its status changed on the server (validated ↔ analyzed). */
export function syncImportStatus(queryClient: QueryClient, importId: string, importStatus: ImportDetail['status']) {
  const cached = queryClient.getQueryData<ImportDetail>(importKey(importId))
  if (cached && cached.status !== importStatus) {
    void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
  }
}

/** A run view answered by the API: it is the current one now, and the findings listed before may belong to another. */
export function storeRun(queryClient: QueryClient, view: ValidationRunView) {
  queryClient.setQueryData(validationRunKey(view.importId), view)
  void queryClient.invalidateQueries({ queryKey: [...validationRunKey(view.importId), 'issues'] })
  void queryClient.invalidateQueries({ queryKey: ['validation-issues'] })
  syncImportStatus(queryClient, view.importId, view.importStatus)
}

/** After a 409 of state: the run and the import as they stand on the server. */
export function reloadRunAndImport(queryClient: QueryClient, importId: string) {
  void queryClient.invalidateQueries({ queryKey: validationRunKey(importId) })
  void queryClient.invalidateQueries({ queryKey: importKey(importId), exact: true })
}

/** POST validations with a synchronous guard: two clicks in the same tick send one request (design D4). */
export function useRunValidations(importId: string) {
  const queryClient = useQueryClient()
  const guard = useRef(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const s = strings.run

  async function run() {
    if (guard.current) return
    guard.current = true
    setRunning(true)
    setError(null)
    try {
      storeRun(queryClient, await runValidations(importId))
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'import_changed') {
        setError(s.importChanged)
        reloadRunAndImport(queryClient, importId)
      } else if (failure instanceof ApiError && failure.code === 'import_not_analyzed') {
        setError(s.notAnalyzed((failure.details as ErrorDetails['import_not_analyzed']).status))
        reloadRunAndImport(queryClient, importId)
      } else if (failure instanceof ApiError && failure.status === 403) {
        setError(s.forbidden)
      } else {
        setError(s.failed)
      }
    } finally {
      guard.current = false
      setRunning(false)
    }
  }

  return { run, running, error }
}

export type RunValidations = ReturnType<typeof useRunValidations>

/** A finding answered by a PATCH: written into the cache; the run and its lists counted it, so they are read again. */
function storeIssue(queryClient: QueryClient, detail: ValidationIssueDetail) {
  queryClient.setQueryData(validationIssueKey(detail.issueId), detail)
  void queryClient.invalidateQueries({ queryKey: validationRunKey(detail.importId) })
  syncImportStatus(queryClient, detail.importId, detail.importStatus)
}

/**
 * The actions of the drawer on one finding (design D7): change an inclusion, resolve by hand. No optimistic update:
 * the screen shows what the server answers, and every 409 reads again what it may have made stale.
 */
export function useIssueActions(issue: ValidationIssueDetail) {
  const queryClient = useQueryClient()
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const e = strings.actionErrors

  const rereadIssue = () => void queryClient.invalidateQueries({ queryKey: validationIssueKey(issue.issueId) })

  function explain(failure: unknown) {
    if (!(failure instanceof ApiError)) return setMessage(e.failed)
    switch (failure.code) {
      case 'occurrence_not_includable': {
        const { reason } = failure.details as ErrorDetails['occurrence_not_includable']
        setMessage(e[reason])
        return rereadIssue()
      }
      case 'validation_run_superseded':
        setMessage(e.superseded)
        void queryClient.invalidateQueries({ queryKey: validationRunKey(issue.importId) })
        return rereadIssue()
      case 'import_not_editable':
        setMessage(e.importNotEditable((failure.details as ErrorDetails['import_not_editable']).status))
        reloadRunAndImport(queryClient, issue.importId)
        return rereadIssue()
      case 'occurrence_not_editable':
        setMessage(e.occurrenceNotEditable)
        return rereadIssue()
      case 'issue_already_resolved': {
        const { resolvedBy, resolvedAt } = failure.details as ErrorDetails['issue_already_resolved']
        setMessage(e.alreadyResolved(resolvedBy.userName, formatAuditDateTime(resolvedAt)))
        return rereadIssue()
      }
      case 'issue_not_resolvable':
        return setMessage(e.notResolvable)
      default:
        return setMessage(failure.status === 403 ? e.forbidden : e.failed)
    }
  }

  // The same synchronous guard as the run and the review: two clicks in the same tick send one PATCH.
  const guard = useRef(false)

  async function act(call: () => Promise<ValidationIssueDetail>): Promise<boolean> {
    if (guard.current) return false
    guard.current = true
    setPending(true)
    setMessage(null)
    try {
      storeIssue(queryClient, await call())
      return true
    } catch (failure) {
      explain(failure)
      return false
    } finally {
      guard.current = false
      setPending(false)
    }
  }

  return {
    pending,
    message,
    setInclusion: (occurrence: OccurrenceView, to: boolean) =>
      act(() => setOccurrenceInclusion(occurrence.occurrenceId, to)),
    resolve: (note: string) => act(() => resolveIssue(issue.issueId, note)),
  }
}

export type IssueActions = ReturnType<typeof useIssueActions>

/** POST review on the run shown, with the same synchronous guard as the run (design D9). */
export function useReview(importId: string) {
  const queryClient = useQueryClient()
  const guard = useRef(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const e = strings.decision.errors

  async function review(runId: number) {
    if (guard.current) return
    guard.current = true
    setPending(true)
    setError(null)
    try {
      storeRun(queryClient, await reviewImport(importId, runId))
    } catch (failure) {
      const code = failure instanceof ApiError ? failure.code : undefined
      if (code === 'validation_run_superseded') setError(e.superseded)
      else if (code === 'blocking_validation_issue') setError(e.blocking)
      else if (code === 'validation_run_required') setError(e.required)
      else if (code === 'import_not_analyzed')
        setError(e.notAnalyzed(((failure as ApiError).details as ErrorDetails['import_not_analyzed']).status))
      else setError(failure instanceof ApiError && failure.status === 403 ? e.forbidden : e.failed)
      if (code) reloadRunAndImport(queryClient, importId)
    } finally {
      guard.current = false
      setPending(false)
    }
  }

  return { review, pending, error }
}
