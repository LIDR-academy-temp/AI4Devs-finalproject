import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { accountQuery } from '@/features/accounts/queries'
import { importQuery } from '@/features/imports/queries'
import { settlementSummaryRoute } from '@/features/validations/next-step'
import { ApiError } from '@/lib/api/client'
import type { ImportDetail } from '@/lib/api/types'
import { ReviewWorkspace } from './ReviewWorkspace'
import { strings } from './strings'

const s = strings.review
const linkClass = 'text-primary underline underline-offset-4'

/** Merchant › Provider › Account of the import, its status and the way back to the Analysis step. */
function ReviewHeader({ detail }: { detail: ImportDetail }) {
  const account = useQuery(accountQuery(detail.accountId))
  return (
    <section aria-label={s.title} className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{s.title}</h1>
        <p className="text-sm text-muted-foreground">
          {account.data ? `${account.data.merchant.name} › ${account.data.provider.name} › ${account.data.name}` : ' '}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{s.status}</span>
          <Badge variant="outline">{detail.status}</Badge>
        </span>
        <Link
          to="/imports/$importId"
          params={{ importId: detail.importId }}
          search={{ step: 'analysis' }}
          className={linkClass}
        >
          {s.backToAnalysis}
        </Link>
      </div>
    </section>
  )
}

/** Why there is no form for an import that is not validated, and where to go on (design D13). */
function NotReviewable({ detail }: { detail: ImportDetail }) {
  if (detail.status === 'processed') {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p>{s.processed}</p>
        {detail.currentBatchId && (
          <Link {...settlementSummaryRoute(detail.currentBatchId)} className={linkClass}>
            {s.viewSummary}
          </Link>
        )}
      </div>
    )
  }
  if (detail.status === 'cancelled') return <p className="text-sm">{s.cancelled}</p>
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <p>{s.notValidated}</p>
      <Link
        to="/imports/$importId"
        params={{ importId: detail.importId }}
        search={{ step: 'analysis' }}
        className={linkClass}
      >
        {s.toAnalysis}
      </Link>
    </div>
  )
}

/**
 * Reconciliation › Settlement Review of an import (design D1, D13). The route requires settlement.process; the form
 * exists only for a validated import, and its reads (number, fees, types, preview) start only then.
 */
export function SettlementReviewPage() {
  const { importId } = useParams({ from: '/app/imports/$importId/settlement-review' })
  const query = useQuery(importQuery(importId))

  if (query.isPending) return <Skeleton className="h-40 w-full" aria-label={s.loading} />
  if (query.isError) {
    const gone = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)
    return gone ? (
      <p className="text-sm">{s.notAvailable}</p>
    ) : (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }

  const detail = query.data
  return (
    <section className="flex flex-col gap-4">
      <ReviewHeader detail={detail} />
      {detail.status === 'validated' ? <ReviewWorkspace detail={detail} /> : <NotReviewable detail={detail} />}
    </section>
  )
}
