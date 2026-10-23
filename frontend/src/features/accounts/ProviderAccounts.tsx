import { useQueries, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { AccountChannelItem, AccountSummary } from '@/lib/api/types'
import { formatDecimal } from '@/lib/format'
import { accountChannelsQuery, providerQuery, unassignedChannelsQuery } from './queries'
import { strings } from './strings'

function ChannelList({ channels }: { channels: AccountChannelItem[] | undefined }) {
  if (!channels) return <span className="text-muted-foreground">{strings.loadingChannels}</span>
  if (channels.length === 0) return <span className="text-muted-foreground">{strings.noChannels}</span>
  return (
    <ul className="flex flex-col gap-1">
      {channels.map((channel) => (
        <li key={channel.channelId} className="flex flex-wrap items-center gap-1.5">
          <span>{channel.name}</span>
          {channel.isPrimary ? (
            <Badge variant="secondary" className="border-emerald-300 bg-emerald-50 text-emerald-800">
              {strings.primary}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">
              {strings.historical} ·{' '}
              {channel.primaryAccount ? strings.primaryIn(channel.primaryAccount.name) : strings.noPrimary}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function AccountRow({
  account,
  merchantId,
  channels,
}: {
  account: AccountSummary
  merchantId: number
  channels: AccountChannelItem[] | undefined
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{account.name}</TableCell>
      <TableCell>
        <ChannelList channels={channels} />
      </TableCell>
      <TableCell>{account.chargebackReservePolicy}</TableCell>
      <TableCell className="tabular-nums">
        {account.rollingReserveCapAmt === null ? strings.none : formatDecimal(account.rollingReserveCapAmt)}
      </TableCell>
      <TableCell>
        <Badge variant="outline">{account.isActive ? strings.active : strings.closed}</Badge>
      </TableCell>
      <TableCell>
        {/* Closed accounts too: their settlements are still there (spec accounts, settlements-browse D8). */}
        <Link
          to="/settlements"
          search={{ merchantId, providerId: account.providerId, accountId: account.accountId }}
          aria-label={strings.settlementsOf(account.name)}
          className="text-primary underline underline-offset-4"
        >
          {strings.settlements}
        </Link>
      </TableCell>
    </TableRow>
  )
}

/** Accounts of one provider, their channels and the "not assigned yet" warning (openspec/specs/accounts). */
export function ProviderAccounts({ providerId }: { providerId: number }) {
  const provider = useQuery(providerQuery(providerId))
  const unassigned = useQuery(unassignedChannelsQuery)
  const accounts = provider.data?.accounts ?? []
  const channels = useQueries({ queries: accounts.map((a) => accountChannelsQuery(a.accountId)) })

  const failed = [provider, unassigned, ...channels].filter((query) => query.isError)
  if (failed.length > 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{strings.loadError}</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => Promise.all(failed.map((query) => query.refetch()))}>
            {strings.retry}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  if (!provider.data) return <p className="text-muted-foreground">{strings.loading}</p>

  const pending = (unassigned.data ?? []).filter((c) => c.providerId === providerId).map((c) => c.name)

  return (
    <div className="flex flex-col gap-4">
      {pending.length > 0 && (
        <Alert aria-labelledby="unassigned-title" className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTitle id="unassigned-title">{strings.unassignedTitle}</AlertTitle>
          <AlertDescription className="text-amber-900">{strings.unassignedBody(pending)}</AlertDescription>
        </Alert>
      )}
      {accounts.length === 0 ? (
        <p className="text-muted-foreground">{strings.noAccounts}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{strings.columns.account}</TableHead>
              <TableHead>{strings.columns.channels}</TableHead>
              <TableHead>{strings.columns.reservePolicy}</TableHead>
              <TableHead>{strings.columns.reserveCap}</TableHead>
              <TableHead>{strings.columns.status}</TableHead>
              <TableHead>{strings.columns.settlements}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account, index) => (
              <AccountRow
                key={account.accountId}
                account={account}
                merchantId={provider.data.merchantId}
                channels={channels[index]?.data}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
