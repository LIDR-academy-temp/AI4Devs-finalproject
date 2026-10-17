// The cross-match of one row (README §1.2 "Identidad"; spec: import, D4): one hit is matched, none is
// unmatched, several (two gateways with the same format) is ambiguous. Pure over what the lookup returned (design D4).
import type { RowCandidate } from '@recon/shared'
import type { IdCandidate } from './normalize-source-id.js'

/** A transaction as the lookup returns it (amount as DECIMAL(19,4) text). */
export interface TransactionRef {
  transactionId: bigint
  gatewayId: number
  gatewayName: string
  sourceTransactionId: string
  channelId: number
  channelName: string
  providerId: number
  statusId: number
  statusName: string
  amount: string
  transactionDate: Date
}

export interface MatchOutcome {
  matchResult: 'matched' | 'unmatched' | 'ambiguous'
  transactionId: bigint | null
  gatewayId: number | null
  reason: 'no_match' | null
  /** The transactions an ambiguous row could be, ordered by gateway; empty otherwise. */
  candidates: RowCandidate[]
  /** The matched transaction; null otherwise. */
  transaction: TransactionRef | null
}

export function toRowCandidate(transaction: TransactionRef): RowCandidate {
  return {
    gatewayId: transaction.gatewayId,
    gatewayName: transaction.gatewayName,
    transactionId: String(transaction.transactionId),
    channelId: transaction.channelId,
    channelName: transaction.channelName,
    statusId: transaction.statusId,
    statusName: transaction.statusName,
    amount: transaction.amount,
  }
}

const pairKey = (gatewayId: number, sourceTransactionId: string) => `${gatewayId}:${sourceTransactionId}`

/**
 * `found` comes from a batched `gatewayId IN (…) AND sourceTransactionId IN (…)` lookup, which may return crossed
 * pairs; only the exact candidates of this row count.
 */
export function matchRow(candidates: IdCandidate[], found: TransactionRef[]): MatchOutcome {
  const wanted = new Set(candidates.map((c) => pairKey(c.gatewayId, c.sourceTransactionId)))
  const hits = found
    .filter((t) => wanted.has(pairKey(t.gatewayId, t.sourceTransactionId)))
    .sort((a, b) => a.gatewayId - b.gatewayId)
  if (hits.length === 1) {
    const hit = hits[0] as TransactionRef
    return {
      matchResult: 'matched',
      transactionId: hit.transactionId,
      gatewayId: hit.gatewayId,
      reason: null,
      candidates: [],
      transaction: hit,
    }
  }
  if (hits.length === 0) {
    return {
      matchResult: 'unmatched',
      transactionId: null,
      gatewayId: null,
      reason: 'no_match',
      candidates: [],
      transaction: null,
    }
  }
  return {
    matchResult: 'ambiguous',
    transactionId: null,
    gatewayId: null,
    reason: null,
    candidates: hits.map(toRowCandidate),
    transaction: null,
  }
}
