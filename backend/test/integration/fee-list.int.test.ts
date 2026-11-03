import { FeePage } from '@recon/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, fixtureIds, SEED_PASSWORD } from './helpers.js'

// Spec fees (admin-fees): "Vista global de fees", "Orden de la vista global", "Filtros de la vista global", "Estado de
// un fee", "Campos ampliados de un fee de la cuenta". Against the seed; fees created here are removed after each test.
let ctx: Awaited<ReturnType<typeof createTestApp>>
const tokens: Record<string, string> = {}
const accounts: Record<string, { accountId: string; providerId: number; merchantId: number }> = {}
const feeTypeIds: Record<string, number> = {}
let created: string[] = []

beforeAll(async () => {
  ctx = await createTestApp()
  for (const a of await ctx.prisma.account.findMany({
    select: { accountId: true, name: true, providerId: true, provider: { select: { merchantId: true } } },
  }))
    accounts[a.name] = { accountId: a.accountId, providerId: a.providerId, merchantId: a.provider.merchantId }
  for (const t of await ctx.prisma.feeType.findMany({ select: { feeTypeId: true, code: true } }))
    feeTypeIds[t.code] = t.feeTypeId
  for (const userName of ['admin', 'analyst', 'viewer']) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    tokens[userName] = res.json().accessToken
  }
})

afterEach(async () => {
  const ids = fixtureIds(created, 'created fees')
  await ctx.prisma.auditLog.deleteMany({
    where: { entityType: 'Fee', entityId: { in: ids.map((id) => id.toLowerCase()) } },
  })
  await ctx.prisma.feeHistory.deleteMany({ where: { feeId: { in: ids } } })
  await ctx.prisma.fee.deleteMany({ where: { feeId: { in: ids } } })
  created = []
})

afterAll(async () => {
  if (ctx) {
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
})

const get = (url: string, as = 'analyst') =>
  ctx.app.inject({ method: 'GET', url: `/api/v1${url}`, headers: { authorization: `Bearer ${tokens[as]}` } })

async function page(url: string, as = 'analyst') {
  const res = await get(url, as)
  expect(res.statusCode, res.body).toBe(200)
  return FeePage.parse(res.json())
}

async function createFee(account: string, body: object) {
  const res = await ctx.app.inject({
    method: 'POST',
    url: `/api/v1/accounts/${accounts[account]!.accountId}/fees`,
    headers: { authorization: `Bearer ${tokens.admin}` },
    payload: body,
  })
  expect(res.statusCode, res.body).toBe(201)
  created.push(res.json().feeId)
  return res.json()
}

describe('GET /fees', () => {
  it('lists the active fees of a merchant, grouped by provider and account, with the total', async () => {
    const result = await page('/fees?merchantId=1&status=active&pageSize=500')

    expect(result.items.length).toBeGreaterThan(0)
    expect(result.total).toBe(result.items.length)
    expect(result.total).toBe(await ctx.prisma.fee.count({ where: { account: { provider: { merchantId: 1 } } } }))
    for (const item of result.items) {
      expect(item.merchant.id).toBe(1)
      expect(item.status).toBe('active')
    }
    // Each account appears as one contiguous run, so the screen can show merchant › provider › account as columns.
    const runs = result.items.map((i) => i.account.id).filter((id, n, all) => n === 0 || all[n - 1] !== id)
    expect(new Set(runs).size).toBe(runs.length)
    const providerRuns = result.items.map((i) => i.provider.id).filter((id, n, all) => n === 0 || all[n - 1] !== id)
    expect(new Set(providerRuns).size).toBe(providerRuns.length)
  })

  it('kind=preset gives the batch presets of ProviderB-Main: Monthly Fee 250.0000', async () => {
    const result = await page(`/fees?accountId=${accounts['ProviderB-Main']!.accountId}&kind=preset`)

    expect(result.items.map((i) => [i.code, i.fixedAmount, i.isTransactional])).toEqual([
      ['Monthly Fee', '250.0000', false],
    ])
    expect(result.items[0]).toMatchObject({
      account: { name: 'ProviderB-Main' },
      provider: { id: accounts['ProviderB-Main']!.providerId },
    })
  })

  it('kind=transactional gives only the fees computed per movement', async () => {
    const result = await page(`/fees?accountId=${accounts['ProviderA-USD']!.accountId}&kind=transactional`)
    expect(result.items).toHaveLength(6)
    expect(result.items.every((i) => i.isTransactional)).toBe(true)
  })

  it('stays inside the scope of the viewer; filters outside it answer 404', async () => {
    const result = await page('/fees?pageSize=500', 'viewer')
    expect(result.items.every((i) => i.merchant.id === 1)).toBe(true)

    for (const url of [
      '/fees?merchantId=2',
      `/fees?providerId=${accounts['ProviderC-Alt']!.providerId}`,
      `/fees?accountId=${accounts['ProviderC-Alt']!.accountId}`,
      '/fees?accountId=00000000-0000-4000-8000-00000000ffff',
      '/fees?merchantId=999',
    ]) {
      const res = await get(url, 'viewer')
      expect(res.statusCode, url).toBe(404)
      expect(res.json().code).toBe('not_found')
    }
  })

  it('pages are stable: consecutive pages neither repeat nor lose a fee', async () => {
    const first = await page('/fees?pageSize=5&page=1')
    const second = await page('/fees?pageSize=5&page=2')
    const both = await page('/fees?pageSize=10&page=1')

    expect([...first.items, ...second.items].map((i) => i.feeId)).toEqual(both.items.map((i) => i.feeId))
    expect(first.total).toBe(second.total)
    expect(first).toMatchObject({ page: 1, pageSize: 5 })
  })

  it('answers 400 validation_error to an invalid page size or an unknown parameter', async () => {
    for (const url of ['/fees?pageSize=0', '/fees?pageSize=501', '/fees?kind=batch', '/fees?sort=title']) {
      const res = await get(url)
      expect(res.statusCode, url).toBe(400)
      expect(res.json().code).toBe('validation_error')
    }
  })

  it('q searches the account name, the type and the description, without case', async () => {
    const result = await page('/fees?q=CHARGEBACK&pageSize=500')

    expect(result.items.length).toBeGreaterThan(0)
    for (const i of result.items)
      expect(`${i.account.name} ${i.code} ${i.title} ${i.description ?? ''}`.toLowerCase()).toContain('chargeback')
  })

  it('status separates scheduled, closed and active fees against today in New York', async () => {
    const account = accounts['ProviderA-USD']!.accountId
    const scheduled = await createFee('ProviderA-USD', {
      feeTypeId: feeTypeIds['Annual Fee'],
      fixedAmount: '500',
      startDate: '2099-01-01',
    })
    const closed = await createFee('ProviderA-USD', {
      feeTypeId: feeTypeIds['Setup Fee'],
      fixedAmount: '100',
      endDate: '2001-01-31',
    })

    const ids = async (status: string) =>
      (await page(`/fees?accountId=${account}&status=${status}&pageSize=500`)).items.map((i) => i.feeId)

    expect(await ids('scheduled')).toEqual([scheduled.feeId])
    expect(await ids('closed')).toEqual([closed.feeId])
    const active = await ids('active')
    expect(active).not.toContain(scheduled.feeId)
    expect(active).not.toContain(closed.feeId)
    expect((await page(`/fees?accountId=${account}&pageSize=500`)).total).toBe(active.length + 2)
  })

  it('carries the usage of the fees of the page', async () => {
    const mdr = await ctx.prisma.fee.findFirstOrThrow({
      where: { accountId: accounts['ProviderA-USD']!.accountId, feeType: { code: 'MDR' } },
    })
    const latest = await ctx.prisma.settlementTransactionFee.aggregate({
      where: { feeId: mdr.feeId },
      _max: { eventDate: true },
    })

    const result = await page(`/fees?accountId=${accounts['ProviderA-USD']!.accountId}&q=MDR`)

    const item = result.items.find((i) => i.feeId.toLowerCase() === mdr.feeId.toLowerCase())
    expect(item).toMatchObject(
      latest._max.eventDate === null
        ? { inUse: false, lastAppliedEventDate: null }
        : { inUse: true, lastAppliedEventDate: latest._max.eventDate.toISOString().slice(0, 10) },
    )
  })
})
