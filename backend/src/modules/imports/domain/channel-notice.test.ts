import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '../application/__fakes__/in-memory.js'
import { type ChannelFact, channelNotices } from './channel-notice.js'

// README §1.2 "Cruce contra transacciones propias", §4.2 `channels`; spec "Aviso de canales" (design D9).
const A_USD = ACCOUNT_IDS['ProviderA-USD']
const B_MAIN = ACCOUNT_IDS['ProviderB-Main']
/** Both merchants: what the existing cases assume. */
const ALL = { merchantIds: [1, 2] }

const RAM_01: ChannelFact = {
  channelId: 1001,
  name: 'RAM-01',
  gatewayId: 1,
  providerId: 101,
  primaryAccount: { accountId: A_USD, name: 'ProviderA-USD', merchantId: 1 },
  assignedToThisAccount: true,
}
const RAM_02: ChannelFact = { ...RAM_01, channelId: 1002, name: 'RAM-02' }
const RAM_07: ChannelFact = {
  channelId: 1007,
  name: 'RAM-07',
  gatewayId: 1,
  providerId: 101,
  primaryAccount: null,
  assignedToThisAccount: false,
}

describe('channelNotices', () => {
  it('batch-clean from ProviderA-USD: RAM-01 and RAM-02 assigned, RAM-07 not assigned yet, ordered by channelId', () => {
    const counts = new Map([
      [1007, 12],
      [1002, 150],
      [1001, 618],
    ])

    expect(channelNotices(A_USD, counts, [RAM_07, RAM_02, RAM_01], ALL)).toEqual([
      {
        channelId: 1001,
        name: 'RAM-01',
        gatewayId: 1,
        providerId: 101,
        rowCount: 618,
        assignment: 'assigned',
        otherAccount: null,
        note: null,
      },
      {
        channelId: 1002,
        name: 'RAM-02',
        gatewayId: 1,
        providerId: 101,
        rowCount: 150,
        assignment: 'assigned',
        otherAccount: null,
        note: null,
      },
      {
        channelId: 1007,
        name: 'RAM-07',
        gatewayId: 1,
        providerId: 101,
        rowCount: 12,
        assignment: 'unassigned',
        otherAccount: null,
        note: expect.stringMatching(/associated to this account/),
      },
    ])
  })

  it('a channel whose primary account is another one (batch-blocked seen from ProviderB-Main)', () => {
    const counts = new Map([[1001, 1]])

    expect(channelNotices(B_MAIN, counts, [{ ...RAM_01, assignedToThisAccount: false }], ALL)).toEqual([
      {
        channelId: 1001,
        name: 'RAM-01',
        gatewayId: 1,
        providerId: 101,
        rowCount: 1,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: A_USD, name: 'ProviderA-USD' },
        note: expect.stringMatching(/primary/),
      },
    ])
  })

  it('a historical association without primary still reports the current primary account', () => {
    const historical: ChannelFact = {
      ...RAM_01,
      primaryAccount: { accountId: ACCOUNT_IDS['ProviderA-EUR'], name: 'ProviderA-EUR', merchantId: 1 },
      assignedToThisAccount: true,
    }

    expect(channelNotices(A_USD, new Map([[1001, 3]]), [historical], ALL)[0]).toMatchObject({
      assignment: 'assigned_to_other_account',
      otherAccount: { name: 'ProviderA-EUR' },
    })
  })

  it('reports only channels with rows', () => {
    expect(channelNotices(A_USD, new Map([[1001, 2]]), [RAM_01, RAM_02, RAM_07], ALL).map((c) => c.channelId)).toEqual([
      1001,
    ])
  })
})

describe('channelNotices for a caller outside the merchant of the primary account (review of the PR, M3)', () => {
  const RAM_X2: ChannelFact = {
    channelId: 9002,
    name: 'RAM-X2',
    gatewayId: 1,
    providerId: 201,
    primaryAccount: { accountId: ACCOUNT_IDS['ProviderC-USD'], name: 'ProviderC-USD', merchantId: 2 },
    assignedToThisAccount: false,
  }

  it('keeps the assignment and hides the other account when its merchant is out of scope', () => {
    expect(channelNotices(A_USD, new Map([[9002, 1]]), [RAM_X2], { merchantIds: [1] })).toEqual([
      expect.objectContaining({
        channelId: 9002,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: null, name: null, outOfScope: true },
      }),
    ])
  })

  it('shows the other account to a caller whose scope includes its merchant', () => {
    expect(channelNotices(A_USD, new Map([[9002, 1]]), [RAM_X2], ALL)[0]?.otherAccount).toEqual({
      accountId: ACCOUNT_IDS['ProviderC-USD'],
      name: 'ProviderC-USD',
    })
  })
})
