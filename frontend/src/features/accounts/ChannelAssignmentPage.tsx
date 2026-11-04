import { useQueries, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { type ReactNode, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ChannelAccountItem, ChannelListItem, ProviderSummary } from '@/lib/api/types'
import { chooseMerchant, chooseProvider } from './channel-assignment-search'
import { batchLabel, termReserve } from './channel-display'
import { channelAccountsQuery, channelsQuery, merchantsQuery, providersQuery, unassignedChannelsQuery } from './queries'
import { strings } from './strings'

const s = strings.channelAssignment

const selectClass =
  'h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)

/**
 * The primary account of a channel, the batch since which it is, and its historical accounts. The accounts of the
 * channel are read by the page, so a failed read shows its error and its Retry like every other query.
 */
function PrimaryRow({
  channel,
  provider,
  accounts,
}: {
  channel: ChannelListItem
  provider: string
  accounts: ChannelAccountItem[] | undefined
}) {
  const primaryRow = accounts?.find((a) => a.isPrimary)
  const historical = (accounts ?? []).filter((a) => !a.isPrimary).sort(byName)
  const pending = <Skeleton className="h-4 w-16" />
  const loaded = accounts !== undefined
  return (
    <TableRow>
      <TableCell className="font-medium">{channel.name}</TableCell>
      <TableCell>{provider}</TableCell>
      <TableCell>
        {channel.primaryAccount ? (
          <Link
            to="/accounts/$accountId"
            params={{ accountId: channel.primaryAccount.accountId }}
            className="text-primary underline underline-offset-4"
          >
            {channel.primaryAccount.name}
          </Link>
        ) : (
          strings.channel.none
        )}
      </TableCell>
      <TableCell>{loaded ? batchLabel(primaryRow?.assignedInBatchNo ?? null) : pending}</TableCell>
      <TableCell className="whitespace-normal">
        {loaded ? historical.map((a) => a.name).join(', ') || strings.channel.none : pending}
      </TableCell>
    </TableRow>
  )
}

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <Card>
      <CardContent>
        <section aria-labelledby={id} className="flex flex-col gap-4">
          <h2 id={id} className="font-medium">
            {heading}
          </h2>
          {children}
        </section>
      </CardContent>
    </Card>
  )
}

/**
 * Administration › Channel Assignment (README §1.3, web-admin-accounts design D8): the channels waiting for an
 * account and the primary account of every other channel. Read only: channels join accounts by processing settlements.
 */
export function ChannelAssignmentPage() {
  const search = useSearch({ from: '/app/channel-assignment' })
  const navigate = useNavigate({ from: '/channel-assignment' })
  const ids = { merchant: useId(), provider: useId(), unassigned: useId(), primary: useId() }

  const merchants = useQuery(merchantsQuery)
  const providerLists = useQueries({ queries: (merchants.data ?? []).map((m) => providersQuery(m.merchantId)) })
  const channels = useQuery(channelsQuery)
  const unassigned = useQuery(unassignedChannelsQuery)

  const providers = new Map<number, ProviderSummary>(
    providerLists.flatMap((q) => q.data ?? []).map((p) => [p.providerId, p]),
  )
  const merchantName = new Map((merchants.data ?? []).map((m) => [m.merchantId, m.name]))
  const merchantVisible = merchants.data?.some((m) => m.merchantId === search.merchantId) ?? false
  const merchantProviders = [...providers.values()].filter((p) => p.merchantId === search.merchantId).sort(byName)
  const providersLoaded = providerLists.length > 0 && providerLists.every((q) => q.isSuccess)
  const notAvailable =
    (merchants.isSuccess && search.merchantId !== undefined && !merchantVisible) ||
    (providersLoaded &&
      search.providerId !== undefined &&
      !merchantProviders.some((p) => p.providerId === search.providerId))

  /** Within the filters: one provider, the providers of one merchant, or the whole scope. */
  const inFilter = (channel: { providerId: number }) =>
    search.providerId !== undefined
      ? channel.providerId === search.providerId
      : search.merchantId === undefined || providers.get(channel.providerId)?.merchantId === search.merchantId

  // The rows of each section, once the lists are there; the accounts of every primary row are read in parallel here,
  // with the same cache per channel as the rest of the app.
  const waiting = new Set((unassigned.data ?? []).map((c) => c.channelId))
  const pendingRows = (unassigned.data ?? []).filter(inFilter).sort(byName)
  const primaryRows = unassigned.data
    ? (channels.data ?? []).filter((c) => !waiting.has(c.channelId) && inFilter(c)).sort(byName)
    : []
  const channelAccounts = useQueries({ queries: primaryRows.map((c) => channelAccountsQuery(c.channelId)) })

  const failed = [merchants, channels, unassigned, ...providerLists, ...channelAccounts].filter((q) => q.isError)
  const providerName = (providerId: number) => providers.get(providerId)?.name ?? ''
  const hierarchy = (providerId: number) => {
    const provider = providers.get(providerId)
    return provider ? strings.detail.hierarchy(merchantName.get(provider.merchantId) ?? '', provider.name) : ''
  }

  let body: ReactNode
  if (notAvailable) body = <p className="text-sm">{s.notAvailable}</p>
  else if (failed.length > 0) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{s.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void Promise.all(failed.map((q) => q.refetch()))}>
          {strings.retry}
        </Button>
      </div>
    )
  } else if (!channels.data || !unassigned.data || !providersLoaded) {
    body = <Skeleton className="h-40 w-full" aria-label={s.loading} />
  } else {
    body = (
      <>
        <Section id={ids.unassigned} heading={s.unassigned.heading(pendingRows.length)}>
          {pendingRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{s.unassigned.empty}</p>
          ) : (
            <Table aria-label={s.unassigned.tableLabel}>
              <TableHeader>
                <TableRow>
                  <TableHead>{s.unassigned.columns.channel}</TableHead>
                  <TableHead>{s.unassigned.columns.gateway}</TableHead>
                  <TableHead>{s.unassigned.columns.merchantProvider}</TableHead>
                  <TableHead>{s.unassigned.columns.termReserve}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingRows.map((channel) => (
                  <TableRow key={channel.channelId}>
                    <TableCell className="font-medium">{channel.name}</TableCell>
                    <TableCell>{strings.detail.channels.gateway(channel.gatewayId)}</TableCell>
                    <TableCell>{hierarchy(channel.providerId)}</TableCell>
                    <TableCell className="tabular-nums">{termReserve(channel)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
        <Section id={ids.primary} heading={s.primary.heading}>
          {primaryRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{s.primary.empty}</p>
          ) : (
            <Table aria-label={s.primary.tableLabel}>
              <TableHeader>
                <TableRow>
                  <TableHead>{s.primary.columns.channel}</TableHead>
                  <TableHead>{s.primary.columns.provider}</TableHead>
                  <TableHead>{s.primary.columns.primary}</TableHead>
                  <TableHead>{s.primary.columns.since}</TableHead>
                  <TableHead>{s.primary.columns.historical}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {primaryRows.map((channel, index) => (
                  <PrimaryRow
                    key={channel.channelId}
                    channel={channel}
                    provider={providerName(channel.providerId)}
                    accounts={channelAccounts[index]?.data}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </Section>
      </>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{s.title}</h1>
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.merchant} className="text-sm font-medium">
            {s.merchant}
          </label>
          <select
            id={ids.merchant}
            className={selectClass}
            value={merchantVisible ? String(search.merchantId) : ''}
            onChange={(event) => void navigate({ search: chooseMerchant(event.target.value), resetScroll: false })}
          >
            <option value="">{s.allMerchants}</option>
            {merchants.data?.map((m) => (
              <option key={m.merchantId} value={m.merchantId}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.provider} className="text-sm font-medium">
            {s.provider}
          </label>
          <select
            id={ids.provider}
            className={selectClass}
            disabled={!merchantVisible}
            value={merchantProviders.some((p) => p.providerId === search.providerId) ? String(search.providerId) : ''}
            onChange={(event) =>
              void navigate({ search: chooseProvider(search, event.target.value), resetScroll: false })
            }
          >
            <option value="">{s.allProviders}</option>
            {merchantProviders.map((p) => (
              <option key={p.providerId} value={p.providerId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {body}
      <p className="text-xs text-muted-foreground">{s.note}</p>
    </section>
  )
}
