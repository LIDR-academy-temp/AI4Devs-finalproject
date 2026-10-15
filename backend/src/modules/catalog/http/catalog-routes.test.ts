import {
  AccountChannelItem,
  AccountDetail,
  AccountSummary,
  ChannelAccountItem,
  ChannelSummary,
  MerchantSummary,
  ProviderDetail,
  ProviderSummary,
} from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildTestApp, PASSWORD } from '../../auth/http/test-support.js'
import { ACCOUNT_IDS, InMemoryCatalogRepository } from '../application/__fakes__/in-memory.js'
import { CatalogService } from '../application/catalog-service.js'

let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  ctx = await buildTestApp({ catalogService: new CatalogService(new InMemoryCatalogRepository()) })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

async function tokenOf(userName: string): Promise<string> {
  const { accessToken } = await ctx.authService.login({ userName, password: PASSWORD })
  return accessToken
}

async function get(url: string, userName?: string) {
  const headers = userName ? { authorization: `Bearer ${await tokenOf(userName)}` } : {}
  return ctx.app.inject({ method: 'GET', url: `/api/v1${url}`, headers })
}

describe('authentication', () => {
  it('answers 401 unauthorized without a token', async () => {
    const res = await get('/merchants')

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('lets viewer (no management permission) read the catalog', async () => {
    const res = await get('/providers/101/accounts', 'viewer')

    expect(res.statusCode).toBe(200)
  })
})

describe('merchant scope', () => {
  it('viewer sees only merchant 1', async () => {
    const res = await get('/merchants', 'viewer')

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([{ merchantId: 1, name: 'Merchant A', isActive: true }])
  })

  it('a user without merchants sees an empty catalog', async () => {
    expect((await get('/merchants', 'unassigned')).json()).toEqual([])
    expect((await get('/channels', 'unassigned')).json()).toEqual([])
  })

  it.each([
    { url: '/providers/201', unknown: '/providers/999' },
    { url: '/providers/201/channels', unknown: '/providers/999/channels' },
    { url: '/merchants/2/providers', unknown: '/merchants/999/providers' },
    { url: `/accounts/${ACCOUNT_IDS['ProviderC-USD']}`, unknown: '/accounts/00000000-0000-4000-8000-00000000ffff' },
    { url: '/channels/2001/accounts', unknown: '/channels/9999/accounts' },
  ])('viewer gets 404 not_found for $url, identical to an unknown id', async ({ url, unknown }) => {
    const outside = await get(url, 'viewer')
    const missing = await get(unknown, 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.json().code).toBe('not_found')
    expect(missing.statusCode).toBe(404)
    expect(outside.body).toBe(missing.body)
  })
})

describe('request validation', () => {
  it('answers 400 validation_error for an accountId that is not a UUID', async () => {
    const res = await get('/accounts/not-a-uuid', 'admin')

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })

  it('answers 400 validation_error for unassigned=nope', async () => {
    const res = await get('/channels?unassigned=nope', 'admin')

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })
})

describe('unassigned channels', () => {
  it('GET /channels?unassigned=true lists RAM-07 and RAM-13 only', async () => {
    const res = await get('/channels?unassigned=true', 'admin')

    expect(res.statusCode).toBe(200)
    expect(res.json().map((c: { channelId: number }) => c.channelId)).toEqual([1007, 1013])
  })

  it('GET /channels without the filter lists every channel in scope', async () => {
    expect((await get('/channels', 'viewer')).json()).toHaveLength(7)
    expect((await get('/channels', 'admin')).json()).toHaveLength(9)
    expect((await get('/channels?unassigned=false', 'admin')).json()).toHaveLength(9)
  })
})

describe('response shapes match @recon/shared', () => {
  it.each([
    { url: '/merchants', schema: z.array(MerchantSummary) },
    { url: '/merchants/1/providers', schema: z.array(ProviderSummary) },
    { url: '/providers/101', schema: ProviderDetail },
    { url: '/providers/101/channels', schema: z.array(ChannelSummary) },
    { url: '/providers/101/accounts', schema: z.array(AccountSummary) },
    { url: `/accounts/${ACCOUNT_IDS['ProviderA-EUR']}`, schema: AccountDetail },
    { url: `/accounts/${ACCOUNT_IDS['ProviderA-USD']}/channels`, schema: z.array(AccountChannelItem) },
    { url: '/channels', schema: z.array(ChannelSummary) },
    { url: '/channels/1001/accounts', schema: z.array(ChannelAccountItem) },
  ])('$url', async ({ url, schema }) => {
    const res = await get(url, 'admin')

    expect(res.statusCode).toBe(200)
    const parsed = schema.safeParse(res.json())
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
  })

  it('serializes money and percentages as strings', async () => {
    const account = (await get(`/accounts/${ACCOUNT_IDS['ProviderA-EUR']}`, 'admin')).json()
    const channels = (await get('/providers/102/channels', 'admin')).json()

    expect(account.rollingReserveCapAmt).toBe('50000.0000')
    expect(channels[2]).toMatchObject({ name: 'RAM-13', rollingReservePct: '0.050000', rollingReserveDays: 120 })
  })

  it('returns the current primary account of each channel of an account', async () => {
    const res = await get(`/accounts/${ACCOUNT_IDS['ProviderA-USD']}/channels`, 'viewer')

    expect(res.json()).toHaveLength(2)
    for (const item of res.json()) {
      expect(item).toMatchObject({ isPrimary: true, primaryAccount: { name: 'ProviderA-USD' } })
    }
  })
})
