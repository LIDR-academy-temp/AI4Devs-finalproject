import { performance } from 'node:perf_hooks'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import type { AnalysisCounters, NewImportRow } from '../../src/modules/imports/application/ports.js'
import { ImportNotMappedError } from '../../src/modules/imports/domain/errors.js'
import { PrismaImportRowRepository } from '../../src/modules/imports/infrastructure/prisma-import-row-repository.js'
import { IMPORT_ROW_COLUMNS, ROWS_PER_STATEMENT } from '../../src/modules/imports/infrastructure/sql-limits.js'
import { createPrismaClient } from './helpers.js'

// Design D1: the bulk insert of ImportRow must stay under the SQL Server parameter limit, be atomic with the
// status change and meet the thresholds of the design (a: 783 rows < 3 s, b: 20 000 < 20 s, c: 200 000 < 90 s).
// Fixed ids outside the seed's ranges; cleanup runs at start and end so a crashed run leaves nothing behind.
const IMPORT_ID = '00000000-0000-4000-8000-0000d1000001'
const FILE_ID = '00000000-0000-4000-8000-0000d1000002'
const SHEET_ID = '00000000-0000-4000-8000-0000d1000003'
const SQL_SERVER_PARAMETER_LIMIT = 2_100
const BENCH = process.env.RECON_BENCH === '1'

let prisma: PrismaClient
let repo: PrismaImportRowRepository

/** Rows with the shape of batch-clean's APP sheet: 15-digit text ids, three cells of raw data. */
function rows(count: number, override: (index: number) => Partial<NewImportRow> = () => ({})): NewImportRow[] {
  const out: NewImportRow[] = []
  for (let i = 0; i < count; i++) {
    const id = String(100_000_000_000_000 + i)
    out.push({
      sheetId: SHEET_ID,
      rowNo: i + 2,
      transactionIdRaw: id,
      transactionId: null,
      gatewayId: null,
      statusRaw: null,
      statusId: 2,
      cycle: 'E',
      amount: '16.2200',
      currency: 'USD',
      txnDate: null,
      feeTypeRaw: null,
      rawData: JSON.stringify({ ID: id, Amount: '16.22', Currency: 'USD' }),
      ignore: false,
      matchResult: 'unmatched',
      detailJson: null,
      ...override(i),
    })
  }
  return out
}

function counters(rowsTotal: number): AnalysisCounters {
  return { rowsTotal, rowsMatched: 0, rowsUnmatched: rowsTotal }
}

async function cleanup(): Promise<void> {
  await prisma.importRow.deleteMany({ where: { sheetId: SHEET_ID } })
  await prisma.importSheet.deleteMany({ where: { sheetId: SHEET_ID } })
  await prisma.importFile.deleteMany({ where: { fileId: FILE_ID } })
  await prisma.import.deleteMany({ where: { importId: IMPORT_ID } })
}

/** Back to a fresh `mapped` import without rows; returns the `updatedAt` a caller would have read. */
async function resetImport(status = 'mapped'): Promise<Date> {
  await prisma.importRow.deleteMany({ where: { sheetId: SHEET_ID } })
  const updated = await prisma.import.update({
    where: { importId: IMPORT_ID },
    data: { status, analyzedAt: null, rowsTotal: null, rowsMatched: null, rowsUnmatched: null },
  })
  return updated.updatedAt
}

async function timed(run: () => Promise<void>): Promise<number> {
  const started = performance.now()
  await run()
  return performance.now() - started
}

function rowCount(): Promise<number> {
  return prisma.importRow.count({ where: { sheetId: SHEET_ID } })
}

function importRow() {
  return prisma.import.findUniqueOrThrow({ where: { importId: IMPORT_ID } })
}

beforeAll(async () => {
  prisma = createPrismaClient()
  repo = new PrismaImportRowRepository(prisma)
  await cleanup()
  const account = await prisma.account.findUniqueOrThrow({ where: { name: 'ProviderA-USD' } })
  const analyst = await prisma.user.findUniqueOrThrow({ where: { userName: 'analyst' } })
  await prisma.import.create({
    data: {
      importId: IMPORT_ID,
      accountId: account.accountId,
      createdByUserId: analyst.userId,
      status: 'mapped',
      files: {
        create: [
          {
            fileId: FILE_ID,
            fileName: 'import-rows-bench.xlsx',
            storagePath: `imports/${IMPORT_ID}/${FILE_ID}.xlsx`,
            sizeBytes: 1,
            sha256: 'd1'.repeat(32),
            sheets: {
              create: [
                {
                  sheetId: SHEET_ID,
                  sheetName: 'APP',
                  kind: 'transactions',
                  cycle: 'E',
                  statusId: 2,
                  rowCount: 0,
                  mappingConfirmed: true,
                },
              ],
            },
          },
        ],
      },
    },
  })
})

afterAll(async () => {
  if (prisma) {
    await cleanup()
    await prisma.$disconnect()
  }
})

describe('PrismaImportRowRepository.persistAnalysis (design D1)', () => {
  it('(g) sizes every INSERT under the SQL Server parameter limit', () => {
    expect(ROWS_PER_STATEMENT).toBeGreaterThan(0)
    expect(ROWS_PER_STATEMENT * IMPORT_ROW_COLUMNS).toBeLessThanOrEqual(SQL_SERVER_PARAMETER_LIMIT)
  })

  it('(a) writes the 783 rows of a batch-clean-sized import, closes it as analyzed, in under 3 s', async () => {
    const updatedAt = await resetImport()

    const ms = await timed(() =>
      repo.persistAnalysis(IMPORT_ID, updatedAt, rows(783), { rowsTotal: 783, rowsMatched: 780, rowsUnmatched: 0 }),
    )
    console.info(`[D1] 783 rows persisted in ${ms.toFixed(0)} ms`)

    const after = await importRow()
    expect(after).toMatchObject({ status: 'analyzed', rowsTotal: 783, rowsMatched: 780, rowsUnmatched: 0 })
    expect(after.analyzedAt).not.toBeNull()
    expect(after.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime())
    expect(await rowCount()).toBe(783)
    const first = await prisma.importRow.findUniqueOrThrow({
      where: { sheetId_rowNo: { sheetId: SHEET_ID, rowNo: 2 } },
    })
    expect(first).toMatchObject({
      transactionIdRaw: '100000000000000',
      transactionId: null,
      statusId: 2,
      cycle: 'E',
      currency: 'USD',
      matchResult: 'unmatched',
      ignore: false,
      detailJson: null,
    })
    expect(first.amount?.toFixed(4)).toBe('16.2200')
    expect(JSON.parse(first.rawData)).toEqual({ ID: '100000000000000', Amount: '16.22', Currency: 'USD' })
    expect(ms).toBeLessThan(3_000)
  })

  it('(b) writes 20 000 rows in under 20 s', async () => {
    const updatedAt = await resetImport()

    const ms = await timed(() => repo.persistAnalysis(IMPORT_ID, updatedAt, rows(20_000), counters(20_000)))
    console.info(`[D1] 20 000 rows persisted in ${ms.toFixed(0)} ms`)

    expect(await rowCount()).toBe(20_000)
    expect(await importRow()).toMatchObject({ status: 'analyzed', rowsTotal: 20_000 })
    expect(ms).toBeLessThan(20_000)
  }, 90_000)

  it.skipIf(!BENCH)(
    '(c) writes 200 000 rows (the reader ceiling) in under 90 s — RECON_BENCH=1 only',
    async () => {
      const updatedAt = await resetImport()

      const ms = await timed(() => repo.persistAnalysis(IMPORT_ID, updatedAt, rows(200_000), counters(200_000)))
      console.info(`[D1] 200 000 rows persisted in ${ms.toFixed(0)} ms`)

      expect(await rowCount()).toBe(200_000)
      expect(ms).toBeLessThan(90_000)
    },
    300_000,
  )

  it('(d) refuses an import that is not mapped and writes nothing', async () => {
    const updatedAt = await resetImport('uploaded')

    await expect(repo.persistAnalysis(IMPORT_ID, updatedAt, rows(10), counters(10))).rejects.toBeInstanceOf(
      ImportNotMappedError,
    )

    expect(await rowCount()).toBe(0)
    expect(await importRow()).toMatchObject({ status: 'uploaded', analyzedAt: null, rowsTotal: null })
  })

  it('(e) refuses when the import changed since the caller read it (optimistic claim)', async () => {
    const updatedAt = await resetImport()
    const stale = new Date(updatedAt.getTime() - 1_000)

    await expect(repo.persistAnalysis(IMPORT_ID, stale, rows(10), counters(10))).rejects.toMatchObject({
      code: 'import_not_mapped',
      details: { status: 'mapped' },
    })

    expect(await rowCount()).toBe(0)
    expect(await importRow()).toMatchObject({ status: 'mapped', analyzedAt: null, rowsTotal: null })
  })

  it('(f) leaves the import mapped with no rows when a late batch fails (atomicity)', async () => {
    const updatedAt = await resetImport()
    // The last row violates the FK to TransactionStatus, so only the final INSERT statement fails.
    const data = rows(783, (i) => (i === 782 ? { statusId: 999 } : {}))

    await expect(repo.persistAnalysis(IMPORT_ID, updatedAt, data, counters(783))).rejects.toThrow()

    expect(await rowCount()).toBe(0)
    expect(await importRow()).toMatchObject({ status: 'mapped', analyzedAt: null, rowsTotal: null })
  })
})
