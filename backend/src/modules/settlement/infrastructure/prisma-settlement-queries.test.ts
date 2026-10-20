import { describe, expect, it, vi } from 'vitest'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { PrismaSettlementQueries } from './prisma-settlement-queries.js'

// The adapter's queries over a stub Prisma client (summary-exports design D4, D6, D11): the orders it asks for, which
// SQL Server cannot tell apart on the seed (seeded movements tie on a NULL sheet and row and the (batchId, cycle)
// index already returns them by settlementTxnId), and how a stored movement is mapped to the contract.
const BATCH_ID = '6f1c2a5e-0000-4000-8000-000000000001'
const IMPORT_ID = '6f1c2a5e-0000-4000-8000-000000000002'
const money = (value: string) => new Prisma.Decimal(value)

/** A CHB 2 Chargeback of cycle I as a SettlementTransaction row, with its transaction and sheet. */
const MOVEMENT = {
  settlementTxnId: BigInt(88213),
  batchId: BATCH_ID,
  transactionId: BigInt(40711),
  cycle: 'I',
  statusId: 4,
  settlementStatusId: 0,
  roundNo: 2,
  sheetId: '2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  rowNo: 2,
  amount: money('96.93'),
  excludeAmount: true,
  feeAmount: money('47.5'),
  eventDate: new Date('2026-10-03T14:12:00.000Z'),
  appliedReservePct: money('0.1'),
  reserveDaysUsed: 180,
  expectedReserveReleaseAt: null,
  reservePolicySnapshot: null as string | null,
  reserveEarlyReleasedAmt: money('-1.25'),
  reserveHeldAmt: money('0'),
  reserveReleasedAmt: money('0'),
  transaction: { sourceTransactionId: '911545598812004', gatewayId: 1 },
  sheet: { sheetName: 'CHB' },
}

function stubPrisma(rows: unknown[] = [], fees: unknown[] = []) {
  const findMany = vi.fn(async (_args: { orderBy: Record<string, string>[] }) => rows)
  const batchFindMany = vi.fn(async (_args: { orderBy: Record<string, string>[] }) => [])
  const prisma = {
    settlementTransaction: { count: vi.fn(async () => rows.length), findMany },
    settlementTransactionFee: { findMany: vi.fn(async () => fees) },
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

describe('PrismaSettlementQueries mapping of a movement', () => {
  it('answers BIGINT ids as strings, DECIMAL as fixed text and an unreadable snapshot as null with a warning', async () => {
    const log = { warn: vi.fn() }
    const fees = [
      {
        appliedFeeId: BigInt(120334),
        settlementTxnId: BigInt(88213),
        feeId: '0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2d',
        feeTypeId: 4,
        eventDate: new Date('2026-10-03T14:12:00.000Z'),
        amountUsd: money('45'),
        configurationSnapshot: '{"fixedAmount":"45.0000","percentage":null}',
        feeType: { code: 'Chargeback', title: 'Chargeback' },
      },
      {
        appliedFeeId: BigInt(120335),
        settlementTxnId: BigInt(88213),
        feeId: '0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2e',
        feeTypeId: 5,
        eventDate: null,
        amountUsd: money('2.5'),
        configurationSnapshot: '[1,2]',
        feeType: { code: 'Refund', title: 'Refund' },
      },
    ]
    const { prisma } = stubPrisma([{ ...MOVEMENT, reservePolicySnapshot: 'not json' }], fees)
    const { items } = await new PrismaSettlementQueries(prisma, { log }).movementsPage(BATCH_ID, 'I', 1, 50)

    expect(items).toEqual([
      {
        settlementTxnId: '88213',
        transactionId: '40711',
        sourceTransactionId: '911545598812004',
        gatewayId: 1,
        cycle: 'I',
        status: 'Chargeback',
        roundNo: 2,
        sheetId: '2d4e6f80-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
        sheetName: 'CHB',
        rowNo: 2,
        amount: '96.9300',
        excludeAmount: true,
        feeAmount: '47.5000',
        eventDate: '2026-10-03T14:12:00.000Z',
        appliedReservePct: '0.100000',
        reserveDaysUsed: 180,
        expectedReserveReleaseAt: null,
        reserveHeldAmt: '0.0000',
        reserveReleasedAmt: '0.0000',
        reserveEarlyReleasedAmt: '-1.2500',
        reservePolicySnapshot: null,
        fees: [
          {
            appliedFeeId: '120334',
            feeId: '0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2d',
            feeTypeId: 4,
            code: 'Chargeback',
            title: 'Chargeback',
            eventDate: '2026-10-03T14:12:00.000Z',
            amountUsd: '45.0000',
            configurationSnapshot: { fixedAmount: '45.0000', percentage: null },
          },
          {
            appliedFeeId: '120335',
            feeId: '0b8e1c2d-3e4f-4a5b-9c6d-7e8f9a0b1c2e',
            feeTypeId: 5,
            code: 'Refund',
            title: 'Refund',
            eventDate: null,
            amountUsd: '2.5000',
            configurationSnapshot: null,
          },
        ],
      },
    ])
    expect(log.warn.mock.calls.map(([where]) => where)).toEqual([
      { settlementTxnId: '88213' },
      { appliedFeeId: '120335' },
    ])
  })
})
