import type { ValidationCode } from '@recon/shared'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { CancelImportDialog } from '@/features/imports/CancelImportDialog'
import { useImportAccess } from '@/features/imports/permissions'
import type { ImportDetail } from '@/lib/api/types'
import { formatAuditDateTime } from '@/lib/format'
import type { ValidationRunView } from './contract'
import type { Review } from './mutations'
import { settlementReviewRoute, settlementSummaryRoute } from './next-step'
import { strings } from './strings'

const s = strings.decision

/**
 * One decision on the whole (design D9): continue on the run shown, or cancel and reprocess. Continue is offered on
 * an analyzed import and waits for a run that is not blocked; validated, the screen says who reviewed and offers
 * the next step.
 */
export function DecisionBar({
  detail,
  view,
  reviewer,
  busy,
  busyId,
  onShowBlocking,
}: {
  detail: ImportDetail
  view: ValidationRunView
  /** The review lives in the section, so Run waits for it too. */
  reviewer: Review
  /** A run, a review or a change of the drawer is on its way; `busyId` is the text that says which. */
  busy: boolean
  busyId: string
  onShowBlocking: (validation: ValidationCode) => void
}) {
  const { canProcess, cancellable } = useImportAccess(detail.status)
  const reasonId = useId()
  const run = view.run
  const reason = !run ? s.noRun : run.blocked ? s.blocked : null

  // A cancelled or processed import has nothing left to decide: the section says so instead of standing empty.
  // The API does not say who cancelled, so the text names only the status; a processed one links to its attempt.
  if (view.importStatus === 'cancelled' || view.importStatus === 'processed') {
    return (
      <section aria-label={s.label} className="flex flex-wrap items-center gap-3 border-t pt-3 text-sm">
        <p className="text-muted-foreground">{s.closed[view.importStatus]}</p>
        {view.importStatus === 'processed' && detail.currentBatchId && (
          <Link
            {...settlementSummaryRoute(detail.currentBatchId)}
            className="text-primary underline underline-offset-4"
          >
            {s.viewSummary}
          </Link>
        )}
      </section>
    )
  }
  // Without the permission there is no decision to take on an analyzed import.
  if (view.importStatus === 'analyzed' && !canProcess) return null

  return (
    <section aria-label={s.label} className="flex flex-col gap-2 border-t pt-3">
      <div className="flex flex-wrap items-start gap-3">
        {view.importStatus === 'analyzed' && canProcess && (
          <Button
            size="sm"
            onClick={() => run && void reviewer.review(run.runId)}
            disabled={reason !== null || busy}
            aria-describedby={[reason && reasonId, busy && busyId].filter(Boolean).join(' ') || undefined}
          >
            {s.continue}
          </Button>
        )}
        {view.importStatus === 'validated' && (
          <>
            {run?.review && (
              <span className="self-center text-sm">
                {s.reviewedBy(run.review.reviewedBy.userName, formatAuditDateTime(run.review.reviewedAt))}
              </span>
            )}
            {/* The screen requires settlement.process: without it there is no step to offer. */}
            {canProcess && (
              <Button asChild size="sm">
                <Link {...settlementReviewRoute(detail.importId)}>{s.settlementReview}</Link>
              </Button>
            )}
          </>
        )}
        {canProcess && (
          <CancelImportDialog
            detail={detail}
            cancellable={cancellable}
            disabled={busy}
            describedBy={busy ? busyId : undefined}
            label={s.cancel}
          />
        )}
      </div>
      {view.importStatus === 'analyzed' && canProcess && reason && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p id={reasonId} className={run?.blocked ? 'text-destructive' : 'text-muted-foreground'}>
            {reason}
          </p>
          {run?.blocked && (
            <Button variant="link" size="sm" onClick={() => onShowBlocking('provider_mismatch')}>
              {s.viewBlocking}
            </Button>
          )}
        </div>
      )}
      <div aria-live="polite" className="text-sm">
        {reviewer.error && <p className="text-destructive">{reviewer.error}</p>}
      </div>
    </section>
  )
}
