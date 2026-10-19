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

    expect(loaded).toEqual(expected)
  })

  it('asks only for the channels and the previous E movements of the matched transactions', async () => {
    const source = new InMemorySettlementSource({ ...expected, channels: [...expected.channels] })
    const asked: { channels?: readonly number[]; transactions?: readonly bigint[] } = {}
    const channels = source.channels.bind(source)
    const previousE = source.previousE.bind(source)
    source.channels = async (accountId, ids) => {
      asked.channels = ids
      return channels(accountId, ids)
    }
    source.previousE = async (providerId, ids, excluded) => {
      asked.transactions = ids
      return previousE(providerId, ids, excluded)
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
  })
})
