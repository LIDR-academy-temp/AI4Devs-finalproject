import type { ChannelNoticeItem } from '@/lib/api/types'
import { strings } from '../strings'

const s = strings.analysis.channels

/** What processing will do with a channel; channels and accounts of another merchant are named only as such. */
function describe(channel: ChannelNoticeItem): string {
  const name = channel.outOfScope || channel.name === null ? s.hiddenChannel(channel.channelId) : channel.name
  if (channel.assignment === 'unassigned') return s.unassigned(name)
  const other = channel.otherAccount
  return other && other.name !== null ? s.primaryIn(name, other.name) : s.primaryElsewhere(name)
}

/** Channels not assigned to this account (spec "Resultado del análisis: aviso de canales"); absent when none. */
export function ChannelNotice({ channels }: { channels: readonly ChannelNoticeItem[] }) {
  const toReview = channels.filter((c) => c.assignment !== 'assigned')
  if (toReview.length === 0) return null

  return (
    <section
      aria-label={s.title}
      className="flex flex-col gap-2 rounded-md border border-amber-500/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30"
    >
      <h3 className="font-medium">{s.title}</h3>
      <ul className="flex flex-col gap-1.5">
        {toReview.map((channel) => (
          <li key={channel.channelId} className="flex flex-col">
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
