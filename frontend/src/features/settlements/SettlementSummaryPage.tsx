import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { PageMessage } from '@/app/pages/PageMessage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCanProcess } from '@/features/imports/permissions'
import { ApiError } from '@/lib/api/client'
import type { SettlementView } from './contract'
import { TotalsByBrand, TotalsByType } from './FiguresTables'
import { PayableBreakdown } from './PayableBreakdown'
import { settlementQuery } from './queries'
import { SummaryExports } from './SummaryExports'
import { SummaryFees, SummaryReserves } from './SummaryFees'
import { SummaryHeader } from './SummaryHeader'
import { SummaryIssues } from './SummaryIssues'
import { strings } from './strings'

const s = strings.summary

/** The attempt as the API sent it (design D11): every figure from the view, nothing added up here. */
function Summary({ view }: { view: SettlementView }) {
  const canProcess = useCanProcess()
  return (
    <section className="flex flex-col gap-4">
      <SummaryHeader view={view} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{s.totals}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="tabular-nums">{strings.preSummary.movements(view.movements)}</p>
            <TotalsByType
              totals={view.totals}
              reservesReleased={{ qty: view.reservesReleasedQty, amount: view.reserveReleasedAmt }}
            />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{s.brands}</CardTitle>
            </CardHeader>
            <CardContent>
              <TotalsByBrand brands={view.brandTotals} />
            </CardContent>
          </Card>
          <SummaryFees view={view} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{s.payable}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <SummaryReserves view={view} />
            <PayableBreakdown lines={view.payableBreakdown} amountPayable={view.amountPayable} />
          </CardContent>
        </Card>
      </div>
      <SummaryIssues view={view} />
      <SummaryExports view={view} />
      <div className="flex flex-wrap justify-between gap-3 border-t pt-3 text-sm">
        <Link to="/" className="text-primary underline underline-offset-4">
          {s.backToDashboard}
        </Link>
        {canProcess && (
          <Link to="/reconciliations/new" className="text-primary underline underline-offset-4">
            {s.newReconciliation}
          </Link>
        )}
      </div>
    </section>
  )
}

/**
 * Reconciliation › Settlement Summary of an attempt (design D1, D11): the 201 of Process seeded in the cache or, on
 * a reload, GET /settlements/{id}. Anyone in scope may read it; nothing on it writes.
 */
export function SettlementSummaryPage() {
  const { batchId } = useParams({ from: '/app/settlements/$batchId' })
  const query = useQuery(settlementQuery(batchId))

  if (query.isPending) return <Skeleton className="h-40 w-full" aria-label={s.loading} />
  if (query.isError) {
    if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) {
      return <PageMessage title={s.notFoundTitle} body={s.notFoundBody} />
    }
    return (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }
  return <Summary view={query.data} />
}
