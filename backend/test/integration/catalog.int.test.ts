import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, SEED_PASSWORD } from './helpers.js'

// Seed oracle (backend/prisma/synthetic.ts): 2 merchants, 3 providers, 9 channels, 5 accounts;
// RAM-07 (1007) and RAM-13 (1013) have transactions and no account; viewer sees merchant 1 only.
const RAM_01 = 1001
const RAM_07 = 1007
const RAM_13 = 1013
const RAM_U1 = 2001
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
// Far later than any assignedAt in the seed, so the historical row sorts last.
const HISTORY_ASSIGNED_AT = new Date('2026-12-31T00:00:00.000Z')

type User = 'admin' | 'analyst' | 'viewer'

let ctx: Awaited<ReturnType<typeof createTestApp>>
const accountIds: Record<string, string> = {}
const tokens: Partial<Record<User, string>> = {}

beforeAll(async () => {
  ctx = await createTestApp()
  const { app, prisma } = ctx

  for (const a of await prisma.account.findMany({ select: { accountId: true, name: true } })) {
    accountIds[a.name] = a.accountId
  }
  for (const userName of ['admin', 'analyst', 'viewer'] as const) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    tokens[userName] = res.json().accessToken
  }

  // RAM-01 keeps ProviderA-USD as primary; this row is its history in ProviderA-EUR (never a second primary).
  await prisma.accountChannel.upsert({
    where: { accountId_channelId: { accountId: accountIds['ProviderA-EUR']!, channelId: RAM_01 } },
    create: {
      accountId: accountIds['ProviderA-EUR']!,
      channelId: RAM_01,
      isPrimary: false,
      assignedAt: HISTORY_ASSIGNED_AT,
    },
    update: { isPrimary: false, assignedAt: HISTORY_ASSIGNED_AT },
  })
})

afterAll(async () => {
  if (ctx) {
    const { prisma } = ctx
    if (accountIds['ProviderA-EUR']) {
      await prisma.accountChannel.deleteMany({
        where: { accountId: accountIds['ProviderA-EUR'], channelId: RAM_01, isPrimary: false },
      })
    }
    await ctx.app.close()
    await prisma.$disconnect()
  }
})

function get(url: string, user?: User) {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/v1${url}`,
    headers: user ? { authorization: `Bearer ${tokens[user]}` } : {},
  })
}

async function json<T = Record<string, unknown>[]>(url: string, user: User): Promise<T> {
  const res = await get(url, user)
  expect(res.statusCode, `${user} GET ${url}: ${res.body}`).toBe(200)
  return res.json()
}

const ids = (
  rows: { channelId?: number; providerId?: number; merchantId?: number }[],
  key: 'channelId' | 'providerId' | 'merchantId',
) => rows.map((r) => r[key])

describe('authentication of the catalog routes', () => {
  it('answers 401 unauthorized without a token', async () => {
    const res = await get('/merchants')

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('lets viewer read without any management permission', async () => {
    expect((await get('/providers/101/accounts', 'viewer')).statusCode).toBe(200)
  })

  it('answers 400 validation_error for an accountId that is not a UUID', async () => {
    const res = await get('/accounts/not-a-uuid', 'admin')

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })

  it('answers 400 validation_error for an id that does not fit an INT column', async () => {
    const res = await get('/providers/99999999999', 'admin')

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })
})

describe('merchant scope (issue #2, criterion 1)', () => {
  it('viewer sees 1 merchant, 2 providers, 3 accounts and 7 channels', async () => {
    expect(await json('/merchants', 'viewer')).toEqual([{ merchantId: 1, name: 'Merchant A', isActive: true }])
    expect(ids(await json('/merchants/1/providers', 'viewer'), 'providerId')).toEqual([101, 102])
    expect(await json('/providers/101/accounts', 'viewer')).toHaveLength(2)
    expect(await json('/providers/102/accounts', 'viewer')).toHaveLength(1)
    expect(await json('/channels', 'viewer')).toHaveLength(7)
  })

  it('admin sees 2 merchants, 3 providers, 5 accounts and 9 channels', async () => {
    expect(ids(await json('/merchants', 'admin'), 'merchantId')).toEqual([1, 2])
    expect(ids(await json('/merchants/2/providers', 'admin'), 'providerId')).toEqual([201])
    expect(await json('/providers/201/accounts', 'admin')).toHaveLength(2)
    expect(await json('/channels', 'admin')).toHaveLength(9)
  })

  it('analyst (merchants 1 and 2) sees the same catalog as admin', async () => {
    expect(ids(await json('/merchants', 'analyst'), 'merchantId')).toEqual([1, 2])
    expect(await json('/channels', 'analyst')).toHaveLength(9)
  })

  it.each([
    { title: 'provider', url: () => '/providers/201', unknown: '/providers/999' },
    { title: 'provider channels', url: () => '/providers/201/channels', unknown: '/providers/999/channels' },
    { title: 'merchant providers', url: () => '/merchants/2/providers', unknown: '/merchants/999/providers' },
    { title: 'account', url: () => `/accounts/${accountIds['ProviderC-USD']}`, unknown: `/accounts/${UNKNOWN_UUID}` },
    {
      title: 'account channels',
      url: () => `/accounts/${accountIds['ProviderC-USD']}/channels`,
      unknown: `/accounts/${UNKNOWN_UUID}/channels`,
    },
    { title: 'channel accounts', url: () => `/channels/${RAM_U1}/accounts`, unknown: '/channels/9999/accounts' },
  ])(
    'viewer gets 404 not_found (never 403) for a $title of merchant 2, same body as an unknown id',
    async ({ url, unknown }) => {
      const outside = await get(url(), 'viewer')
      const missing = await get(unknown, 'viewer')

      expect(outside.statusCode).toBe(404)
      expect(outside.json().code).toBe('not_found')
      expect(missing.statusCode).toBe(404)
      expect(outside.body).toBe(missing.body)
    },
  )
})

describe('GET /channels?unassigned=true (issue #2, criterion 2)', () => {
  it.each(['admin', 'viewer'] as const)('%s sees exactly RAM-07 and RAM-13', async (user) => {
    const channels = await json<{ channelId: number; name: string; providerId: number }[]>(
      '/channels?unassigned=true',
      user,
    )

    expect(channels.map((c) => [c.channelId, c.name, c.providerId])).toEqual([
      [RAM_07, 'RAM-07', 101],
      [RAM_13, 'RAM-13', 102],
    ])
  })
})

describe('GET /accounts/{id}/channels (issue #2, criterion 3)', () => {
  it('ProviderA-USD has RAM-01 and RAM-02 as primary, assigned by its last paid batch', async () => {
    const accountId = accountIds['ProviderA-USD']!
    const lastPaid = await ctx.prisma.settlementBatch.findFirstOrThrow({
      where: { accountId, status: 'paid' },
      orderBy: { processedAt: 'desc' },
    })

    const channels = await json<Record<string, unknown>[]>(`/accounts/${accountId}/channels`, 'viewer')

    expect(ids(channels, 'channelId')).toEqual([1001, 1002])
    for (const channel of channels) {
      expect(channel).toMatchObject({ isPrimary: true, primaryAccount: { name: 'ProviderA-USD' } })
      expect(String(channel.assignedInBatchId).toLowerCase()).toBe(lastPaid.batchId.toLowerCase())
    }
  })

  it('ProviderA-EUR shows RAM-03 as primary and RAM-01 as history whose primary is ProviderA-USD', async () => {
    const channels = await json<Record<string, unknown>[]>(`/accounts/${accountIds['ProviderA-EUR']}/channels`, 'admin')

    expect(channels.map((c) => c.name)).toEqual(['RAM-03', 'RAM-01'])
    expect(channels[0]).toMatchObject({ isPrimary: true, primaryAccount: { name: 'ProviderA-EUR' } })
    expect(channels[1]).toMatchObject({ isPrimary: false, primaryAccount: { name: 'ProviderA-USD' } })
  })

  it('GET /channels/1001/accounts lists both accounts with a single primary', async () => {
    const accounts = await json<{ name: string; isPrimary: boolean }[]>(`/channels/${RAM_01}/accounts`, 'admin')

    expect(accounts.map((a) => [a.name, a.isPrimary])).toEqual([
      ['ProviderA-USD', true],
      ['ProviderA-EUR', false],
    ])
  })

  it('GET /channels/1007/accounts is empty for a channel that is not assigned yet', async () => {
    expect(await json(`/channels/${RAM_07}/accounts`, 'admin')).toEqual([])
  })
})

describe('account and provider detail', () => {
  it('ProviderA-EUR carries its cap as a four-decimal string, no rule set, and its provider and merchant', async () => {
    const account = await json<Record<string, unknown>>(`/accounts/${accountIds['ProviderA-EUR']}`, 'viewer')

    expect(account).toMatchObject({
      name: 'ProviderA-EUR',
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: '50000.0000',
      matchingRuleSetId: null,
      isActive: true,
      provider: { providerId: 101, merchantId: 1, name: 'Provider A' },
      merchant: { merchantId: 1, name: 'Merchant A' },
    })
    expect(typeof account.rollingReserveCapAmt).toBe('string')
  })

  it('lists the five seed accounts through their providers, all active and with distinct names', async () => {
    const perProvider = await Promise.all(
      [101, 102, 201].map((providerId) =>
        json<{ name: string; isActive: boolean }[]>(`/providers/${providerId}/accounts`, 'admin'),
      ),
    )
    const accounts = perProvider.flat()

    expect(accounts.map((a) => a.name)).toEqual([
      'ProviderA-EUR',
      'ProviderA-USD',
      'ProviderB-Main',
      'ProviderC-Alt',
      'ProviderC-USD',
    ])
    expect(new Set(accounts.map((a) => a.name)).size).toBe(5)
    expect(accounts.every((a) => a.isActive)).toBe(true)
  })

  it('ProviderA-USD has neither a reserve cap nor a rule set', async () => {
    const account = await json<Record<string, unknown>>(`/accounts/${accountIds['ProviderA-USD']}`, 'admin')

    expect(account).toMatchObject({ name: 'ProviderA-USD', rollingReserveCapAmt: null, matchingRuleSetId: null })
  })

  it('ProviderC-Alt is linked to the "Provider C legacy" rule set', async () => {
    const legacy = await ctx.prisma.matchingRuleSet.findFirstOrThrow({ where: { name: 'Provider C legacy' } })

    const account = await json<Record<string, unknown>>(`/accounts/${accountIds['ProviderC-Alt']}`, 'admin')

    expect(account).toMatchObject({ matchingRuleSetId: legacy.ruleSetId, rollingReserveCapAmt: null })
  })

  it('ProviderB-Main releases the reserve on chargeback', async () => {
    const accounts = await json<Record<string, unknown>[]>('/providers/102/accounts', 'viewer')

    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({ name: 'ProviderB-Main', chargebackReservePolicy: 'release_on_chargeback' })
  })

  it('GET /providers/101 embeds the merchant, the accounts by name and the channels with parameters', async () => {
    const provider = await json<
      Record<string, unknown> & { accounts: { name: string }[]; channels: Record<string, unknown>[] }
    >('/providers/101', 'analyst')

    expect(provider).toMatchObject({
      providerId: 101,
      name: 'Provider A',
      merchant: { merchantId: 1, name: 'Merchant A' },
    })
    expect(provider.accounts.map((a) => a.name)).toEqual(['ProviderA-EUR', 'ProviderA-USD'])
    expect(ids(provider.channels, 'channelId')).toEqual([1001, 1002, 1003, 1007])
    for (const channel of provider.channels) {
      expect(channel).toMatchObject({
        gatewayId: 1,
        settlementTermDays: 14,
        rollingReservePct: '0.100000',
        rollingReserveDays: 180,
      })
    }
  })

  it('channel parameters differ per channel: RAM-13 and RAM-U1', async () => {
    const providerB = await json<Record<string, unknown>[]>('/providers/102/channels', 'admin')
    const providerC = await json<Record<string, unknown>[]>('/providers/201/channels', 'admin')

    expect(providerB.map((c) => c.name)).toEqual(['RAM-11', 'RAM-12', 'RAM-13'])
    expect(providerB[2]).toMatchObject({
      settlementTermDays: 10,
      rollingReservePct: '0.050000',
      rollingReserveDays: 120,
    })
    expect(providerC[0]).toMatchObject({
      name: 'RAM-U1',
      gatewayId: 2,
      settlementTermDays: 7,
      rollingReservePct: '0.000000',
      rollingReserveDays: 0,
    })
  })
})

// The schema does not force an AccountChannel row to join an account and a channel of the same provider,
// so both sides of every join carry the scope. These rows cross merchants on purpose and live only here.
describe('AccountChannel rows that cross merchants (defense in depth)', () => {
  // [account, channel, isPrimary]. RAM-01 already has a primary (UX_AccountChannel_primary), so the foreign
  // primary goes on RAM-07, which merchant 1 sees through ProviderA-USD.
  const CROSS_ROWS = [
    ['ProviderC-USD', RAM_01, false],
    ['ProviderA-USD', RAM_U1, false],
    ['ProviderA-USD', RAM_07, false],
    ['ProviderC-USD', RAM_07, true],
  ] as const

  beforeAll(async () => {
    for (const [account, channelId, isPrimary] of CROSS_ROWS) {
      const accountId = accountIds[account]!
      await ctx.prisma.accountChannel.upsert({
        where: { accountId_channelId: { accountId, channelId } },
        create: { accountId, channelId, isPrimary, assignedAt: HISTORY_ASSIGNED_AT },
        update: { isPrimary, assignedAt: HISTORY_ASSIGNED_AT },
      })
    }
  })

  afterAll(async () => {
    for (const [account, channelId] of CROSS_ROWS) {
      const accountId = accountIds[account]
      if (accountId) await ctx.prisma.accountChannel.deleteMany({ where: { accountId, channelId } })
    }
  })

  it('viewer does not see a channel of merchant 2 among the channels of ProviderA-USD', async () => {
    const channels = await json<{ channelId: number }[]>(`/accounts/${accountIds['ProviderA-USD']}/channels`, 'viewer')

    expect(ids(channels, 'channelId')).not.toContain(RAM_U1)
  })

  it('viewer does not see an account of merchant 2 as the primary account of a visible channel', async () => {
    const channels = await json<{ channelId: number; primaryAccount: { name: string } | null }[]>(
      `/accounts/${accountIds['ProviderA-USD']}/channels`,
      'viewer',
    )

    const ram07 = channels.find((c) => c.channelId === RAM_07)
    expect(ram07).toBeDefined()
    expect(ram07?.primaryAccount).toBeNull()
    expect(channels.map((c) => c.primaryAccount?.name)).not.toContain('ProviderC-USD')
  })

  it('viewer does not see an account of merchant 2 among the accounts of RAM-01', async () => {
    const accounts = await json<{ name: string }[]>(`/channels/${RAM_01}/accounts`, 'viewer')

    expect(accounts.map((a) => a.name)).toEqual(['ProviderA-USD', 'ProviderA-EUR'])
  })

  it('admin, whose scope covers both merchants, still sees the cross rows', async () => {
    const accounts = await json<{ name: string }[]>(`/channels/${RAM_01}/accounts`, 'admin')

    expect(accounts.map((a) => a.name)).toContain('ProviderC-USD')
  })
})
