// How a channel reads in Account Detail and Channel Assignment (web-admin-accounts design D4, D8). Pure: the
// percent comes from the decimal text of the API and never goes through a JS number.
import type { ChannelListItem, ChannelSummary } from '@/lib/api/types'
import { rateToPercent } from '@/lib/format'
import { strings } from './strings'

const c = strings.channel

/** "14 d · 10 % / 180 d": settlement term, reserve percent and the days until its release. */
export function termReserve(
  channel: Pick<ChannelSummary, 'settlementTermDays' | 'rollingReservePct' | 'rollingReserveDays'>,
): string {
  return c.termReserve(channel.settlementTermDays, rateToPercent(channel.rollingReservePct), channel.rollingReserveDays)
}

/** The role of the channel in the account: primary here, or historical with the current primary account. */
export function roleOf(item: { isPrimary: boolean; primaryAccount: ChannelListItem['primaryAccount'] }): string {
  if (item.isPrimary) return strings.primary
  return item.primaryAccount ? c.historicalIn(item.primaryAccount.name) : c.historicalNoPrimary
}

/** The batch whose processing created the association, or a dash. */
export const batchLabel = (batchNo: number | null): string => (batchNo === null ? c.none : c.batch(batchNo))
