// The channel notice of an analyzed import (README §1.2 "Cruce contra transacciones propias", §3.2 AccountChannel,
// §4.2 `channels`; spec: import, D9): what processing will do with each channel seen.
import type { AccountRef, ChannelNotice } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'

/** A channel of the matched transactions and its current association. */
export interface ChannelFact {
  channelId: number
  name: string
  gatewayId: number
  providerId: number
  /** The account with `isPrimary = 1` for the channel and its merchant, or null when the channel has no primary account. */
  primaryAccount: (AccountRef & { merchantId: number }) | null
  /** Whether the account of the import has any AccountChannel row for the channel (primary or historical). */
  assignedToThisAccount: boolean
}

const UNASSIGNED_NOTE = 'Not assigned yet: it will be associated to this account as primary when the batch is processed'
const OTHER_ACCOUNT_NOTE = 'This account will become the primary account of the channel when the batch is processed'

/**
 * Only channels with matched rows; ordered by channelId. The other account is named only to a caller whose scope
 * includes its merchant; otherwise only its existence is said (README §1.2: a merchant does not see another's).
 */
export function channelNotices(
  accountId: string,
  rowCounts: Map<number, number>,
  facts: ChannelFact[],
  scope: Scope,
): ChannelNotice[] {
  const byId = new Map(facts.map((f) => [f.channelId, f]))
  const notices: ChannelNotice[] = []
  for (const [channelId, rowCount] of rowCounts) {
    const fact = byId.get(channelId)
    if (!fact || rowCount <= 0) continue
    const base = { channelId, name: fact.name, gatewayId: fact.gatewayId, providerId: fact.providerId, rowCount }
    if (fact.primaryAccount?.accountId === accountId) {
      notices.push({ ...base, assignment: 'assigned', otherAccount: null, note: null })
    } else if (fact.primaryAccount === null && !fact.assignedToThisAccount) {
      notices.push({ ...base, assignment: 'unassigned', otherAccount: null, note: UNASSIGNED_NOTE })
    } else {
      notices.push({
        ...base,
        assignment: 'assigned_to_other_account',
        otherAccount:
          fact.primaryAccount === null
            ? null
            : scope.merchantIds.includes(fact.primaryAccount.merchantId)
              ? { accountId: fact.primaryAccount.accountId, name: fact.primaryAccount.name }
              : { accountId: null, name: null, outOfScope: true },
        note: OTHER_ACCOUNT_NOTE,
      })
    }
  }
  return notices.sort((a, b) => a.channelId - b.channelId)
}
