import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import type { ValidationRow } from '../domain/types.js'
import { sampleInput } from './sample-input.js'

// The input of each sample is the analysis of #5 over the real .xlsx (design D9): same counts as expected.json.
const matched = (rows: readonly ValidationRow[]) => rows.filter((r) => r.matchResult === 'matched')

describe('sampleInput', () => {
  it('batch-clean: 780 matched rows, 450 E / 10 I / 320 R, with their transaction', async () => {
    const { input } = await sampleInput('batch-clean')
    const own = matched(input.rows)

    expect(own).toHaveLength(780)
    expect(own.filter((r) => r.cycle === 'E')).toHaveLength(450)
    expect(own.filter((r) => r.cycle === 'I')).toHaveLength(10)
    expect(own.filter((r) => r.cycle === 'R')).toHaveLength(320)
    expect(own.every((r) => r.transaction !== null)).toBe(true)
    expect(input.account.primaryChannelIds).toEqual(new Set([1001, 1002]))
  })

  it('batch-split: two files in upload order, the same 780 matched rows', async () => {
    const { input } = await sampleInput('batch-split')

    expect(matched(input.rows)).toHaveLength(780)
    expect(new Set(input.rows.map((r) => r.fileOrder))).toEqual(new Set([0, 1]))
  })

  it('batch-issues: 766 matched and 1 unmatched; history of ProviderB-Main only', async () => {
    const { input } = await sampleInput('batch-issues')

    expect(matched(input.rows)).toHaveLength(766)
    expect(input.rows.filter((r) => r.matchResult === 'unmatched')).toHaveLength(1)
    expect(input.history.length).toBeGreaterThan(0)
    expect(input.history.every((m) => m.accountId === ACCOUNT_IDS['ProviderB-Main'])).toBe(true)
    expect(input.hasPreviousBatches).toBe(true)
  })

  it('batch-blocked: 21 matched rows', async () => {
    const { input } = await sampleInput('batch-blocked')

    expect(matched(input.rows)).toHaveLength(21)
  })

  it('legacy-provider: 81 matched rows, one CHB 2 with excludeAmount', async () => {
    const { input } = await sampleInput('legacy-provider')

    expect(matched(input.rows)).toHaveLength(81)
    expect(input.rows.filter((r) => r.excludeAmount).map((r) => r.transactionIdRaw)).toEqual([
      'df14616d-4b26-4ffb-9984-72717ebff6a6',
    ])
  })
})
