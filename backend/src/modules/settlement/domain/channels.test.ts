import { describe, expect, it } from 'vitest'
import { movement, RAM_01 } from '../test-support/builders.js'
import { batchChannels } from './channels.js'

// Spec settlement "Asociación de canales al procesar" (design D14): channels of the movements, the ones to assign,
// and the VARCHAR(100) label of SettlementBatch.channels.
const RAM_07 = { ...RAM_01, channelId: 1007, name: 'RAM-07', assignment: 'unassigned' as const }
const RAM_03 = {
  ...RAM_01,
  channelId: 1003,
  name: 'RAM-03',
  assignment: 'assigned_to_other_account' as const,
  otherAccount: { accountId: 'a0000000-0000-4000-8000-000000000002', name: 'ProviderA-EUR' },
}
const channels = new Map([RAM_01, RAM_07, RAM_03].map((c) => [c.channelId, c]))

describe('batchChannels', () => {
  it('lists the channel names of the movements, sorted and once each', () => {
    const result = batchChannels(
      [movement(2, { channelId: 1007 }), movement(3), movement(4, { channelId: 1007 })],
      channels,
    )

    expect(result.names).toEqual(['RAM-01', 'RAM-07'])
    expect(result.label).toBe('RAM-01,RAM-07')
  })

  it('lists the channels not assigned yet or with another primary account, in channelId order', () => {
    const result = batchChannels(
      [movement(2, { channelId: 1007 }), movement(3, { channelId: 1003 }), movement(4)],
      channels,
    )

    expect(result.toAssign).toEqual([
      { channelId: 1003, name: 'RAM-03', assignment: 'assigned_to_other_account', otherAccount: RAM_03.otherAccount },
      { channelId: 1007, name: 'RAM-07', assignment: 'unassigned', otherAccount: null },
    ])
  })

  it('has nothing to assign when every channel is already primary for the account', () => {
    expect(batchChannels([movement(2)], channels).toAssign).toEqual([])
  })

  it('cuts the label at the last whole name with … when it does not fit in 100 characters', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...RAM_01, channelId: 3000 + i, name: `RAM-LONG-${100 + i}` }))
    const map = new Map(many.map((c) => [c.channelId, c]))

    const { label, names } = batchChannels(
      many.map((c, i) => movement(i + 2, { channelId: c.channelId })),
      map,
    )

    expect(names).toHaveLength(30)
    expect(label.length).toBeLessThanOrEqual(100)
    expect(label.endsWith(',…')).toBe(true)
    expect(label.startsWith('RAM-LONG-100,RAM-LONG-101,')).toBe(true)
  })
})
