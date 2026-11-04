import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { accountQuery } from '@/features/accounts/queries'
import { ApiError } from '@/lib/api/client'
import { AccountFeesTable, type FeeAction } from './AccountFeesTable'
import { CloseFeeDialog } from './CloseFeeDialog'
import type { AccountFee } from './contract'
import { FeeFormSheet, type FeeFormTarget } from './FeeFormSheet'
import { focusAfterWrite } from './fee-focus'
import { useCanManageFees } from './permissions'
import { accountFeesQuery, feeTypesQuery } from './queries'
import { strings } from './strings'

const s = strings.account

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

/**
 * The Fees tab of Account Detail (README §1.3 Account Fees / Fee History, web-admin-accounts design D3): every fee
 * of the account, with History for everyone and the actions of fee.manage. The header of the account is the
 * detail's; this panel is the rest of what web-admin-fees built as a page.
 */
export function AccountFeesPanel() {
  const { accountId } = useParams({ from: '/app/accounts/$accountId/fees' })
  const account = useQuery(accountQuery(accountId))
  const fees = useQuery(accountFeesQuery(accountId))
  const feeTypes = useQuery(feeTypesQuery())
  const canManage = useCanManageFees()

  const [form, setForm] = useState<FeeFormTarget | null>(null)
  const [closing, setClosing] = useState<AccountFee | null>(null)
  // The fee just written: once its panel or dialog is gone, the focus goes to its History button.
  const [written, setWritten] = useState<string | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (written === null || form || closing) return
    focusAfterWrite(written, heading.current)
    setWritten(null)
  }, [written, form, closing])
  const onSaved = (feeId: string) => {
    setForm(null)
    setClosing(null)
    setWritten(feeId)
  }
  const onAction = (action: FeeAction, fee: AccountFee) => {
    if (action === 'close') setClosing(fee)
    else setForm({ mode: action === 'edit' ? 'correct' : 'change', fee })
  }

  const notAvailable = isNotFound(account.error) || isNotFound(fees.error)
  let body: ReactNode
  if (notAvailable) body = <p className="text-sm">{s.notAvailable}</p>
  else if (account.isError || fees.isError) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void Promise.all([account, fees].filter((q) => q.isError).map((q) => q.refetch()))}
        >
          {strings.retry}
        </Button>
      </div>
    )
  } else if (fees.data && account.data) {
    body =
      fees.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.empty}</p>
      ) : (
        <AccountFeesTable fees={fees.data} feeTypes={feeTypes.data} canManage={canManage} onAction={onAction} />
      )
  } else body = <Skeleton className="h-40 w-full" aria-label={s.loading} />

  const detail = notAvailable ? undefined : account.data
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 ref={heading} tabIndex={-1} className="font-medium focus-visible:outline-none">
              {s.heading}
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              {detail && (
                <Link
                  to="/fees"
                  search={{
                    merchantId: detail.merchant.merchantId,
                    providerId: detail.provider.providerId,
                    accountId: detail.accountId,
                    status: 'all',
                  }}
                  className="text-sm text-primary underline underline-offset-4"
                >
                  {s.seeAll}
                </Link>
              )}
              {canManage && detail && (
                <Button size="sm" onClick={() => setForm({ mode: 'create' })}>
                  {s.add}
                </Button>
              )}
            </div>
          </div>
          {body}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{s.note}</p>
      {canManage && form && (
        <FeeFormSheet
          // A new target is a new form, with its own values.
          key={`${form.mode}:${form.fee?.feeId ?? 'new'}`}
          target={form}
          accountId={accountId}
          feeTypes={feeTypes.data}
          onDone={() => setForm(null)}
          onSaved={onSaved}
        />
      )}
      {canManage && closing && (
        <CloseFeeDialog
          key={closing.feeId}
          fee={closing}
          accountId={accountId}
          onDone={() => setClosing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}
