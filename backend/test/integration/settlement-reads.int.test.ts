import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type SettlementRequest, SettlementView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { Prisma } from '../../src/generated/prisma/client.js'
import type { StoredMovement } from '../../src/modules/settlement/application/read-ports.js'
import { PrismaSettlementQueries } from '../../src/modules/settlement/infrastructure/prisma-settlement-queries.js'
import { createTestApp, fixtureId } from './helpers.js'
import {
  type AccountChannelRow,
  expectedOf,
  ImportFlow,
  restoreAccountChannels,
  snapshotAccountChannels,
} from './import-flow.js'

// Reads of an attempt against SQL Server (summary-exports design D3, D4, D6, D11; spec settlement "Lectura del
// intento", "Movimientos del intento", "Intentos de un import"). batch-clean is processed through the API of #11 and
// removed with its import; the AccountChannel rows go back to the snapshot. Seeded batches are only read.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string
let channels: AccountChannelRow[]
let queries: PrismaSettlementQueries
const log = { warn: vi.fn() }
const ALL = { merchantIds: [1, 2] }
const MERCHANT_1 = { merchantIds: [1] }
const UNKNOWN = '00000000-0000-4000-8000-00000000ffff'
const BATCH_CLEAN_FEES: SettlementRequest['batchFees'] = [
  { feeTypeId: 121, feeId: null, amount: '25.0000', description: 'Wire Fee', source: 'file' },
  { feeTypeId: 117, feeId: null, amount: '15.0000', description: 'Settlement Fee', source: 'file' },
]

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-settlement-reads-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
  channels = await snapshotAccountChannels(ctx.prisma)
  queries = new PrismaSettlementQueries(ctx.prisma, { log })
})

afterAll(async () => {
  if (ctx) {
    try {
      await flow.close()
    } finally {
      await restoreAccountChannels(ctx.prisma, channels)
    }
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

const lower = (id: string) => id.toLowerCase()

/** A seeded batch of the account: only the seed writes paid batches (no sheet nor row on its movements). */
async function seededBatch(account: string): Promise<string> {
  const batch = await ctx.prisma.settlementBatch.findFirst({
    where: { status: 'paid', account: { name: account } },
    orderBy: { batchNo: 'asc' },
    select: { batchId: true },
  })
  return fixtureId(batch?.batchId, `a seeded batch of ${account}`)
}

/** Every E movement of the attempt, page after page. */
async function allPages(batchId: string, pageSize: number, pages: number): Promise<StoredMovement[]> {
  const items: StoredMovement[] = []
  for (let page = 1; page <= pages; page++)
    items.push(...(await queries.movementsPage(batchId, 'E', page, pageSize)).items)
  return items
}

describe('batch-clean processed', () => {
  let importId: string
  let batchId: string

  beforeAll(async () => {
    const validated = await flow.validatedSample('batch-clean')
    importId = validated.importId
    const res = await flow.call('POST', `/imports/${importId}/settlements`, {
      runId: validated.runId,
      confirmChannelAssignment: true,
      batchFees: BATCH_CLEAN_FEES,
    })
    expect(res.statusCode, res.body).toBe(201)
    batchId = SettlementView.parse(res.json()).batchId
  })

  describe('batchHeader', () => {
    it('answers the attempt within the scope, for the file name and the RR', async () => {
      const header = await queries.batchHeader(MERCHANT_1, batchId)
      expect(header).toMatchObject({ accountName: 'ProviderA-USD', batchNo: 123, attemptNo: 1, status: 'processed' })
      expect(lower(header!.batchId)).toBe(lower(batchId))
      expect(lower(header!.accountId)).toBe(lower(flow.accountIds['ProviderA-USD']!))
    })

    it('answers null for an unknown id', async () => {
      expect(await queries.batchHeader(ALL, UNKNOWN)).toBeNull()
    })
  })

  describe('movementsPage', () => {
    it('answers the 10 adjustments with their fee breakdown, ordered and adding up to feeAmount', async () => {
      const page = await queries.movementsPage(batchId, 'I', 1, 50)
      expect(page.total).toBe(10)
      expect(page.items).toHaveLength(10)
      const byStatus = page.items.reduce<Record<string, number>>((acc, m) => {
        acc[m.status] = (acc[m.status] ?? 0) + 1
        return acc
      }, {})
      expect(byStatus).toEqual({ Chargeback: 2, Refund: 6, RDR: 2 })
      for (const m of page.items) {
        expect(m.cycle).toBe('I')
        expect(m.sheetName).not.toBeNull()
        const ids = m.fees.map((f) => BigInt(f.appliedFeeId))
        expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
        const sum = m.fees.reduce((s, f) => s.plus(f.amountUsd), new Prisma.Decimal(0))
        expect(sum.toFixed(4)).toBe(m.feeAmount)
      }
    })

    it('carries money as 4-decimal text and BIGINT ids as strings', async () => {
      const [m] = (await queries.movementsPage(batchId, 'E', 1, 1)).items
      expect(m!.amount).toMatch(/^-?\d+\.\d{4}$/)
      expect(m!.appliedReservePct).toMatch(/^\d\.\d{6}$/)
      expect(typeof m!.settlementTxnId).toBe('string')
      expect(typeof m!.transactionId).toBe('string')
    })

    it('pages the 450 E movements in seven pages of 70, each once, and repeats a page identically', async () => {
      const items = await allPages(batchId, 70, 7)
      const ids = items.map((m) => m.settlementTxnId)
      expect(ids).toHaveLength(450)
      expect(new Set(ids).size).toBe(450)
      expect((await queries.movementsPage(batchId, 'E', 1, 70)).total).toBe(450)
      const third = await queries.movementsPage(batchId, 'E', 3, 70)
      expect((await queries.movementsPage(batchId, 'E', 3, 70)).items).toEqual(third.items)
    })

    it('answers an empty page past the end', async () => {
      const page = await queries.movementsPage(batchId, 'E', 10, 70)
      expect(page).toEqual({ items: [], total: 450 })
    })
  })

  describe('exportRows', () => {
    it('answers the E and I movements in the stable order, E first and then the same order as the pages', async () => {
      const rows = await queries.exportRows(batchId, ['E', 'I'])
      expect(rows).toHaveLength(460)
      expect(rows.slice(0, 450).every((r) => r.cycle === 'E')).toBe(true)
      expect(rows.slice(450).every((r) => r.cycle === 'I')).toBe(true)
      const pages = await allPages(batchId, 70, 7)
      expect(rows.slice(0, 450).map((r) => r.sourceTransactionId)).toEqual(pages.map((m) => m.sourceTransactionId))
    })

    it('answers the 320 R movements', async () => {
      const rows = await queries.exportRows(batchId, ['R'])
      const qty = (expectedOf('batch-clean').summary as { qty: Record<string, number> }).qty
      expect(rows).toHaveLength(qty.reservesReleased!)
      expect(rows.every((r) => r.cycle === 'R')).toBe(true)
    })
  })

  describe('importAttempts', () => {
    it('answers the attempt as current, with the user who approved it and its amount payable', async () => {
      const attempts = await queries.importAttempts(ALL, importId)
      expect(attempts).not.toBeNull()
      expect(lower(attempts!.currentBatchId!)).toBe(lower(batchId))
      expect(attempts!.items).toHaveLength(1)
      expect(attempts!.items[0]).toMatchObject({
        batchNo: 123,
        attemptNo: 1,
        status: 'processed',
        settledStatus: 'pending_payment',
        approvedBy: { userId: flow.userIds.analyst, userName: 'analyst' },
        amountPayable: (expectedOf('batch-clean').summary as { amountPayable: string }).amountPayable,
        isCurrent: true,
      })
    })

    it('answers null outside the scope or for an unknown import', async () => {
      expect(await queries.importAttempts({ merchantIds: [2] }, importId)).toBeNull()
      expect(await queries.importAttempts(ALL, UNKNOWN)).toBeNull()
    })
  })
})

describe('an import validated but not processed', () => {
  it('answers no attempts', async () => {
    const { importId } = await flow.validatedSample('batch-split')
    expect(await queries.importAttempts(ALL, importId)).toEqual({
      importId: expect.any(String),
      currentBatchId: null,
      items: [],
    })
  })
})

describe('seeded history', () => {
  it('hides a batch of ProviderC-Alt (merchant 2) from a merchant-1 scope, as an unknown id', async () => {
    const batchId = await seededBatch('ProviderC-Alt')
    expect(await queries.batchHeader(MERCHANT_1, batchId)).toBeNull()
    expect(await queries.batchHeader({ merchantIds: [2] }, batchId)).toMatchObject({ status: 'paid' })
  })

  it('orders the movements of a seeded batch, without sheet nor row, by settlementTxnId', async () => {
    const batchId = await seededBatch('ProviderA-USD')
    const { items, total } = await queries.movementsPage(batchId, 'E', 1, 500)
    expect(total).toBeGreaterThan(0)
    expect(items.every((m) => m.sheetId === null && m.sheetName === null && m.rowNo === null)).toBe(true)
    const ids = items.map((m) => BigInt(m.settlementTxnId))
    expect(ids).toEqual([...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)))
  })
})

describe('sourceIds', () => {
  it('translates internal transaction ids to their source ids', async () => {
    const txns = await ctx.prisma.transaction.findMany({
      take: 3,
      orderBy: { transactionId: 'asc' },
      select: { transactionId: true, sourceTransactionId: true },
    })
    const map = await queries.sourceIds(txns.map((t) => String(t.transactionId)))
    expect(map).toEqual(new Map(txns.map((t) => [String(t.transactionId), t.sourceTransactionId])))
  })

  it('answers an empty map for no ids', async () => {
    expect(await queries.sourceIds([])).toEqual(new Map())
  })

  it('translates more than 500 ids, in several chunks', async () => {
    const txns = await ctx.prisma.transaction.findMany({
      take: 1200,
      orderBy: { transactionId: 'asc' },
      select: { transactionId: true },
    })
    expect(txns).toHaveLength(1200)
    const map = await queries.sourceIds(txns.map((t) => String(t.transactionId)))
    expect(map.size).toBe(1200)
  })
})
