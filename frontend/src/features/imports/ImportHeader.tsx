import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { accountQuery } from '@/features/accounts/queries'
import type { ImportDetail } from '@/lib/api/types'
import { strings } from './strings'

/** Merchant › Provider › Account of the import and its status. */
export function ImportHeader({ detail, actions }: { detail: ImportDetail; actions?: ReactNode }) {
  const account = useQuery(accountQuery(detail.accountId))

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
        {actions}
      </div>
    </section>
  )
}
