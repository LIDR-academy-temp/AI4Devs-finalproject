import { beforeEach, describe, expect, it } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../domain/scope.js'
import { ACCOUNT_IDS, InMemoryCatalogRepository, LAST_BATCH_IDS, LEGACY_RULE_SET_ID } from './__fakes__/in-memory.js'
import { CatalogService } from './catalog-service.js'

// Scopes as the auth module resolves them: admin (all), viewer (merchant 1), a user of merchant 2 only, no merchants.
const ALL: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ONLY_B: Scope = { merchantIds: [2] }
const NONE: Scope = { merchantIds: [] }

const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'

let catalog: InMemoryCatalogRepository
let service: CatalogService

beforeEach(() => {
  catalog = new InMemoryCatalogRepository()
  service = new CatalogService(catalog)
})

async function notFound(promise: Promise<unknown>): Promise<NotFoundError> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(NotFoundError)
  return error as NotFoundError
}

describe('listMerchants', () => {
  it('returns every merchant for scope "all"', async () => {
    expect((await service.listMerchants(ALL)).map((m) => m.merchantId)).toEqual([1, 2])
  })

  it('returns only the assigned merchant for viewer', async () => {
    expect(await service.listMerchants(VIEWER)).toEqual([{ merchantId: 1, name: 'Merchant A', isActive: true }])
  })

  it('returns nothing for a user without merchants', async () => {
    expect(await service.listMerchants(NONE)).toEqual([])
  })
})

describe('listProviders', () => {
  it('lists the providers of a visible merchant ordered by id', async () => {
    expect((await service.listProviders(VIEWER, 1)).map((p) => p.providerId)).toEqual([101, 102])
  })

  it('answers not found for a merchant outside the scope, same as for an unknown one', async () => {
    const outside = await notFound(service.listProviders(VIEWER, 2))
    const unknown = await notFound(service.listProviders(VIEWER, 999))

    expect(outside.message).toBe(unknown.message)
    expect(outside.code).toBe('not_found')
  })
})

describe('getProvider', () => {
  it('returns Provider A with its merchant, accounts by name and channels with parameters', async () => {
    const provider = await service.getProvider(ALL, 101)

    expect(provider).toMatchObject({
      providerId: 101,
      name: 'Provider A',
      merchant: { merchantId: 1, name: 'Merchant A' },
    })
    expect(provider.accounts.map((a) => a.name)).toEqual(['ProviderA-EUR', 'ProviderA-USD'])
    expect(provider.channels.map((c) => c.channelId)).toEqual([1001, 1002, 1003, 1007])
    for (const channel of provider.channels) {
      expect(channel).toMatchObject({
        gatewayId: 1,
        settlementTermDays: 14,
        rollingReservePct: '0.100000',
        rollingReserveDays: 180,
      })
    }
  })

  it('answers not found for a provider outside the scope, same as for an unknown one', async () => {
    const outside = await notFound(service.getProvider(VIEWER, 201))
    const unknown = await notFound(service.getProvider(VIEWER, 999))

    expect(outside.message).toBe(unknown.message)
  })
})

describe('listProviderChannels and listProviderAccounts', () => {
  it('lists the channels of Provider B with their own parameters', async () => {
    const channels = await service.listProviderChannels(ALL, 102)

    expect(channels.map((c) => c.name)).toEqual(['RAM-11', 'RAM-12', 'RAM-13'])
    expect(channels.every((c) => c.settlementTermDays === 10)).toBe(true)
    expect(channels[2]).toMatchObject({ rollingReservePct: '0.050000', rollingReserveDays: 120 })
  })

  it('lists the accounts of Provider C by name', async () => {
    const accounts = await service.listProviderAccounts(ALL, 201)

    expect(accounts.map((a) => a.name)).toEqual(['ProviderC-Alt', 'ProviderC-USD'])
    expect(accounts.every((a) => a.providerId === 201 && a.chargebackReservePolicy === 'hold_until_term')).toBe(true)
  })

  it('answers not found for both sub-resources of a provider outside the scope', async () => {
    await notFound(service.listProviderChannels(VIEWER, 201))
    await notFound(service.listProviderAccounts(VIEWER, 201))
  })
})

describe('getAccount', () => {
  it('returns ProviderA-EUR with its cap as a decimal string and its provider and merchant', async () => {
    const account = await service.getAccount(VIEWER, ACCOUNT_IDS['ProviderA-EUR'])

    expect(account).toMatchObject({
      name: 'ProviderA-EUR',
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: '50000.0000',
      matchingRuleSetId: null,
      provider: { providerId: 101, merchantId: 1 },
      merchant: { merchantId: 1, name: 'Merchant A' },
    })
  })

  it('returns the rule set of ProviderC-Alt', async () => {
    const account = await service.getAccount(ALL, ACCOUNT_IDS['ProviderC-Alt'])

    expect(account.matchingRuleSetId).toBe(LEGACY_RULE_SET_ID)
    expect(account.rollingReserveCapAmt).toBeNull()
  })

  it('answers not found for an account of another merchant, same as for an unknown id', async () => {
    const outside = await notFound(service.getAccount(VIEWER, ACCOUNT_IDS['ProviderC-USD']))
    const unknown = await notFound(service.getAccount(VIEWER, UNKNOWN_UUID))

    expect(outside.message).toBe(unknown.message)
  })
})

describe('listChannels', () => {
  it('with unassigned=true returns the channels with transactions and no account', async () => {
    const channels = await service.listChannels(ALL, { unassigned: true })

    expect(channels.map((c) => c.channelId)).toEqual([1007, 1013])
  })

  it('with unassigned=true returns nothing when the scope has no such channel', async () => {
    expect(await service.listChannels(ONLY_B, { unassigned: true })).toEqual([])
  })

  it('without the filter returns every channel of the scope', async () => {
    expect(await service.listChannels(VIEWER, {})).toHaveLength(7)
    expect(await service.listChannels(ALL, {})).toHaveLength(9)
    expect(await service.listChannels(NONE, {})).toEqual([])
  })
})

describe('listAccountChannels', () => {
  it('lists the primary channels of ProviderA-USD with the batch that assigned them', async () => {
    const channels = await service.listAccountChannels(VIEWER, ACCOUNT_IDS['ProviderA-USD'])

    expect(channels.map((c) => c.channelId)).toEqual([1001, 1002])
    for (const channel of channels) {
      expect(channel).toMatchObject({
        isPrimary: true,
        assignedInBatchId: LAST_BATCH_IDS['ProviderA-USD'],
        primaryAccount: { accountId: ACCOUNT_IDS['ProviderA-USD'], name: 'ProviderA-USD' },
      })
    }
  })

  it('shows a historical channel with the account that is primary now', async () => {
    catalog.addAccountChannel({
      accountId: ACCOUNT_IDS['ProviderA-EUR'],
      channelId: 1001,
      isPrimary: false,
      assignedAt: '2026-10-13T00:00:00.000Z',
      assignedInBatchId: null,
    })

    const channels = await service.listAccountChannels(ALL, ACCOUNT_IDS['ProviderA-EUR'])

    expect(channels.map((c) => c.name)).toEqual(['RAM-03', 'RAM-01'])
    expect(channels[0]).toMatchObject({ isPrimary: true, primaryAccount: { name: 'ProviderA-EUR' } })
    expect(channels[1]).toMatchObject({ isPrimary: false, primaryAccount: { name: 'ProviderA-USD' } })
  })

  it('answers not found for an account outside the scope', async () => {
    await notFound(service.listAccountChannels(VIEWER, ACCOUNT_IDS['ProviderC-USD']))
  })
})

describe('listChannelAccounts', () => {
  it('lists both accounts of a channel with history, only one of them primary', async () => {
    catalog.addAccountChannel({
      accountId: ACCOUNT_IDS['ProviderA-EUR'],
      channelId: 1001,
      isPrimary: false,
      assignedAt: '2026-10-13T00:00:00.000Z',
      assignedInBatchId: null,
    })

    const accounts = await service.listChannelAccounts(ALL, 1001)

    expect(accounts.map((a) => [a.name, a.isPrimary])).toEqual([
      ['ProviderA-USD', true],
      ['ProviderA-EUR', false],
    ])
  })

  it('returns an empty list for a channel that is not assigned yet', async () => {
    expect(await service.listChannelAccounts(ALL, 1007)).toEqual([])
  })

  it('answers not found for a channel outside the scope', async () => {
    await notFound(service.listChannelAccounts(VIEWER, 2001))
  })
})
