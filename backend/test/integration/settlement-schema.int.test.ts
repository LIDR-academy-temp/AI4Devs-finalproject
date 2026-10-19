import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { createPrismaClient } from './helpers.js'

// Migration 0007_settlement_process (settlement-process design D3, D4): a movement per source row of the batch
// (UX_SettlementTransaction_batch_row, filtered to rows with a sheet), sheet and row go together
// (CK_SettlementTransaction_sourceRow), and eventDate admits NULL for an adjustment that cannot be dated.
// Fixture of its own (an import, a file, a sheet and a processed batch 9701 of ProviderA-USD), removed in afterAll.
let prisma: PrismaClient
const importId = randomUUID()
const fileId = randomUUID()
const sheetId = randomUUID()
const batchId = randomUUID()
let transactionIds: bigint[]

beforeAll(async () => {
  prisma = createPrismaClient()
  const account = await prisma.account.findUniqueOrThrow({ where: { name: 'ProviderA-USD' } })
  const analyst = await prisma.user.findUniqueOrThrow({ where: { userName: 'analyst' } })
  const transactions = await prisma.transaction.findMany({
    where: { providerId: account.providerId },
    orderBy: { transactionId: 'asc' },
    take: 3,
    select: { transactionId: true },
  })
  transactionIds = transactions.map((t) => t.transactionId)
  await prisma.import.create({
    data: { importId, accountId: account.accountId, createdByUserId: analyst.userId, status: 'processed' },
  })
  await prisma.importFile.create({
    data: {
      fileId,
      importId,
      fileName: 'settlement-schema.xlsx',
      storagePath: 'none',
      sizeBytes: 1,
      sha256: fileId.replaceAll('-', '').padEnd(64, '0'),
    },
  })
  await prisma.importSheet.create({ data: { sheetId, fileId, sheetName: 'CHB', kind: 'transactions', sheetIndex: 0 } })
  await prisma.settlementBatch.create({
    data: {
      batchId,
      accountId: account.accountId,
      batchNo: 9701,
      importId,
      status: 'processed',
      approvedByUserId: analyst.userId,
    },
  })
})

afterAll(async () => {
  await prisma.settlementTransaction.deleteMany({ where: { batchId } })
  await prisma.settlementBatch.deleteMany({ where: { batchId } })
  await prisma.importSheet.deleteMany({ where: { sheetId } })
  await prisma.importFile.deleteMany({ where: { fileId } })
  await prisma.import.deleteMany({ where: { importId } })
  await prisma.$disconnect()
})

const movement = (transactionId: bigint, source: { sheetId: string | null; rowNo: number | null }) =>
  prisma.settlementTransaction.create({
    data: {
      batchId,
      transactionId,
      cycle: 'I',
      statusId: 4,
      settlementStatusId: 0,
      sheetId: source.sheetId,
      rowNo: source.rowNo,
      amount: '10.0000',
      eventDate: new Date('2026-10-02T00:00:00.000Z'),
      appliedReservePct: '0.100000',
      reserveDaysUsed: 180,
    },
  })

// Raw insert for the refusals: SQL Server names the index or the CHECK in its message, the Prisma client does not.
const insertRaw = (transactionId: bigint, source: { sheetId: string | null; rowNo: number | null }) =>
  prisma.$executeRaw`
    INSERT INTO [SettlementTransaction]
      ([batchId], [transactionId], [cycle], [statusId], [settlementStatusId], [sheetId], [rowNo], [amount],
       [eventDate], [appliedReservePct], [reserveDaysUsed])
    VALUES (${batchId}, ${transactionId}, 'I', 4, 0, ${source.sheetId}, ${source.rowNo}, 10,
            CAST('2026-10-02T00:00:00' AS datetime2(7)), 0.1, 180)`

describe('UX_SettlementTransaction_batch_row', () => {
  it('admits two movements of the same transaction and cycle from different rows (Chargeback + CHB 2)', async () => {
    const [first] = transactionIds as [bigint]
    await movement(first, { sheetId, rowNo: 2 })
    await movement(first, { sheetId, rowNo: 3 })

    expect(await prisma.settlementTransaction.count({ where: { batchId, transactionId: first, cycle: 'I' } })).toBe(2)
  })

  it('rejects a second movement from the same row of the batch', async () => {
    const [, second] = transactionIds as [bigint, bigint]
    await movement(second, { sheetId, rowNo: 10 })

    await expect(insertRaw(second, { sheetId, rowNo: 10 })).rejects.toThrow(/UX_SettlementTransaction_batch_row/)
  })

  it('admits movements without a source row, like the seeded history', async () => {
    const [first, second] = transactionIds as [bigint, bigint]
    await movement(first, { sheetId: null, rowNo: null })
    await movement(second, { sheetId: null, rowNo: null })

    expect(await prisma.settlementTransaction.count({ where: { batchId, sheetId: null } })).toBe(2)
  })
})

describe('CK_SettlementTransaction_sourceRow', () => {
  it('rejects a sheet without a row', async () => {
    const [, , third] = transactionIds as [bigint, bigint, bigint]

    await expect(insertRaw(third, { sheetId, rowNo: null })).rejects.toThrow(/CK_SettlementTransaction_sourceRow/)
  })
})

describe('SettlementTransaction.eventDate', () => {
  it('admits NULL for an adjustment that cannot be dated', async () => {
    const [, , third] = transactionIds as [bigint, bigint, bigint]
    // Raw insert: until the client is regenerated, eventDate is not nullable in its types.
    await prisma.$executeRaw`
      INSERT INTO [SettlementTransaction]
        ([batchId], [transactionId], [cycle], [statusId], [settlementStatusId], [sheetId], [rowNo], [amount],
         [eventDate], [appliedReservePct], [reserveDaysUsed])
      VALUES (${batchId}, ${third}, 'I', 4, 0, ${sheetId}, 20, 10, NULL, 0.1, 180)`

    const stored = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*) AS n FROM [SettlementTransaction] WHERE [batchId] = ${batchId} AND [eventDate] IS NULL`
    expect(Number(stored[0]!.n)).toBe(1)
  })
})
