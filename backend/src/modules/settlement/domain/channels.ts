// Channels of a batch (settlement-process design D14): their names, the ones the account has to become primary of
// (with the analyst's confirmation), and the VARCHAR(100) label kept in SettlementBatch.channels.
import type { ChannelToAssign } from '@recon/shared'
import type { MovementPlan, SettlementChannel } from './types.js'

const LABEL_MAX = 100
const ELLIPSIS = '…'
const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export interface BatchChannels {
  names: string[]
  /** Names joined by commas; cut at the last whole name with "…" when longer than 100 characters. */
  label: string
  toAssign: ChannelToAssign[]
}

export function batchChannels(
  movements: readonly MovementPlan[],
  channels: ReadonlyMap<number, SettlementChannel>,
): BatchChannels {
  const used = [...new Set(movements.map((m) => m.channelId))].map((id) => {
    const channel = channels.get(id)
    if (!channel) throw new Error(`channel ${id} of a movement is not in the input`)
    return channel
  })
  const names = used.map((c) => c.name).sort(byCode)
  const toAssign = used
    .filter((c) => c.assignment !== 'assigned')
    .sort((a, b) => a.channelId - b.channelId)
    .map((c) => ({
      channelId: c.channelId,
      name: c.name,
      assignment: c.assignment as ChannelToAssign['assignment'],
      otherAccount: c.otherAccount,
    }))
  return { names, label: labelOf(names), toAssign }
}

function labelOf(names: readonly string[]): string {
  const whole = names.join(',')
  if (whole.length <= LABEL_MAX) return whole
  const kept: string[] = []
  for (const name of names) {
    if ([...kept, name, ELLIPSIS].join(',').length > LABEL_MAX) break
    kept.push(name)
  }
  return [...kept, ELLIPSIS].join(',')
}
