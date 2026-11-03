import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ListHeading } from '@/lib/list-focus'
import { FeeFilters, type FiltersPatch, useFeeScope } from './FeeFilters'
import { FEES_LIST, FeesTable } from './FeesTable'
import { type FeesSearch, feesQueryOf } from './fees-search'
import { feesQuery, feeTypesQuery } from './queries'
import { strings } from './strings'

const s = strings.global

/**
 * Administration › Fees (README §1.3, web-admin-fees design D3): every fee of the accounts in scope, one page of the
 * server at a time, read only for every role. Everything the screen shows is in the address.
 */
export function FeesPage() {
  const search = useSearch({ from: '/app/fees' })
  const navigate = useNavigate({ from: '/fees' })
  const scope = useFeeScope(search)
  const query = feesQueryOf(search)
  const fees = useQuery(feesQuery(query, scope.state === 'ready'))
  const feeTypes = useQuery(feeTypesQuery())
  const page = search.page ?? 1

  // A new filter is a new list: back to its first page. The list changes in place (ui-polish design D13).
  const onFilters = (patch: FiltersPatch) =>
    void navigate({ search: (prev: FeesSearch) => ({ ...prev, ...patch, page: undefined }), resetScroll: false })
  const onPage = (next: number, options?: { replace?: boolean }) =>
    void navigate({
      search: (prev: FeesSearch) => ({ ...prev, page: next > 1 ? next : undefined }),
      replace: options?.replace,
      resetScroll: false,
    })

  let body: ReactNode
  if (scope.state === 'not_available') body = <p className="text-sm">{s.notAvailable}</p>
  else if (scope.state === 'error' || fees.isError) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void (scope.state === 'error' ? scope.retry() : fees.refetch())}
        >
          {strings.retry}
        </Button>
      </div>
    )
  } else if (fees.data) body = <FeesTable data={fees.data} page={page} feeTypes={feeTypes.data} onPage={onPage} />
  else body = <Skeleton className="h-40 w-full" aria-label={s.loading} />

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <FeeFilters search={search} scope={scope} onChange={onFilters} />
          {/* Above the table, so it is there while the next page loads (ui-polish design D13). */}
          <ListHeading name={FEES_LIST} focusKey={JSON.stringify(query)} as="h2" className="font-medium">
            {s.heading}
          </ListHeading>
          {body}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{s.note}</p>
    </section>
  )
}
