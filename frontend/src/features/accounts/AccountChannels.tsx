import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { batchLabel, roleOf, termReserve } from './channel-display'
import { accountChannelsQuery } from './queries'
import { strings } from './strings'

const s = strings.detail.channels

/**
 * The channels of the account in its Overview (spec accounts "Pantalla Account Detail: canales", design D4): the
 * role of each one here, the batch that associated it, term and reserve. Read only: channels join accounts by
 * processing settlements.
 */
export function AccountChannels({ accountId }: { accountId: string }) {
  const channels = useQuery(accountChannelsQuery(accountId))

  let body: ReactNode
  if (channels.isError) {
    body = (
      <div className="flex items-center gap-3 text-sm">
        <span>{strings.detail.loadError}</span>
        <Button variant="outline" size="sm" onClick={() => void channels.refetch()}>
          {strings.retry}
        </Button>
      </div>
    )
  } else if (!channels.data) body = <Skeleton className="h-24 w-full" aria-label={strings.loadingChannels} />
  else if (channels.data.length === 0) body = <p className="text-sm text-muted-foreground">{s.empty}</p>
  else {
    const rows = [...channels.data].sort((a, b) => a.name.localeCompare(b.name))
    body = (
      <Table aria-label={s.tableLabel}>
        <TableHeader>
          <TableRow>
            <TableHead>{s.columns.channel}</TableHead>
            <TableHead>{s.columns.gateway}</TableHead>
            <TableHead>{s.columns.role}</TableHead>
            <TableHead>{s.columns.since}</TableHead>
            <TableHead>{s.columns.termReserve}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((channel) => (
            <TableRow key={channel.channelId} className={channel.isPrimary ? undefined : 'text-muted-foreground'}>
              <TableCell className="font-medium">{channel.name}</TableCell>
              <TableCell>{s.gateway(channel.gatewayId)}</TableCell>
              <TableCell className="whitespace-normal [overflow-wrap:anywhere]">{roleOf(channel)}</TableCell>
              <TableCell>{batchLabel(channel.assignedInBatchNo)}</TableCell>
              <TableCell className="tabular-nums">{termReserve(channel)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="font-medium">{s.heading}</h2>
        {body}
        <p className="text-xs text-muted-foreground">{s.note}</p>
      </CardContent>
    </Card>
  )
}
