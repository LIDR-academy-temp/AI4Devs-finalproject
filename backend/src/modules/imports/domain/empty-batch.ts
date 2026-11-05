// An import without matched rows of the account's provider (README §3.3 "Batch sin filas asociadas", #92; design D1).
// Not a validation: review and processing ask for an explicit confirmation, and the preview reports it.
import { type EmptyBatchDetails, type UnmatchedByReason, UnmatchedReason } from '@recon/shared'

/** What the rows of the transaction sheets say, as the facts query counts them. */
export interface EmptyBatchFacts {
  /** Rows read from the transaction sheets, ignored ones included. */
  rowsTotal: number
  /** Matched rows whose transaction belongs to the account's provider (a resolved ambiguous row is matched). */
  matchedOwn: number
  unmatchedByReason: UnmatchedByReason
}

export interface EmptyBatch {
  requiresConfirmation: boolean
  details: EmptyBatchDetails
}

export function emptyBatchOf(facts: EmptyBatchFacts): EmptyBatch {
  const byReason = facts.unmatchedByReason
  const rowsUnmatched = byReason.no_match + byReason.id_format + byReason.lossy_numeric_id + byReason.no_gateways
  const requiresConfirmation = facts.matchedOwn === 0
  return {
    requiresConfirmation,
    details: {
      rowsTotal: facts.rowsTotal,
      rowsUnmatched,
      unmatchedByReason: { ...byReason },
      // Every unmatched row fits no gateway of the account: what a file of another account looks like.
      likelyWrongAccount: requiresConfirmation && rowsUnmatched > 0 && byReason.id_format === rowsUnmatched,
    },
  }
}

/** A group of rows of the import by match result and reason, with how many of them are matched rows of the provider. */
export interface RowGroup {
  matchResult: string
  reason: string | null
  n: number
  own: number
}

/** The counting rule over the groups, whatever produced them (the SQL query or the in-memory double). */
export function factsOf(groups: readonly RowGroup[]): EmptyBatchFacts {
  const unmatchedByReason = Object.fromEntries(UnmatchedReason.options.map((r) => [r, 0])) as UnmatchedByReason
  let rowsTotal = 0
  let matchedOwn = 0
  for (const g of groups) {
    rowsTotal += g.n
    matchedOwn += g.own
    if (g.matchResult !== 'unmatched') continue
    // An unmatched row always says why (spec import, D5): any other value is a data error, not a zero.
    const reason = UnmatchedReason.safeParse(g.reason)
    if (!reason.success) throw new Error(`unmatched rows with an unknown reason: ${String(g.reason)}`)
    unmatchedByReason[reason.data] += g.n
  }
  return { rowsTotal, matchedOwn, unmatchedByReason }
}
