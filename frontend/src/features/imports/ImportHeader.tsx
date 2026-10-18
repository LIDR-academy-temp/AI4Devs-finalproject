import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { accountQuery } from '@/features/accounts/queries'
import type { ImportDetail } from '@/lib/api/types'
import { CancelImportDialog } from './CancelImportDialog'
import { useImportAccess } from './permissions'
import { strings } from './strings'

/** Merchant › Provider › Account of the import, its status and Cancel import (design D10). */
export function ImportHeader({ detail, busy }: { detail: ImportDetail; busy: boolean }) {
  const account = useQuery(accountQuery(detail.accountId))
  const { canProcess, cancellable } = useImportAccess(detail.status)

  return (
    <section aria-label={strings.header.label} className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{strings.importTitle}</h1>
        <p className="text-sm text-muted-foreground">
          {account.data ? `${account.data.merchant.name} › ${account.data.provider.name} › ${account.data.name}` : ' '}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">{strings.header.status}</span>
          <Badge variant="outline">{detail.status}</Badge>
        </span>
        {canProcess && <CancelImportDialog detail={detail} cancellable={cancellable} disabled={busy} />}
        {detail.status === 'cancelled' && canProcess && account.data && (
          <Link
            to="/reconciliations/new"
            search={{
              merchantId: account.data.merchant.merchantId,
              providerId: account.data.providerId,
              accountId: account.data.accountId,
            }}
            className="text-sm text-primary underline underline-offset-4"
          >
            {strings.cancel.startNew}
          </Link>
        )}
      </div>
    </section>
  )
}
