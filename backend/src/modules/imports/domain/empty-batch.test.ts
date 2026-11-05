import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { UnmatchedByReason } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { type EmptyBatchFacts, emptyBatchOf } from './empty-batch.js'

// README §3.3 "Batch sin filas asociadas" (#92); spec import "Import sin filas asociadas" (design D1).
const SAMPLES = path.resolve(import.meta.dirname, '../../../../../data/samples')
const wrongAccount = JSON.parse(readFileSync(path.join(SAMPLES, 'batch-wrong-account/expected.json'), 'utf8')) as {
  rows: { read: number; matched: number; unmatched: number; unmatchedByReason: UnmatchedByReason }
  requiresEmptyBatchConfirmation: boolean
  likelyWrongAccount: boolean
}

const NONE: UnmatchedByReason = { no_match: 0, id_format: 0, lossy_numeric_id: 0, no_gateways: 0 }
const facts = (over: Partial<EmptyBatchFacts>): EmptyBatchFacts => ({
  rowsTotal: 0,
  matchedOwn: 0,
  unmatchedByReason: NONE,
  ...over,
})

describe('emptyBatchOf', () => {
  it('batch-wrong-account: no matched row and every unmatched one id_format (expected.json as the oracle)', () => {
    const { rows } = wrongAccount
    const result = emptyBatchOf(
      facts({ rowsTotal: rows.read, matchedOwn: rows.matched, unmatchedByReason: rows.unmatchedByReason }),
    )

    expect(result.requiresConfirmation).toBe(wrongAccount.requiresEmptyBatchConfirmation)
    expect(result.details).toEqual({
      rowsTotal: rows.read,
      rowsUnmatched: rows.unmatched,
      unmatchedByReason: rows.unmatchedByReason,
      likelyWrongAccount: wrongAccount.likelyWrongAccount,
    })
  })

  it('a batch with matched rows of the account needs no confirmation, whatever its unmatched ones', () => {
    const result = emptyBatchOf(
      facts({ rowsTotal: 783, matchedOwn: 780, unmatchedByReason: { ...NONE, id_format: 1 } }),
    )

    expect(result.requiresConfirmation).toBe(false)
    expect(result.details.likelyWrongAccount).toBe(false)
    expect(result.details.rowsUnmatched).toBe(1)
  })

  it('unmatched for other reasons too: confirmation, but not a wrong account', () => {
    const result = emptyBatchOf(facts({ rowsTotal: 2, unmatchedByReason: { ...NONE, id_format: 1, no_match: 1 } }))

    expect(result.requiresConfirmation).toBe(true)
    expect(result.details).toMatchObject({ rowsUnmatched: 2, likelyWrongAccount: false })
  })

  it('only ignored rows: confirmation, no unmatched row, so not a wrong account', () => {
    const result = emptyBatchOf(facts({ rowsTotal: 3 }))

    expect(result.requiresConfirmation).toBe(true)
    expect(result.details).toEqual({
      rowsTotal: 3,
      rowsUnmatched: 0,
      unmatchedByReason: NONE,
      likelyWrongAccount: false,
    })
  })

  it('only rows of another provider: matchedOwn is 0, so it asks for the confirmation (provider_mismatch blocks before)', () => {
    expect(emptyBatchOf(facts({ rowsTotal: 1, matchedOwn: 0 })).requiresConfirmation).toBe(true)
  })

  it('a resolved ambiguous row counts as matched', () => {
    expect(emptyBatchOf(facts({ rowsTotal: 1, matchedOwn: 1 })).requiresConfirmation).toBe(false)
  })
})
