// Prisma adapter of ImportRowRepository (design D1, D8, D11, D12): the analysis transaction, the paged listing
// (unmatched and ambiguous first), the resolution of an ambiguous row and the aggregates of the detail.
import type { AnalysisSummary, ImportRowsQuery, MatchResult, WarningCode } from '@recon/shared'
import { Cycle, MatchResult as MatchResultSchema, WarningCode as WarningCodeSchema } from '@recon/shared'
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney } from '../../../infrastructure/decimal.js'
import type {
  AnalysisCounters,
  ImportRowRepository,
  NewImportRow,
  RowPage,
  RowResolutionPatch,
  StoredImportRow,
} from '../application/ports.js'
import { ImportNotEditableError, ImportNotMappedError, RowNotAmbiguousError } from '../domain/errors.js'
import { ANALYSIS_TX_MAX_WAIT_MS, ANALYSIS_TX_TIMEOUT_MS, ROWS_PER_STATEMENT } from './sql-limits.js'
import { toTransactionRef, transactionRefSelect } from './transaction-ref.js'

const MAPPED = 'mapped'
const ANALYZED = 'analyzed'
/** Spec "Filas del import": unmatched and ambiguous first, then matched, then ignored. */
const MATCH_ORDER: MatchResult[] = ['unmatched', 'ambiguous', 'matched', 'ignored']

/** Every column is bound explicitly (nulls included) so that a statement always carries IMPORT_ROW_COLUMNS parameters per row. */
function toCreateInput(row: NewImportRow): Prisma.ImportRowCreateManyInput {
  return {
    sheetId: row.sheetId,
    rowNo: row.rowNo,
    transactionIdRaw: row.transactionIdRaw,
    transactionId: row.transactionId,
    gatewayId: row.gatewayId,
    statusRaw: row.statusRaw,
    statusId: row.statusId,
    cycle: row.cycle,
    amount: row.amount,
    currency: row.currency,
    txnDate: row.txnDate,
    feeTypeRaw: row.feeTypeRaw,
    rawData: row.rawData,
    ignore: row.ignore,
    matchResult: row.matchResult,
    detailJson: row.detailJson,
  }
}

const storedRowSelect = {
  sheetId: true,
  rowNo: true,
  transactionIdRaw: true,
  transactionId: true,
  gatewayId: true,
  statusRaw: true,
  statusId: true,
  cycle: true,
  amount: true,
  currency: true,
  txnDate: true,
  feeTypeRaw: true,
  rawData: true,
  ignore: true,
  matchResult: true,
  detailJson: true,
  sheet: { select: { sheetName: true, file: { select: { fileId: true, fileName: true } } } },
  transaction: { select: transactionRefSelect },
} satisfies Prisma.ImportRowSelect

type StoredRowRow = Prisma.ImportRowGetPayload<{ select: typeof storedRowSelect }>

function toStored(row: StoredRowRow): StoredImportRow {
  const { sheet, transaction, ...rest } = row
  return {
    ...rest,
    cycle: Cycle.parse(row.cycle),
    amount: toMoney(row.amount),
    matchResult: MatchResultSchema.parse(row.matchResult),
    fileId: sheet.file.fileId,
    fileName: sheet.file.fileName,
    sheetName: sheet.sheetName,
    transaction: transaction === null ? null : toTransactionRef(transaction),
  }
}

/** Order inside a match group: file (upload order), sheet name, row number (spec: import, D11). */
const withinGroupOrder: Prisma.ImportRowOrderByWithRelationInput[] = [
  { sheet: { file: { uploadedAt: 'asc' } } },
  { sheet: { sheetName: 'asc' } },
  { rowNo: 'asc' },
]

export class PrismaImportRowRepository implements ImportRowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async persistAnalysis(
    importId: string,
    expectedUpdatedAt: Date,
    rows: NewImportRow[],
    counters: AnalysisCounters,
  ): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const now = new Date()
        // The claim: an UPDATE holds an exclusive lock on the Import row until commit, so a concurrent analysis
        // waits here and then finds the status already changed; `updatedAt` catches a mapping saved in between.
        const claimed = await tx.import.updateMany({
          where: { importId, status: MAPPED, updatedAt: expectedUpdatedAt },
          data: { updatedAt: now },
        })
        if (claimed.count === 0) {
          const current = await tx.import.findUnique({ where: { importId }, select: { status: true } })
          const status = current?.status ?? 'unknown'
          throw new ImportNotMappedError(status, status === MAPPED)
        }

        for (let offset = 0; offset < rows.length; offset += ROWS_PER_STATEMENT) {
          await tx.importRow.createMany({ data: rows.slice(offset, offset + ROWS_PER_STATEMENT).map(toCreateInput) })
        }

        await tx.import.update({
          where: { importId },
          data: {
            status: ANALYZED,
            analyzedAt: now,
            rowsTotal: counters.rowsTotal,
            rowsMatched: counters.rowsMatched,
            rowsUnmatched: counters.rowsUnmatched,
          },
        })
      },
      { timeout: ANALYSIS_TX_TIMEOUT_MS, maxWait: ANALYSIS_TX_MAX_WAIT_MS },
    )
  }

  private where(importId: string, query?: { sheetId?: string; match?: MatchResult }): Prisma.ImportRowWhereInput {
    return {
      sheet: { file: { importId } },
      ...(query?.sheetId !== undefined ? { sheetId: query.sheetId } : {}),
      ...(query?.match !== undefined ? { matchResult: query.match } : {}),
    }
  }

  /**
   * Prisma cannot order by a CASE over matchResult, so the page is assembled group by group: counts per group
   * decide which groups the requested page spans, and each group is read in its own order.
   */
  async page(importId: string, query: ImportRowsQuery): Promise<RowPage> {
    const groups = query.match === undefined ? MATCH_ORDER : [query.match]
    const counts = await Promise.all(
      groups.map((match) =>
        this.prisma.importRow.count({ where: this.where(importId, { sheetId: query.sheetId, match }) }),
      ),
    )
    const total = counts.reduce((a, b) => a + b, 0)
    const items: StoredImportRow[] = []
    let offset = (query.page - 1) * query.pageSize
    let remaining = query.pageSize
    for (const [index, match] of groups.entries()) {
      const count = counts[index] ?? 0
      if (remaining <= 0) break
      if (offset >= count) {
        offset -= count
        continue
      }
      const take = Math.min(remaining, count - offset)
      const rows = await this.prisma.importRow.findMany({
        where: this.where(importId, { sheetId: query.sheetId, match }),
        orderBy: withinGroupOrder,
        skip: offset,
        take,
        select: storedRowSelect,
      })
      items.push(...rows.map(toStored))
      remaining -= take
      offset = 0
    }
    return { items, total }
  }

  async find(importId: string, sheetId: string, rowNo: number): Promise<StoredImportRow | null> {
    const row = await this.prisma.importRow.findFirst({
      where: { sheetId, rowNo, sheet: { file: { importId } } },
      select: storedRowSelect,
    })
    return row === null ? null : toStored(row)
  }

  /**
   * Guarded like the edits of the import (spec: import, D12): the row changes only while it is still ambiguous, and
   * the counter only while the import is still analyzed. Two PATCH at once: the second finds the row matched.
   */
  async resolve(
    importId: string,
    sheetId: string,
    rowNo: number,
    patch: RowResolutionPatch,
  ): Promise<{ supersededRunId: number | null }> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.importRow.updateMany({
        where: { sheetId, rowNo, matchResult: 'ambiguous', sheet: { file: { importId } } },
        data: {
          transactionId: patch.transactionId,
          gatewayId: patch.gatewayId,
          ...(patch.statusId === undefined ? {} : { statusId: patch.statusId }),
          matchResult: 'matched',
          detailJson: patch.detailJson,
        },
      })
      if (row.count !== 1) {
        const current = await tx.importRow.findUnique({
          where: { sheetId_rowNo: { sheetId, rowNo } },
          select: { matchResult: true },
        })
        throw new RowNotAmbiguousError(current?.matchResult ?? 'unknown')
      }
      const counted = await tx.import.updateMany({
        where: { importId, status: ANALYZED },
        data: { rowsMatched: { increment: 1 }, updatedAt: new Date() },
      })
      if (counted.count !== 1) {
        const current = await tx.import.findUnique({ where: { importId }, select: { status: true } })
        throw new ImportNotEditableError(current?.status ?? 'unknown')
      }
      // Dependency on the validation module (validation-runs P7, D12): the run was computed without this row's
      // transaction, so it stops being current, atomically with the row. One statement over its table.
      const superseded = await tx.$queryRaw<{ runId: number }[]>`
        UPDATE [ValidationRun] SET [isSuperseded] = 1
        OUTPUT inserted.[runId] AS runId
        WHERE [importId] = ${importId} AND [isSuperseded] = 0`
      return { supersededRunId: superseded[0] === undefined ? null : Number(superseded[0].runId) }
    })
  }

  async summary(importId: string): Promise<AnalysisSummary | null> {
    const byResult = await this.prisma.importRow.groupBy({
      by: ['matchResult'],
      where: this.where(importId),
      _count: { _all: true },
    })
    if (byResult.length === 0) return null
    const rows = { total: 0, matched: 0, unmatched: 0, ambiguous: 0, ignored: 0 }
    for (const group of byResult) {
      const match = MatchResultSchema.parse(group.matchResult)
      rows[match] = group._count._all
      rows.total += group._count._all
    }

    const byCycle = { E: 0, I: 0, R: 0 }
    const cycles = await this.prisma.importRow.groupBy({
      by: ['cycle'],
      where: { ...this.where(importId), ignore: false },
      _count: { _all: true },
    })
    for (const group of cycles) byCycle[Cycle.parse(group.cycle)] = group._count._all

    const warnings = Object.fromEntries(WarningCodeSchema.options.map((code) => [code, 0])) as Record<
      WarningCode,
      number
    >
    const counted = await this.prisma.$queryRaw<{ code: string; n: number }[]>`
      SELECT w.[value] AS code, COUNT(*) AS n
      FROM [ImportRow] r
      JOIN [ImportSheet] s ON s.[sheetId] = r.[sheetId]
      JOIN [ImportFile] f ON f.[fileId] = s.[fileId]
      CROSS APPLY OPENJSON(r.[detailJson], '$.warnings') w
      WHERE f.[importId] = ${importId} AND r.[detailJson] IS NOT NULL
      GROUP BY w.[value]`
    for (const entry of counted) {
      const code = WarningCodeSchema.safeParse(entry.code)
      if (code.success) warnings[code.data] = Number(entry.n)
    }
    return { rows, byCycle, warnings }
  }

  async channelRowCounts(importId: string): Promise<Map<number, number>> {
    const counted = await this.prisma.$queryRaw<{ channelId: number; n: number }[]>`
      SELECT t.[channelId] AS channelId, COUNT(*) AS n
      FROM [ImportRow] r
      JOIN [Transaction] t ON t.[transactionId] = r.[transactionId]
      JOIN [ImportSheet] s ON s.[sheetId] = r.[sheetId]
      JOIN [ImportFile] f ON f.[fileId] = s.[fileId]
      WHERE f.[importId] = ${importId} AND r.[matchResult] = 'matched'
      GROUP BY t.[channelId]`
    return new Map(counted.map((c) => [Number(c.channelId), Number(c.n)]))
  }
}
