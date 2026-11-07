import type { ChannelNoticeItem } from '@/lib/api/types'
import { strings } from '../strings'

const s = strings.analysis.channels

/**
 * What processing will do with a channel; channels and accounts of another merchant are named only as such. A channel
 * of another provider is said to be so, whatever its assignment: processing never assigns it (design D3). The hidden
 * one already says it is not of this merchant. A primary account without a name can only be that of a channel of
 * another provider, which never gets here; `primaryElsewhere` stays as a fallback the type allows (D4).
 */
function describe(channel: ChannelNoticeItem): string {
  if (channel.outOfScope || channel.name === null) {
    const hidden = s.hiddenChannel(channel.channelId)
    if (channel.otherProvider) return hidden
    return describeAssignment(channel, hidden)
  }
  return channel.otherProvider ? s.otherProvider(channel.name) : describeAssignment(channel, channel.name)
}

function describeAssignment(channel: ChannelNoticeItem, name: string): string {
  if (channel.assignment === 'unassigned') return s.unassigned(name)
  const other = channel.otherAccount
  return other && other.name !== null ? s.primaryIn(name, other.name) : s.primaryElsewhere(name)
}

/**
 * Channels not assigned to this account and channels of another provider (specs "Resultado del análisis: aviso de
 * canales" and "canal de otro proveedor"); absent when none.
 */
export function ChannelNotice({ channels }: { channels: readonly ChannelNoticeItem[] }) {
  const toReview = channels.filter((c) => c.otherProvider === true || c.assignment !== 'assigned')
  if (toReview.length === 0) return null

  return (
    <section
      aria-label={s.title}
      className="flex flex-col gap-2 rounded-md border border-amber-500/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30"
    >
      <h3 className="font-medium">{s.title}</h3>
      <ul className="flex flex-col gap-1.5">
        {toReview.map((channel) => (
          <li
            key={channel.channelId}
            className="flex flex-col"
            data-other-provider={channel.otherProvider ? '' : undefined}
          >
            <span>
              <span className="font-medium">{describe(channel)}</span>
              <span className="text-muted-foreground"> · {s.rows(channel.rowCount)}</span>
            </span>
            {channel.note && <span className="text-xs text-muted-foreground">{channel.note}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
