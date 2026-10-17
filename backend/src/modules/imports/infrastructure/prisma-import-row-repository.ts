// Prisma adapter of ImportRowRepository (design D1): one interactive transaction that claims the import,
// inserts the rows in statements sized under the SQL Server parameter limit and closes the analysis.
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import type { AnalysisCounters, ImportRowRepository, NewImportRow } from '../application/ports.js'
import { ImportNotMappedError } from '../domain/errors.js'
import { ANALYSIS_TX_MAX_WAIT_MS, ANALYSIS_TX_TIMEOUT_MS, ROWS_PER_STATEMENT } from './sql-limits.js'

const MAPPED = 'mapped'
const ANALYZED = 'analyzed'

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
}
