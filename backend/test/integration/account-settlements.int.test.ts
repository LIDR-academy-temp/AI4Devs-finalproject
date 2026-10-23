import { randomUUID } from 'node:crypto'
import { AccountSettlementsQuery } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { PrismaSettlementQueries } from '../../src/modules/settlement/infrastructure/prisma-settlement-queries.js'
import { createPrismaClient, fixtureId } from './helpers.js'

// The attempts of an account against SQL Server (settlements-browse design D1–D4; spec settlement "Settlements de una
// cuenta", "Filtros…" and "Alcance…"). Seeded batches are only read. The New York midnight, the end of daylight saving
// on 2026-11-01 and the missing settlement date are written on an account of its own, created and removed here.
let prisma: PrismaClient
let queries: PrismaSettlementQueries
const ALL = { merchantIds: [1, 2] }
const MERCHANT_1 = { merchantIds: [1] }
const UNKNOWN = '00000000-0000-4000-8000-00000000ffff'
const accountIds: Record<string, string> = {}
const FIXTURE_ACCOUNT = 'Browse-Test-Account'
const fixture = { accountId: randomUUID() }
let fixtureCreated = false

const query = (overrides: Record<string, unknown> = {}) => AccountSettlementsQuery.parse(overrides)
const batchNos = (page: { items: { batchNo: number }[] } | null) => page?.items.map((i) => i.batchNo)

beforeAll(async () => {
  prisma = createPrismaClient()
  queries = new PrismaSettlementQueries(prisma)
  for (const a of await prisma.account.findMany({ select: { accountId: true, name: true } }))
    accountIds[a.name] = a.accountId
})

afterAll(async () => {
  if (!prisma) return
  if (fixtureCreated) {
    const accountId = fixtureId(fixture.accountId, 'fixture.accountId')
    await prisma.settlementBatch.deleteMany({ where: { accountId } })
    await prisma.import.deleteMany({ where: { accountId } })
    await prisma.account.deleteMany({ where: { accountId } })
  }
  await prisma.$disconnect()
})

const providerAUsd = () => fixtureId(accountIds['ProviderA-USD'], 'ProviderA-USD')

describe('seeded history of ProviderA-USD', () => {
  it('answers the 22 paid attempts, 122 to 101, with the columns of the contract', async () => {
    const page = await queries.accountSettlements(ALL, providerAUsd(), query())
    expect(page?.total).toBe(22)
    expect(batchNos(page)).toEqual(Array.from({ length: 22 }, (_, i) => 122 - i))
    const stored = await prisma.settlementBatch.findMany({
      where: { accountId: providerAUsd() },
      select: { batchNo: true, channels: true },
    })
    const channelsOf = new Map(stored.map((s) => [s.batchNo, s.channels]))
    for (const item of page!.items) {
      expect(item).toMatchObject({
        attemptNo: 1,
        status: 'paid',
        settledStatus: 'settled',
        approvedBy: { userName: 'analyst' },
      })
      expect(item.settlementDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(item.processedAt).toMatch(/Z$/)
      expect(item.amountPayable).toMatch(/^-?\d+\.\d{4}$/)
      expect(item.channels).toBe(channelsOf.get(item.batchNo))
    }
    const processed = page!.items.map((i) => i.processedAt)
    expect(processed).toEqual([...processed].sort().reverse())
  })

  it('adds up to the 68 paid batches of the seed across the accounts with history', async () => {
    let total = 0
    for (const accountId of Object.values(accountIds)) {
      const page = await queries.accountSettlements(ALL, accountId, query({ status: 'paid' }))
      total += page?.total ?? 0
    }
    expect(total).toBe(68)
  })

  it('filters by status: nothing processed, the 22 paid', async () => {
    expect((await queries.accountSettlements(ALL, providerAUsd(), query({ status: 'processed' })))?.total).toBe(0)
    expect((await queries.accountSettlements(ALL, providerAUsd(), query({ status: 'paid' })))?.total).toBe(22)
  })

  it('filters by settlement date, inclusive and open on one side', async () => {
    const all = (await queries.accountSettlements(ALL, providerAUsd(), query()))!.items
    const day = (batchNo: number) => all.find((i) => i.batchNo === batchNo)!.settlementDate!
    const exact = await queries.accountSettlements(ALL, providerAUsd(), query({ from: day(122), to: day(122) }))
    expect(batchNos(exact)).toEqual([122])
    const open = await queries.accountSettlements(ALL, providerAUsd(), query({ from: day(112) }))
    expect(batchNos(open)).toEqual(Array.from({ length: 11 }, (_, i) => 122 - i))
  })

  it('filters by the New York day of processedAt', async () => {
    const all = (await queries.accountSettlements(ALL, providerAUsd(), query()))!.items
    const processedAt = new Date(all.find((i) => i.batchNo === 122)!.processedAt)
    const etDay = processedAt.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const page = await queries.accountSettlements(
      ALL,
      providerAUsd(),
      query({ dateField: 'processedAt', from: etDay, to: etDay }),
    )
    expect(batchNos(page)).toEqual([122])
  })

  it('pages 10, 10 and 2 without repeating, and repeats a page identically', async () => {
    const pages = []
    for (const page of [1, 2, 3])
      pages.push((await queries.accountSettlements(ALL, providerAUsd(), query({ page, pageSize: 10 })))!)
    expect(pages.map((p) => p.items.length)).toEqual([10, 10, 2])
    const ids = pages.flatMap((p) => p.items.map((i) => i.batchId))
    expect(new Set(ids).size).toBe(22)
    expect(await queries.accountSettlements(ALL, providerAUsd(), query({ page: 2, pageSize: 10 }))).toEqual(pages[1])
  })
})

describe('scope', () => {
  it('answers null for an account of ProviderC-Alt with a merchant-1 scope, as for an unknown account', async () => {
    const foreign = fixtureId(accountIds['ProviderC-Alt'], 'ProviderC-Alt')
    expect(await queries.accountSettlements(MERCHANT_1, foreign, query())).toBeNull()
    expect(await queries.accountSettlements(ALL, UNKNOWN, query())).toBeNull()
    expect((await queries.accountSettlements({ merchantIds: [2] }, foreign, query()))?.total).toBeGreaterThan(0)
  })
})

describe('an account of its own', () => {
  const at = (iso: string) => new Date(iso)

  beforeAll(async () => {
    const source = await prisma.account.findUniqueOrThrow({
      where: { accountId: providerAUsd() },
      select: { providerId: true, createdByUserId: true },
    })
    await prisma.account.create({
      data: {
        accountId: fixture.accountId,
        providerId: source.providerId,
        name: FIXTURE_ACCOUNT,
        chargebackReservePolicy: 'hold_until_term',
        createdByUserId: source.createdByUserId,
      },
    })
    fixtureCreated = true
  })

  /** One import per attempt: an import has at most one attempt that is not undone (UX_SettlementBatch_active_import). */
  async function attempt(batchNo: number, processedAt: Date, settlementDate: Date | null) {
    const analyst = await prisma.user.findFirstOrThrow({ where: { userName: 'analyst' }, select: { userId: true } })
    const importId = randomUUID()
    await prisma.import.create({
      data: { importId, accountId: fixture.accountId, createdByUserId: analyst.userId, status: 'processed' },
    })
    await prisma.settlementBatch.create({
      data: {
        batchId: randomUUID(),
        accountId: fixture.accountId,
        batchNo,
        importId,
        status: 'processed',
        approvedByUserId: analyst.userId,
        processedAt,
        settlementDate,
      },
    })
  }

  it('answers an empty page for an account without attempts', async () => {
    expect(await queries.accountSettlements(ALL, fixture.accountId, query())).toEqual({ items: [], total: 0 })
  })

  it('leaves an attempt without settlement date out of a date filter, never out of the plain list', async () => {
    await attempt(1, at('2026-10-10T15:00:00.000Z'), null)
    const plain = await queries.accountSettlements(ALL, fixture.accountId, query())
    expect(plain?.items.map((i) => [i.batchNo, i.settlementDate])).toEqual([[1, null]])
    const filtered = await queries.accountSettlements(ALL, fixture.accountId, query({ from: '2000-01-01' }))
    expect(filtered?.total).toBe(0)
  })

  it('splits the processed days at New York midnight, not at UTC midnight', async () => {
    await attempt(2, at('2026-10-21T03:59:59.000Z'), at('2026-10-24T00:00:00.000Z'))
    await attempt(3, at('2026-10-21T04:00:00.000Z'), at('2026-10-24T00:00:00.000Z'))
    const day = (d: string) =>
      queries.accountSettlements(ALL, fixture.accountId, query({ dateField: 'processedAt', from: d, to: d }))
    expect(batchNos(await day('2026-10-20'))).toEqual([2])
    expect(batchNos(await day('2026-10-21'))).toEqual([3])
  })

  it('follows the end of daylight saving on 2026-11-01', async () => {
    // 04:30Z on Nov 2 is 23:30 EST on Nov 1; with a fixed -04:00 offset it would fall on Nov 2.
    await attempt(4, at('2026-11-02T04:30:00.000Z'), at('2026-11-05T00:00:00.000Z'))
    await attempt(5, at('2026-11-02T05:00:00.000Z'), at('2026-11-05T00:00:00.000Z'))
    const day = (d: string) =>
      queries.accountSettlements(ALL, fixture.accountId, query({ dateField: 'processedAt', from: d, to: d }))
    expect(batchNos(await day('2026-11-01'))).toEqual([4])
    expect(batchNos(await day('2026-11-02'))).toEqual([5])
  })

  it('compares the settlement date as stored when dateField is settlementDate', async () => {
    const page = await queries.accountSettlements(
      ALL,
      fixture.accountId,
      query({ from: '2026-10-24', to: '2026-10-24' }),
    )
    expect(batchNos(page)).toEqual([3, 2])
  })
})
