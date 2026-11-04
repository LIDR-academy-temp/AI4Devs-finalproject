import { useQuery } from '@tanstack/react-query'
import { Link, Outlet, useMatchRoute, useParams } from '@tanstack/react-router'
import { useState } from 'react'
import { AlertDialog, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetTrigger } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { useMe } from '@/lib/session/me'
import { ACCOUNT_STATUS_TONE } from '@/lib/status-tone'
import { AccountStatusDialog } from './AccountStatusDialog'
import type { AccountDetail } from './contract'
import { EditAccountSheet } from './EditAccountSheet'
import { useCanManageAccounts, useCanProcess } from './permissions'
import { accountQuery } from './queries'
import { strings } from './strings'

const s = strings.detail

const tabClass =
  'border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const selectedTab = 'border-primary text-foreground'
const otherTab = 'border-transparent text-muted-foreground hover:text-foreground'
const linkClass = 'text-sm text-primary underline underline-offset-4'

/** A malformed id (400) or an account missing or outside the scope (404): the same message, no data. */
const notAvailable = (error: unknown) => error instanceof ApiError && (error.status === 404 || error.status === 400)

/** The actions of the header, by permission and by isActive (spec "acciones de la cabecera"). */
function HeaderActions({ account }: { account: AccountDetail }) {
  const canManage = useCanManageAccounts()
  const canProcess = useCanProcess()
  const [open, setOpen] = useState<'edit' | 'status' | null>(null)
  const where = {
    merchantId: account.merchant.merchantId,
    providerId: account.provider.providerId,
    accountId: account.accountId,
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link to="/settlements" search={where} className={linkClass}>
        {s.actions.settlements}
      </Link>
      {canManage && (
        <>
          {/* Each action is the Trigger of its form, so closing the form gives the focus back to it. */}
          <Sheet open={open === 'edit'} onOpenChange={(next) => setOpen(next ? 'edit' : null)}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                {s.actions.edit}
              </Button>
            </SheetTrigger>
            {open === 'edit' && <EditAccountSheet account={account} onSaved={() => setOpen(null)} />}
          </Sheet>
          <AlertDialog open={open === 'status'} onOpenChange={(next) => setOpen(next ? 'status' : null)}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                {account.isActive ? s.actions.close : s.actions.reopen}
              </Button>
            </AlertDialogTrigger>
            {open === 'status' && <AccountStatusDialog account={account} onDone={() => setOpen(null)} />}
          </AlertDialog>
        </>
      )}
      {canProcess && account.isActive && (
        <Button asChild size="sm">
          <Link to="/reconciliations/new" search={where}>
            {s.actions.newReconciliation}
          </Link>
        </Button>
      )}
    </div>
  )
}

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

  if (notAvailable(account.error)) return <p className="text-sm">{s.notAvailable}</p>
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
  const status = detail?.isActive ? 'active' : 'closed'
  return (
    <section className="flex flex-col gap-4">
      <section aria-label={s.headerLabel} className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{detail ? detail.name : s.titleLoading}</h1>
            {detail && <Badge variant={ACCOUNT_STATUS_TONE[status]}>{strings[status]}</Badge>}
          </div>
          {detail ? (
            <p className="text-sm text-muted-foreground">{s.hierarchy(detail.merchant.name, detail.provider.name)}</p>
          ) : (
            <Skeleton className="h-4 w-48" aria-label={s.loading} />
          )}
        </div>
        {detail && <HeaderActions account={detail} />}
      </section>
      {/* The sections are routes, so they are links in a nav, the current one marked as the page: tab roles would
          promise arrow-key navigation within one page that these links do not have. */}
      <nav aria-label={s.tabs.label} className="flex gap-1 border-b">
        <Link
          to="/accounts/$accountId"
          params={{ accountId }}
          activeOptions={{ exact: true }}
          aria-current={onFees ? undefined : 'page'}
          className={`${tabClass} ${onFees ? otherTab : selectedTab}`}
        >
          {s.tabs.overview}
        </Link>
        {canSeeFees && (
          <Link
            to="/accounts/$accountId/fees"
            params={{ accountId }}
            aria-current={onFees ? 'page' : undefined}
            className={`${tabClass} ${onFees ? selectedTab : otherTab}`}
          >
            {s.tabs.fees}
          </Link>
        )}
      </nav>
      <Outlet />
    </section>
  )
}
