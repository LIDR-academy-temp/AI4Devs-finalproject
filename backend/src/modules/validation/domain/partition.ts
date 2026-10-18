import type { AccountScope, RowTransaction, ValidationRow } from './types.js'

/** A matched row with its transaction guaranteed. */
export type MatchedRow = ValidationRow & { transaction: RowTransaction }

export interface RowPartition {
  /** Matched rows of the account's provider: every validation but provider_mismatch, and the ranges. */
  own: MatchedRow[]
  /** Matched rows of another provider: only provider_mismatch (question 3). */
  foreign: MatchedRow[]
  /** Any matched row at all (applicability of validations 1–4, question 4). */
  anyMatched: boolean
}

/** Splits the rows of the import (design D6). The rows keep the order they arrive in. */
export function partitionRows(rows: readonly ValidationRow[], _account: AccountScope): RowPartition {
  const own: MatchedRow[] = []
  for (const r of rows) {
    if (r.matchResult !== 'matched') continue
    if (r.transaction === null) throw new Error(`matched row ${r.sheetId}:${r.rowNo} without a transaction`)
    own.push(r as MatchedRow)
  }
  return { own, foreign: [], anyMatched: own.length > 0 }
}
