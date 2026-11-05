import { describe, expect, it } from 'vitest'
import { settlementSampleInput } from '../test-support/sample-input.js'
import { InMemorySettlementSource } from './__fakes__/in-memory.js'
import { loadSettlementInput } from './load-settlement-input.js'

// The load of the engine input (settlement-process design D2), shared by the preview and processing: from the ports,
// the same input the domain tests build from the synthetic world.
describe('loadSettlementInput', async () => {
  const expected = await settlementSampleInput('batch-clean')

  it('loads the input of batch-clean as the domain tests build it', async () => {
    const source = new InMemorySettlementSource(expected)

    const loaded = await loadSettlementInput(source, {
      importId: expected.importId,
      account: expected.account,
      run: { runId: expected.runId, ranges: expected.ranges, blocked: null },
      prefilledFeeTypeIds: expected.prefilledFeeTypeIds,
      request: expected.request,
      options: expected.options,
    })

    expect(expected.reserveStates.size).toBeGreaterThan(0)
    expect(loaded).toEqual(expected)
  })

  it('asks only for the channels, the previous E movements and the reserve states of the matched transactions', async () => {
    const source = new InMemorySettlementSource({ ...expected, channels: [...expected.channels] })
    const asked: {
      channels?: readonly number[]
      transactions?: readonly bigint[]
      reserves?: { providerId: number; ids: readonly bigint[]; excluded: string }
    } = {}
    const channels = source.channels.bind(source)
    const previousE = source.previousE.bind(source)
    const reserveStates = source.reserveStates.bind(source)
    source.channels = async (accountId, ids) => {
      asked.channels = ids
      return channels(accountId, ids)
    }
    source.previousE = async (providerId, ids, excluded) => {
      asked.transactions = ids
      return previousE(providerId, ids, excluded)
    }
    source.reserveStates = async (providerId, ids, excluded) => {
      asked.reserves = { providerId, ids, excluded }
      return reserveStates(providerId, ids, excluded)
    }

    await loadSettlementInput(source, {
      importId: expected.importId,
      account: expected.account,
      run: { runId: expected.runId, ranges: expected.ranges, blocked: null },
      prefilledFeeTypeIds: new Set(),
      request: {},
      options: { transactionalFees: false },
    })

    const matched = expected.rows.flatMap((r) => (r.transaction ? [r.transaction] : []))
    expect([...(asked.channels ?? [])].sort()).toEqual([...new Set(matched.map((t) => t.channelId))].sort())
    expect(new Set(asked.transactions)).toEqual(new Set(matched.map((t) => t.transactionId)))
    // Only the I and R rows can release a reserve (D2); one read after the other, right after previousE.
    const adjustedOrReleased = expected.rows.flatMap((r) =>
      r.transaction && r.cycle !== 'E' ? [r.transaction.transactionId] : [],
    )
    expect(adjustedOrReleased.length).toBeGreaterThan(0)
    expect(asked.reserves?.providerId).toBe(expected.account.providerId)
    expect(asked.reserves?.excluded).toBe(expected.importId)
    expect([...(asked.reserves?.ids ?? [])].sort()).toEqual([...new Set(adjustedOrReleased)].sort())
    expect(source.calls.slice(source.calls.indexOf('previousE'), source.calls.indexOf('previousE') + 2)).toEqual([
      'previousE',
      'reserveStates',
    ])
  })
})
