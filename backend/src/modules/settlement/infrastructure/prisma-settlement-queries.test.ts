import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import { PrismaSettlementQueries } from './prisma-settlement-queries.js'

// The stable order of the movements (summary-exports design D4, D6): settlementTxnId is the last criterion. Against
// SQL Server it cannot be told apart, because seeded movements tie on a NULL sheet and row and the (batchId, cycle)
// index already returns them by settlementTxnId; so the order the adapter asks for is checked here.
const BATCH_ID = '6f1c2a5e-0000-4000-8000-000000000001'

function stubPrisma() {
  const findMany = vi.fn(async (_args: { orderBy: Record<string, string>[] }) => [])
  const prisma = {
    settlementTransaction: { count: vi.fn(async () => 0), findMany },
    settlementTransactionFee: { findMany: vi.fn(async () => []) },
  }
  return { prisma: prisma as unknown as PrismaClient, findMany }
}

const keys = (orderBy: Record<string, string>[]) => orderBy.map((o) => Object.keys(o)[0])

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
})
