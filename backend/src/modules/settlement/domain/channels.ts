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

/** A row of AccountChannel of the channel: the account's own one, or the primary of any account. */
export interface AccountChannelRow {
  accountId: string
  isPrimary: boolean
  accountName: string
}

/**
 * The state of a channel for the account (the rule of the channel notice of the analysis): primary for it,
 * not assigned to anyone (no primary and no row of its own), or with another primary account. Ids compare
 * case-insensitively: SQL Server and the client do not agree on the case of a uniqueidentifier.
 */
export function channelStateOf(
  accountId: string,
  base: Pick<SettlementChannel, 'channelId' | 'name' | 'rollingReserveDays'>,
  rows: readonly AccountChannelRow[],
): SettlementChannel {
  const same = (id: string) => id.toLowerCase() === accountId.toLowerCase()
  const primary = rows.find((r) => r.isPrimary) ?? null
  if (primary && same(primary.accountId)) return { ...base, assignment: 'assigned', otherAccount: null }
  if (primary === null && !rows.some((r) => same(r.accountId)))
    return { ...base, assignment: 'unassigned', otherAccount: null }
  return {
    ...base,
    assignment: 'assigned_to_other_account',
    otherAccount: primary === null ? null : { accountId: primary.accountId, name: primary.accountName },
  }
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
