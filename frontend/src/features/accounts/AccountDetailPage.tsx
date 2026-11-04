import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useMatchRoute, useParams } from '@tanstack/react-router'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { useMe } from '@/lib/session/me'
import { accountQuery } from './queries'
import { strings } from './strings'

const s = strings.detail

const tabClass =
  'border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const selectedTab = 'border-primary text-foreground'
const otherTab = 'border-transparent text-muted-foreground hover:text-foreground'

/**
 * Administration › Accounts › Account detail (README §1.3, web-admin-accounts design D2, D4): the header of the
 * account and its tabs. Each tab is a route, so reloading or sharing keeps it; the tab content is the Outlet.
 */
export function AccountDetailPage() {
  const { accountId } = useParams({ from: '/app/accounts/$accountId' })
  const account = useQuery(accountQuery(accountId))
  const canSeeFees = useMe().permissions.includes('fee.view')
  const matchRoute = useMatchRoute()
  const onFees = Boolean(matchRoute({ to: '/accounts/$accountId/fees', params: { accountId } }))
  const overviewTabId = useId()
  const feesTabId = useId()

  if (account.error instanceof ApiError && account.error.status === 404) {
    return <p className="text-sm">{s.notAvailable}</p>
  }
  if (account.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void account.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  }

  const detail = account.data
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{detail ? detail.name : s.titleLoading}</h1>
        {detail ? (
          <p className="text-sm text-muted-foreground">{s.hierarchy(detail.merchant.name, detail.provider.name)}</p>
        ) : (
          <Skeleton className="h-4 w-48" aria-label={s.loading} />
        )}
      </div>
      <div role="tablist" aria-label={s.tabs.label} className="flex gap-1 border-b">
        <Link
          id={overviewTabId}
          role="tab"
          aria-selected={!onFees}
          to="/accounts/$accountId"
          params={{ accountId }}
          className={`${tabClass} ${onFees ? otherTab : selectedTab}`}
        >
          {s.tabs.overview}
        </Link>
        {canSeeFees && (
          <Link
            id={feesTabId}
            role="tab"
            aria-selected={onFees}
            to="/accounts/$accountId/fees"
            params={{ accountId }}
            className={`${tabClass} ${onFees ? selectedTab : otherTab}`}
          >
            {s.tabs.fees}
          </Link>
        )}
      </div>
      <div role="tabpanel" aria-labelledby={onFees ? feesTabId : overviewTabId}>
        <Outlet />
      </div>
    </section>
  )
}
