import type { ValidationCode } from '@recon/shared'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { CancelImportDialog } from '@/features/imports/CancelImportDialog'
import { useImportAccess } from '@/features/imports/permissions'
import type { ImportDetail } from '@/lib/api/types'
import { formatAuditDateTime } from '@/lib/format'
import type { ValidationRunView } from './contract'
import { useReview } from './mutations'
import { SETTLEMENT_REVIEW } from './next-step'
import { strings } from './strings'

const s = strings.decision

/** Settlement Review: a link once #13 gives it a route, a disabled entry with its reason until then. */
function SettlementReview() {
  const reasonId = useId()
  if (SETTLEMENT_REVIEW) {
    return (
      <Button asChild size="sm">
        <Link to={SETTLEMENT_REVIEW.to}>{s.settlementReview}</Link>
      </Button>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" disabled aria-describedby={reasonId}>
        {s.settlementReview}
      </Button>
      <p id={reasonId} className="text-xs text-muted-foreground">
        {s.notAvailable}
      </p>
    </div>
  )
}

/**
 * One decision on the whole (design D9): continue on the run shown, or cancel and reprocess. Continue is offered on
 * an analyzed import and waits for a run that is not blocked; validated, the screen says who reviewed and offers
 * the next step.
 */
export function DecisionBar({
  detail,
  view,
  running,
  onShowBlocking,
}: {
  detail: ImportDetail
  view: ValidationRunView
  running: boolean
  onShowBlocking: (validation: ValidationCode) => void
}) {
  const { canProcess, cancellable } = useImportAccess(detail.status)
  const reviewer = useReview(detail.importId)
  const reasonId = useId()
  const run = view.run
  const reason = !run ? s.noRun : run.blocked ? s.blocked : null

  // A cancelled or processed import has nothing left to decide: the section says so instead of standing empty.
  // The API does not say who cancelled, so the text names only the status.
  if (view.importStatus === 'cancelled' || view.importStatus === 'processed') {
    return (
      <section aria-label={s.label} className="border-t pt-3 text-sm text-muted-foreground">
        <p>{s.closed[view.importStatus]}</p>
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
            disabled={reason !== null || running || reviewer.pending}
            aria-describedby={reason ? reasonId : undefined}
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
            <SettlementReview />
          </>
        )}
        {canProcess && (
          <CancelImportDialog detail={detail} cancellable={cancellable} disabled={running} label={s.cancel} />
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
