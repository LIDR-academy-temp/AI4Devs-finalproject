import { describe, expect, it } from 'vitest'
import {
  AccountChannelItem,
  AccountDetail,
  AccountSummary,
  ChannelAccountItem,
  ChannelSummary,
  ChannelsQuery,
  MerchantSummary,
  ProviderDetail,
  ProviderSummary,
} from './catalog.js'

const merchant = { merchantId: 1, name: 'Merchant A', isActive: true }
const provider = { providerId: 101, merchantId: 1, name: 'Provider A', isActive: true }
const channel = {
  channelId: 1001,
  gatewayId: 1,
  providerId: 101,
  name: 'RAM-01',
  isActive: true,
  settlementTermDays: 14,
  rollingReservePct: '0.100000',
  rollingReserveDays: 180,
}
const account = {
  accountId: '7b1f3c7e-5d2a-4e9b-9c1d-2f3a4b5c6d7e',
  providerId: 101,
  name: 'ProviderA-EUR',
  chargebackReservePolicy: 'hold_until_term',
  rollingReserveCapAmt: '50000.0000',
  matchingRuleSetId: null,
  isActive: true,
  createdAt: '2026-10-12T00:00:00.000Z',
}

describe('MerchantSummary and ProviderSummary', () => {
  it('accept the seed rows', () => {
    expect(MerchantSummary.safeParse(merchant).success).toBe(true)
    expect(ProviderSummary.safeParse(provider).success).toBe(true)
  })

  it('require isActive', () => {
    const { isActive: _, ...withoutFlag } = merchant
    expect(MerchantSummary.safeParse(withoutFlag).success).toBe(false)
  })
})

describe('AccountSummary', () => {
  it('accepts a decimal string cap and a null cap', () => {
    expect(AccountSummary.safeParse(account).success).toBe(true)
    expect(AccountSummary.safeParse({ ...account, rollingReserveCapAmt: null }).success).toBe(true)
  })

  it('rejects a numeric cap (money travels as a string)', () => {
    expect(AccountSummary.safeParse({ ...account, rollingReserveCapAmt: 50000 }).success).toBe(false)
  })

  it('rejects an accountId that is not a UUID', () => {
    expect(AccountSummary.safeParse({ ...account, accountId: 'not-a-uuid' }).success).toBe(false)
  })

  it('rejects an unknown chargebackReservePolicy', () => {
    expect(AccountSummary.safeParse({ ...account, chargebackReservePolicy: 'keep' }).success).toBe(false)
  })

  it('accepts an integer matchingRuleSetId', () => {
    expect(AccountSummary.safeParse({ ...account, matchingRuleSetId: 1 }).success).toBe(true)
  })
})

describe('ChannelSummary', () => {
  it('accepts percentages as six-decimal strings', () => {
    expect(ChannelSummary.safeParse(channel).success).toBe(true)
    expect(ChannelSummary.safeParse({ ...channel, rollingReservePct: '0.000000' }).success).toBe(true)
  })

  it.each([
    { title: 'a number', value: 0.1 },
    { title: 'seven decimals', value: '0.1000000' },
    { title: 'more than 1', value: '1.5' },
  ])('rejects rollingReservePct as $title', ({ value }) => {
    expect(ChannelSummary.safeParse({ ...channel, rollingReservePct: value }).success).toBe(false)
  })
})

describe('ProviderDetail and AccountDetail', () => {
  it('ProviderDetail embeds merchant, accounts and channels', () => {
    const detail = {
      ...provider,
      merchant: { merchantId: 1, name: 'Merchant A' },
      accounts: [account],
      channels: [channel],
    }
    expect(ProviderDetail.safeParse(detail).success).toBe(true)
    expect(ProviderDetail.safeParse(provider).success).toBe(false)
  })

  it('AccountDetail requires provider and merchant', () => {
    expect(
      AccountDetail.safeParse({ ...account, provider, merchant: { merchantId: 1, name: 'Merchant A' } }).success,
    ).toBe(true)
    expect(AccountDetail.safeParse(account).success).toBe(false)
    expect(AccountDetail.safeParse({ ...account, provider }).success).toBe(false)
  })
})

describe('AccountChannelItem and ChannelAccountItem', () => {
  const assignment = { isPrimary: true, assignedAt: '2026-10-09T00:00:00.000Z', assignedInBatchId: null }

  it('AccountChannelItem accepts primaryAccount as an account ref or null', () => {
    const ref = { accountId: account.accountId, name: account.name }
    expect(AccountChannelItem.safeParse({ ...channel, ...assignment, primaryAccount: ref }).success).toBe(true)
    expect(AccountChannelItem.safeParse({ ...channel, ...assignment, primaryAccount: null }).success).toBe(true)
    expect(AccountChannelItem.safeParse({ ...channel, ...assignment }).success).toBe(false)
  })

  it('ChannelAccountItem carries the account and its assignment', () => {
    const item = { accountId: account.accountId, name: account.name, providerId: 101, isActive: true, ...assignment }
    expect(ChannelAccountItem.safeParse(item).success).toBe(true)
    expect(
      ChannelAccountItem.safeParse({ ...item, assignedInBatchId: '9f0e1d2c-3b4a-4596-8778-99aabbccddee' }).success,
    ).toBe(true)
    expect(ChannelAccountItem.safeParse({ ...item, isPrimary: 'yes' }).success).toBe(false)
  })
})

describe('ChannelsQuery', () => {
  it('parses unassigned from the query string into a boolean', () => {
    expect(ChannelsQuery.parse({ unassigned: 'true' })).toEqual({ unassigned: true })
    expect(ChannelsQuery.parse({ unassigned: 'false' })).toEqual({ unassigned: false })
  })

  it('allows the parameter to be omitted', () => {
    expect(ChannelsQuery.parse({})).toEqual({})
  })

  it('rejects a value that is not a boolean string', () => {
    expect(ChannelsQuery.safeParse({ unassigned: 'nope' }).success).toBe(false)
  })
})
