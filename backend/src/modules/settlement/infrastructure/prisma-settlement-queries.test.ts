import { describe, expect, it, vi } from 'vitest'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { PrismaSettlementQueries } from './prisma-settlement-queries.js'

// The adapter's queries over a stub Prisma client (summary-exports design D4, D6, D11): the orders it asks for, which
// SQL Server cannot tell apart on the seed (seeded movements tie on a NULL sheet and row and the (batchId, cycle)
// index already returns them by settlementTxnId), and that it keeps movements of the same transaction apart.
const BATCH_ID = '6f1c2a5e-0000-4000-8000-000000000001'
const IMPORT_ID = '6f1c2a5e-0000-4000-8000-000000000002'
const money = (value: string) => new Prisma.Decimal(value)

/** A Refund and a Chargeback of the same transaction in cycle I, as SettlementTransaction rows. */
const SAME_TRANSACTION = [5, 4].map((statusId, i) => ({
  settlementTxnId: BigInt(88213 + i),
  batchId: BATCH_ID,
  transactionId: BigInt(40711),
  cycle: 'I',
  statusId,
  settlementStatusId: 0,
  roundNo: 1,
  sheetId: null,
  rowNo: null,
  amount: money('96.93'),
  excludeAmount: false,
  feeAmount: money('0'),
  eventDate: null,
  appliedReservePct: money('0.1'),
  reserveDaysUsed: 180,
  expectedReserveReleaseAt: null,
  reservePolicySnapshot: null,
  reserveEarlyReleasedAmt: money('0'),
  reserveHeldAmt: money('0'),
  reserveReleasedAmt: money('0'),
  transaction: { sourceTransactionId: '911545598812004', gatewayId: 1 },
  sheet: null,
}))

function stubPrisma(rows: unknown[] = []) {
  const findMany = vi.fn(async (_args: { orderBy: Record<string, string>[] }) => rows)
  const batchFindMany = vi.fn(async (_args: { orderBy: Record<string, string>[] }) => [])
  const prisma = {
    settlementTransaction: { count: vi.fn(async () => rows.length), findMany },
    settlementTransactionFee: { findMany: vi.fn(async () => []) },
    import: { findFirst: vi.fn(async () => ({ importId: IMPORT_ID, currentBatchId: null })) },
    settlementBatch: { findMany: batchFindMany },
  }
  return { prisma: prisma as unknown as PrismaClient, findMany, batchFindMany }
}

const keys = (orderBy: Record<string, string>[]) => orderBy.map((o) => Object.keys(o)[0])
const directions = (orderBy: Record<string, string>[]) => orderBy.map((o) => Object.values(o)[0])

describe('PrismaSettlementQueries order', () => {
  it('pages the movements by sheet, row and, last, settlementTxnId', async () => {
    const { prisma, findMany } = stubPrisma()
    await new PrismaSettlementQueries(prisma).movementsPage(BATCH_ID, 'E', 2, 70)
    const args = findMany.mock.calls[0]![0] as { orderBy: Record<string, string>[]; skip: number; take: number }
    expect(keys(args.orderBy)).toEqual(['sheetId', 'rowNo', 'settlementTxnId'])
    expect(args.orderBy.every((o) => Object.values(o)[0] === 'asc')).toBe(true)
    expect([args.skip, args.take]).toEqual([70, 70])
  })

  it('reads the export rows by cycle, sheet, row and, last, settlementTxnId', async () => {
    const { prisma, findMany } = stubPrisma()
    await new PrismaSettlementQueries(prisma).exportRows(BATCH_ID, ['E', 'I'])
    expect(keys(findMany.mock.calls[0]![0].orderBy)).toEqual(['cycle', 'sheetId', 'rowNo', 'settlementTxnId'])
  })

  it('lists the attempts of an import newest first: processedAt, then attemptNo, both descending', async () => {
    const { prisma, batchFindMany } = stubPrisma()
    await new PrismaSettlementQueries(prisma).importAttempts({ merchantIds: [1] }, IMPORT_ID)
    const { orderBy } = batchFindMany.mock.calls[0]![0]
    expect(keys(orderBy)).toEqual(['processedAt', 'attemptNo'])
    expect(directions(orderBy)).toEqual(['desc', 'desc'])
  })
})

describe('PrismaSettlementQueries with two movements of the same transaction and cycle', () => {
  it('pages a Refund and a Chargeback of the same transaction as two movements', async () => {
    const { prisma } = stubPrisma(SAME_TRANSACTION)
    const { items, total } = await new PrismaSettlementQueries(prisma).movementsPage(BATCH_ID, 'I', 1, 50)
    expect(total).toBe(2)
    expect(items.map((m) => [m.settlementTxnId, m.sourceTransactionId, m.status])).toEqual([
      ['88213', '911545598812004', 'Refund'],
      ['88214', '911545598812004', 'Chargeback'],
    ])
  })

  it('answers both as export rows', async () => {
    const { prisma } = stubPrisma(SAME_TRANSACTION)
    const rows = await new PrismaSettlementQueries(prisma).exportRows(BATCH_ID, ['I'])
    expect(rows.map((r) => [r.sourceTransactionId, r.status])).toEqual([
      ['911545598812004', 'Refund'],
      ['911545598812004', 'Chargeback'],
    ])
  })
})
