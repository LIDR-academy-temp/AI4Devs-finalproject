import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '../application/__fakes__/in-memory.js'
import { type ChannelFact, channelNotices } from './channel-notice.js'

// README §1.2 "Cruce contra transacciones propias", §4.2 `channels`; spec "Aviso de canales" (design D9).
const A_USD = ACCOUNT_IDS['ProviderA-USD']
const B_MAIN = ACCOUNT_IDS['ProviderB-Main']
/** The providers of those accounts (synthetic world): Provider A and Provider B. */
const PROVIDER_A = 101
const PROVIDER_B = 102
const FOREIGN_NOTE = 'Channel of another provider: its rows are not processed in this account'
/** Both merchants: what the existing cases assume. */
const ALL = { merchantIds: [1, 2] }

const RAM_01: ChannelFact = {
  channelId: 1001,
  name: 'RAM-01',
  gatewayId: 1,
  providerId: 101,
  merchantId: 1,
  primaryAccount: { accountId: A_USD, name: 'ProviderA-USD', merchantId: 1 },
  assignedToThisAccount: true,
}
const RAM_02: ChannelFact = { ...RAM_01, channelId: 1002, name: 'RAM-02' }
const RAM_07: ChannelFact = {
  channelId: 1007,
  name: 'RAM-07',
  gatewayId: 1,
  providerId: 101,
  merchantId: 1,
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

    expect(channelNotices(A_USD, PROVIDER_A, counts, [RAM_07, RAM_02, RAM_01], ALL)).toEqual([
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

  it('a channel of the same provider whose primary account is another one (RAM-03 seen from ProviderA-USD)', () => {
    const RAM_03: ChannelFact = {
      ...RAM_01,
      channelId: 1003,
      name: 'RAM-03',
      primaryAccount: { accountId: ACCOUNT_IDS['ProviderA-EUR'], name: 'ProviderA-EUR', merchantId: 1 },
      assignedToThisAccount: false,
    }

    const [notice] = channelNotices(A_USD, PROVIDER_A, new Map([[1003, 1]]), [RAM_03], ALL)
    expect(notice).toEqual({
      channelId: 1003,
      name: 'RAM-03',
      gatewayId: 1,
      providerId: 101,
      rowCount: 1,
      assignment: 'assigned_to_other_account',
      otherAccount: { accountId: ACCOUNT_IDS['ProviderA-EUR'], name: 'ProviderA-EUR' },
      note: expect.stringMatching(/primary/),
    })
    expect(notice).not.toHaveProperty('otherProvider')
  })

  it('a channel of another provider (batch-blocked seen from ProviderB-Main): otherProvider and its own note (#92)', () => {
    const counts = new Map([[1001, 1]])

    expect(channelNotices(B_MAIN, PROVIDER_B, counts, [{ ...RAM_01, assignedToThisAccount: false }], ALL)).toEqual([
      {
        channelId: 1001,
        name: 'RAM-01',
        gatewayId: 1,
        providerId: 101,
        rowCount: 1,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: A_USD, name: 'ProviderA-USD' },
        otherProvider: true,
        note: FOREIGN_NOTE,
      },
    ])
  })

  it('an unassigned channel of another provider keeps unassigned, with the foreign note and never the association one', () => {
    const [notice] = channelNotices(B_MAIN, PROVIDER_B, new Map([[1007, 2]]), [RAM_07], ALL)

    expect(notice).toMatchObject({ assignment: 'unassigned', otherProvider: true, note: FOREIGN_NOTE })
  })

  it('no channel of batch-clean carries otherProvider', () => {
    const notices = channelNotices(
      A_USD,
      PROVIDER_A,
      new Map([
        [1001, 1],
        [1002, 1],
        [1007, 1],
      ]),
      [RAM_01, RAM_02, RAM_07],
      ALL,
    )

    expect(notices.some((n) => 'otherProvider' in n)).toBe(false)
  })

  it('a historical association without primary still reports the current primary account', () => {
    const historical: ChannelFact = {
      ...RAM_01,
      primaryAccount: { accountId: ACCOUNT_IDS['ProviderA-EUR'], name: 'ProviderA-EUR', merchantId: 1 },
      assignedToThisAccount: true,
    }

    expect(channelNotices(A_USD, PROVIDER_A, new Map([[1001, 3]]), [historical], ALL)[0]).toMatchObject({
      assignment: 'assigned_to_other_account',
      otherAccount: { name: 'ProviderA-EUR' },
    })
  })

  it('reports only channels with rows', () => {
    expect(
      channelNotices(A_USD, PROVIDER_A, new Map([[1001, 2]]), [RAM_01, RAM_02, RAM_07], ALL).map((c) => c.channelId),
    ).toEqual([1001])
  })
})

describe('channelNotices for a caller outside the merchant of the primary account (review of the PR, M3)', () => {
  const RAM_X2: ChannelFact = {
    channelId: 9002,
    name: 'RAM-X2',
    gatewayId: 1,
    providerId: 201,
    merchantId: 2,
    primaryAccount: { accountId: ACCOUNT_IDS['ProviderC-USD'], name: 'ProviderC-USD', merchantId: 2 },
    assignedToThisAccount: false,
  }

  it('keeps the assignment and hides the other account when its merchant is out of scope', () => {
    expect(channelNotices(A_USD, PROVIDER_A, new Map([[9002, 1]]), [RAM_X2], { merchantIds: [1] })).toEqual([
      expect.objectContaining({
        channelId: 9002,
        assignment: 'assigned_to_other_account',
        otherAccount: { accountId: null, name: null, outOfScope: true },
      }),
    ])
  })

  it('shows the other account to a caller whose scope includes its merchant', () => {
    expect(channelNotices(A_USD, PROVIDER_A, new Map([[9002, 1]]), [RAM_X2], ALL)[0]?.otherAccount).toEqual({
      accountId: ACCOUNT_IDS['ProviderC-USD'],
      name: 'ProviderC-USD',
    })
  })
})

describe('channelNotices for a channel of a merchant outside the scope (review of the PR, M3 residual)', () => {
  const RAM_X2: ChannelFact = {
    channelId: 9002,
    name: 'RAM-X2',
    gatewayId: 1,
    providerId: 201,
    merchantId: 2,
    primaryAccount: { accountId: ACCOUNT_IDS['ProviderC-USD'], name: 'ProviderC-USD', merchantId: 2 },
    assignedToThisAccount: false,
  }

  it('keeps channelId, gatewayId, rowCount and assignment, and hides name and provider', () => {
    expect(channelNotices(A_USD, PROVIDER_A, new Map([[9002, 3]]), [RAM_X2], { merchantIds: [1] })[0]).toEqual({
      channelId: 9002,
      name: null,
      gatewayId: 1,
      providerId: null,
      rowCount: 3,
      assignment: 'assigned_to_other_account',
      otherAccount: { accountId: null, name: null, outOfScope: true },
      note: FOREIGN_NOTE,
      outOfScope: true,
      // Another merchant's channel is always another provider's (README §4.2).
      otherProvider: true,
    })
  })

  it('names the channel to a caller whose scope includes its merchant', () => {
    const notice = channelNotices(A_USD, PROVIDER_A, new Map([[9002, 3]]), [RAM_X2], ALL)[0]
    expect(notice).toMatchObject({ name: 'RAM-X2', providerId: 201, otherProvider: true })
    expect(notice).not.toHaveProperty('outOfScope')
  })
})
