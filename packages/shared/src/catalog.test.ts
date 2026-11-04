import { describe, expect, it } from 'vitest'
import {
  AccountChannelItem,
  AccountCreate,
  AccountDetail,
  AccountPatch,
  AccountSummary,
  ChannelAccountItem,
  ChannelListItem,
  ChannelSummary,
  ChannelsQuery,
  MatchingRuleSetSummary,
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

  const detail = {
    ...account,
    provider,
    merchant: { merchantId: 1, name: 'Merchant A' },
    createdBy: { userId: 1, userName: 'admin' },
    updatedAt: '2026-10-12T00:00:00.000Z',
  }

  it('AccountDetail requires provider and merchant', () => {
    expect(AccountDetail.safeParse(detail).success).toBe(true)
    expect(AccountDetail.safeParse(account).success).toBe(false)
    const { merchant: _, ...withoutMerchant } = detail
    expect(AccountDetail.safeParse(withoutMerchant).success).toBe(false)
  })

  it('AccountDetail requires createdBy with userId and userName, and updatedAt', () => {
    const { createdBy: _c, ...withoutCreator } = detail
    const { updatedAt: _u, ...withoutUpdate } = detail
    expect(AccountDetail.safeParse(withoutCreator).success).toBe(false)
    expect(AccountDetail.safeParse(withoutUpdate).success).toBe(false)
    expect(AccountDetail.safeParse({ ...detail, createdBy: { userId: 1 } }).success).toBe(false)
    expect(AccountDetail.safeParse({ ...detail, updatedAt: 'yesterday' }).success).toBe(false)
  })
})

describe('AccountChannelItem and ChannelAccountItem', () => {
  const assignment = {
    isPrimary: true,
    assignedAt: '2026-10-09T00:00:00.000Z',
    assignedInBatchId: null,
    assignedInBatchNo: null,
  }

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

  it('both carry assignedInBatchNo as an integer or null', () => {
    const batch = { assignedInBatchId: '9f0e1d2c-3b4a-4596-8778-99aabbccddee', assignedInBatchNo: 119 }
    const item = { accountId: account.accountId, name: account.name, providerId: 101, isActive: true, ...assignment }
    expect(ChannelAccountItem.safeParse({ ...item, ...batch }).success).toBe(true)
    expect(AccountChannelItem.safeParse({ ...channel, ...assignment, ...batch, primaryAccount: null }).success).toBe(
      true,
    )
    const { assignedInBatchNo: _, ...withoutBatchNo } = item
    expect(ChannelAccountItem.safeParse(withoutBatchNo).success).toBe(false)
    expect(ChannelAccountItem.safeParse({ ...item, assignedInBatchNo: '119' }).success).toBe(false)
    expect(
      AccountChannelItem.safeParse({ ...channel, ...assignment, assignedInBatchNo: 1.5, primaryAccount: null }).success,
    ).toBe(false)
  })
})

describe('ChannelListItem', () => {
  it('is a channel with primaryAccount as an account ref or null', () => {
    const ref = { accountId: account.accountId, name: account.name }
    expect(ChannelListItem.safeParse({ ...channel, primaryAccount: ref }).success).toBe(true)
    expect(ChannelListItem.safeParse({ ...channel, primaryAccount: null }).success).toBe(true)
    expect(ChannelListItem.safeParse(channel).success).toBe(false)
    expect(ChannelListItem.safeParse({ ...channel, primaryAccount: { name: 'x' } }).success).toBe(false)
  })
})

describe('AccountCreate', () => {
  const body = { name: 'bruno-min', chargebackReservePolicy: 'hold_until_term' }

  it('accepts the minimal body, with the optional fields omitted', () => {
    expect(AccountCreate.parse(body)).toEqual(body)
  })

  it('trims the name', () => {
    expect(AccountCreate.parse({ ...body, name: '  bruno-min  ' }).name).toBe('bruno-min')
  })

  it.each([
    { title: 'blank after trimming', name: '   ' },
    { title: 'empty', name: '' },
    { title: '51 characters', name: 'x'.repeat(51) },
  ])('rejects a name that is $title', ({ name }) => {
    expect(AccountCreate.safeParse({ ...body, name }).success).toBe(false)
  })

  it('accepts a 50-character name', () => {
    expect(AccountCreate.safeParse({ ...body, name: 'x'.repeat(50) }).success).toBe(true)
  })

  it('requires the name and the policy, and rejects an unknown policy', () => {
    expect(AccountCreate.safeParse({ name: 'bruno-min' }).success).toBe(false)
    expect(AccountCreate.safeParse({ chargebackReservePolicy: 'hold_until_term' }).success).toBe(false)
    expect(AccountCreate.safeParse({ ...body, chargebackReservePolicy: 'keep' }).success).toBe(false)
  })

  it('takes the cap as a decimal string or null, never as a number', () => {
    expect(AccountCreate.safeParse({ ...body, rollingReserveCapAmt: '25000' }).success).toBe(true)
    expect(AccountCreate.safeParse({ ...body, rollingReserveCapAmt: null }).success).toBe(true)
    expect(AccountCreate.safeParse({ ...body, rollingReserveCapAmt: 25000 }).success).toBe(false)
  })

  it('takes matchingRuleSetId as a positive integer or null and copyFeesFromAccountId as a UUID or null', () => {
    const full = {
      ...body,
      matchingRuleSetId: 1,
      copyFeesFromAccountId: account.accountId,
    }
    expect(AccountCreate.safeParse(full).success).toBe(true)
    expect(AccountCreate.safeParse({ ...full, matchingRuleSetId: null, copyFeesFromAccountId: null }).success).toBe(
      true,
    )
    expect(AccountCreate.safeParse({ ...body, matchingRuleSetId: 0 }).success).toBe(false)
    expect(AccountCreate.safeParse({ ...body, matchingRuleSetId: '1' }).success).toBe(false)
    expect(AccountCreate.safeParse({ ...body, copyFeesFromAccountId: 'not-a-uuid' }).success).toBe(false)
  })

  it('bounds matchingRuleSetId to an INT column: a larger id is a 400, never an overflow in the database', () => {
    expect(AccountCreate.safeParse({ ...body, matchingRuleSetId: 2_147_483_647 }).success).toBe(true)
    expect(AccountCreate.safeParse({ ...body, matchingRuleSetId: 2_147_483_648 }).success).toBe(false)
    expect(AccountPatch.safeParse({ matchingRuleSetId: 2_147_483_648 }).success).toBe(false)
  })

  it('rejects unknown fields', () => {
    expect(AccountCreate.safeParse({ ...body, color: 'red' }).success).toBe(false)
    expect(AccountCreate.safeParse({ ...body, isActive: false }).success).toBe(false)
  })
})

describe('AccountPatch', () => {
  it('accepts any subset of the editable fields', () => {
    expect(AccountPatch.safeParse({ name: 'bruno-y' }).success).toBe(true)
    expect(AccountPatch.safeParse({ chargebackReservePolicy: 'release_on_chargeback' }).success).toBe(true)
    expect(AccountPatch.safeParse({ rollingReserveCapAmt: null }).success).toBe(true)
    expect(AccountPatch.safeParse({ matchingRuleSetId: null }).success).toBe(true)
    expect(AccountPatch.safeParse({ isActive: false, reason: 'provider stopped' }).success).toBe(true)
  })

  it('requires at least one field besides reason', () => {
    expect(AccountPatch.safeParse({}).success).toBe(false)
    expect(AccountPatch.safeParse({ reason: 'x' }).success).toBe(false)
  })

  it.each([
    { title: 'providerId', patch: { providerId: 101 } },
    { title: 'copyFeesFromAccountId', patch: { copyFeesFromAccountId: account.accountId } },
    { title: 'an unknown field', patch: { color: 'red' } },
  ])('rejects $title', ({ patch }) => {
    expect(AccountPatch.safeParse(patch).success).toBe(false)
  })

  it('trims the name and the reason, and limits the reason to 1–500 characters', () => {
    expect(AccountPatch.parse({ name: ' bruno-y ', reason: ' closing ' })).toEqual({
      name: 'bruno-y',
      reason: 'closing',
    })
    expect(AccountPatch.safeParse({ isActive: false, reason: '   ' }).success).toBe(false)
    expect(AccountPatch.safeParse({ isActive: false, reason: 'x'.repeat(501) }).success).toBe(false)
    expect(AccountPatch.safeParse({ isActive: false, reason: 'x'.repeat(500) }).success).toBe(true)
  })

  it('rejects a blank name, a numeric cap and a non-boolean isActive', () => {
    expect(AccountPatch.safeParse({ name: '  ' }).success).toBe(false)
    expect(AccountPatch.safeParse({ rollingReserveCapAmt: 1000 }).success).toBe(false)
    expect(AccountPatch.safeParse({ isActive: 'false' }).success).toBe(false)
  })
})

describe('MatchingRuleSetSummary', () => {
  const set = {
    ruleSetId: 1,
    providerId: 201,
    name: 'Provider C legacy',
    isActive: true,
    accounts: [{ accountId: account.accountId, name: 'ProviderC-Alt', isActive: true }],
  }

  it('accepts a rule set with the accounts that use it, or none', () => {
    expect(MatchingRuleSetSummary.safeParse(set).success).toBe(true)
    expect(MatchingRuleSetSummary.safeParse({ ...set, accounts: [] }).success).toBe(true)
  })

  it('requires isActive on the set and on each account', () => {
    const { isActive: _, ...withoutFlag } = set
    expect(MatchingRuleSetSummary.safeParse(withoutFlag).success).toBe(false)
    expect(
      MatchingRuleSetSummary.safeParse({ ...set, accounts: [{ accountId: account.accountId, name: 'x' }] }).success,
    ).toBe(false)
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
