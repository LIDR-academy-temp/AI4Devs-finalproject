import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { PageMessage } from '@/app/pages/PageMessage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { settlementQuery } from './queries'
import { strings } from './strings'

const s = strings.summary

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

  const view = query.data
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.title(view.batchNo)}</h1>
    </section>
  )
}
