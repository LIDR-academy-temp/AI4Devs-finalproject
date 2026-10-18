// Prisma adapters of the read ports of the validation engine (validation-runs design D2). Dates that bound a query
// travel as ISO text cast to datetime2(7): how the driver would type a Date is not relied upon (a `datetime` rounds to
// 1/300 s and would move the exact expiry edge).
import { Cycle, MatchResult, TransactionStatusCode } from '@recon/shared'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { MAX_SQL_PARAMETERS } from '../../imports/infrastructure/sql-limits.js'
import type { ValidationSources } from '../application/ports.js'
import type {
  AccountScope,
  CandidateTransaction,
  CycleRanges,
  HeldReserve,
  HistoryMovement,
  StatusEntry,
  ValidationRow,
} from '../domain/types.js'

const ADJUSTMENT_CODES = ['Chargeback', 'Refund', 'RDR'] as const

interface RawCandidate {
  transactionId: bigint | number | string
  sourceTransactionId: string
  channelId: number
  statusId: number
  transactionDate: Date
  lastStatusChangedAt: Date | null
}

interface RawReserve extends RawCandidate {
  batchId: string
  reserveHeldAmt: string
  reserveEarlyReleasedAmt: string
}

const toBigInt = (value: bigint | number | string) => (typeof value === 'bigint' ? value : BigInt(String(value)))
const sqlDate = (date: Date) => Prisma.sql`CAST(${date.toISOString()} AS datetime2(7))`

function toCandidate(raw: RawCandidate): CandidateTransaction {
  return {
    transactionId: toBigInt(raw.transactionId),
    sourceTransactionId: raw.sourceTransactionId,
    channelId: Number(raw.channelId),
    statusId: Number(raw.statusId),
    transactionDate: raw.transactionDate,
    lastStatusChangedAt: raw.lastStatusChangedAt,
  }
}

/** Binary order of text, the same in every environment (no collation involved). */
const binary = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

export class PrismaValidationSources implements ValidationSources {
  constructor(private readonly prisma: PrismaClient) {}

  // ── ValidationRowSource ──

  async rowsOf(importId: string): Promise<ValidationRow[]> {
    const rows = await this.prisma.importRow.findMany({
      where: { sheet: { file: { importId } } },
      select: {
        sheetId: true,
        rowNo: true,
        transactionIdRaw: true,
        cycle: true,
        statusId: true,
        matchResult: true,
        detailJson: true,
        sheet: {
          select: {
            sheetName: true,
            sheetIndex: true,
            file: { select: { fileId: true, fileName: true, uploadedAt: true } },
          },
        },
        transaction: {
          select: {
            transactionId: true,
            providerId: true,
            channelId: true,
            statusId: true,
            transactionDate: true,
            lastStatusChangedAt: true,
          },
        },
      },
    })
    // fileOrder: upload order (uploadedAt, fileName, fileId), as the detail of the import lists the files.
    const files = new Map(rows.map((r) => [r.sheet.file.fileId, r.sheet.file]))
    const fileOrder = new Map(
      [...files.values()]
        .sort(
          (a, b) =>
            a.uploadedAt.getTime() - b.uploadedAt.getTime() ||
            binary(a.fileName, b.fileName) ||
            binary(a.fileId, b.fileId),
        )
        .map((f, index) => [f.fileId, index]),
    )
    // sheetOrder: position in the workbook; imports uploaded before 0006 (NULL) order by name, then sheetId (D10).
    const sheets = new Map(rows.map((r) => [r.sheetId, { sheetId: r.sheetId, ...r.sheet }]))
    const sheetOrder = new Map<string, number>()
    for (const fileId of files.keys()) {
      const ofFile = [...sheets.values()]
        .filter((s) => s.file.fileId === fileId)
        .sort(
          (a, b) =>
            (a.sheetIndex ?? Number.MAX_SAFE_INTEGER) - (b.sheetIndex ?? Number.MAX_SAFE_INTEGER) ||
            binary(a.sheetName, b.sheetName) ||
            binary(a.sheetId, b.sheetId),
        )
      ofFile.forEach((s, rank) => {
        sheetOrder.set(s.sheetId, s.sheetIndex ?? rank)
      })
    }
    return rows.map((r) => {
      const matchResult = MatchResult.parse(r.matchResult)
      if (matchResult === 'matched' && r.transaction === null)
        throw new Error(`matched row ${r.sheetId}:${r.rowNo} has no transaction`)
      const detail = r.detailJson === null ? {} : (JSON.parse(r.detailJson) as { excludeAmount?: boolean })
      return {
        fileId: r.sheet.file.fileId,
        fileOrder: fileOrder.get(r.sheet.file.fileId) as number,
        sheetId: r.sheetId,
        sheetOrder: sheetOrder.get(r.sheetId) as number,
        rowNo: r.rowNo,
        transactionIdRaw: r.transactionIdRaw,
        cycle: Cycle.parse(r.cycle),
        statusId: r.statusId,
        excludeAmount: detail.excludeAmount === true,
        matchResult,
        transaction: matchResult === 'matched' ? r.transaction : null,
      }
    })
  }

  // ── AccountScopeSource ──

  async accountOf(importId: string): Promise<AccountScope> {
    const { account } = await this.prisma.import.findUniqueOrThrow({
      where: { importId },
      select: {
        account: {
          select: {
            accountId: true,
            providerId: true,
            accountChannels: { where: { isPrimary: true }, select: { channelId: true } },
          },
        },
      },
    })
    const channels = await this.prisma.channel.findMany({
      where: { providerId: account.providerId },
      select: { channelId: true, rollingReserveDays: true },
    })
    return {
      accountId: account.accountId,
      providerId: account.providerId,
      primaryChannelIds: new Set(account.accountChannels.map((c) => c.channelId)),
      reserveDaysByChannel: new Map(channels.map((c) => [c.channelId, c.rollingReserveDays])),
    }
  }

  // ── SettlementHistorySource ──

  async hasPreviousBatches(providerId: number, excludeImportId: string): Promise<boolean> {
    const found = await this.prisma.settlementBatch.findFirst({
      where: { status: { not: 'undone' }, account: { providerId }, importId: { not: excludeImportId } },
      select: { batchId: true },
    })
    return found !== null
  }

  async movements(
    providerId: number,
    transactionIds: readonly bigint[],
    excludeImportId: string,
  ): Promise<HistoryMovement[]> {
    const unique = [...new Set(transactionIds)]
    const out: HistoryMovement[] = []
    for (let offset = 0; offset < unique.length; offset += MAX_SQL_PARAMETERS) {
      const chunk = unique.slice(offset, offset + MAX_SQL_PARAMETERS)
      const rows = await this.prisma.settlementTransaction.findMany({
        where: {
          transactionId: { in: chunk },
          batch: { status: { not: 'undone' }, account: { providerId }, importId: { not: excludeImportId } },
        },
        select: {
          settlementTxnId: true,
          transactionId: true,
          cycle: true,
          statusId: true,
          excludeAmount: true,
          sheetId: true,
          rowNo: true,
          batch: { select: { batchId: true, accountId: true, batchNo: true, attemptNo: true, status: true } },
        },
      })
      for (const m of rows) {
        out.push({
          batchId: m.batch.batchId,
          accountId: m.batch.accountId,
          batchNo: m.batch.batchNo,
          attemptNo: m.batch.attemptNo,
          batchStatus: m.batch.status === 'paid' ? 'paid' : 'processed',
          transactionId: m.transactionId,
          cycle: Cycle.parse(m.cycle),
          statusId: m.statusId,
          excludeAmount: m.excludeAmount,
          sheetId: m.sheetId,
          rowNo: m.rowNo,
          settlementTxnId: m.settlementTxnId,
        })
      }
    }
    return out
  }

  // ── MissingCandidateSource ──

  /** One query per range with a range; the movement of the same cycle in a current attempt excludes it (in SQL). */
  async candidates(account: AccountScope, ranges: CycleRanges): Promise<CandidateTransaction[]> {
    const channels = [...account.primaryChannelIds]
    if (channels.length === 0) return []
    const query = (codes: readonly string[], dateFilter: Prisma.Sql, processedCycle: Cycle | null) =>
      this.prisma.$queryRaw<RawCandidate[]>`
        SELECT t.[transactionId], t.[sourceTransactionId], t.[channelId], t.[statusId], t.[transactionDate],
               t.[lastStatusChangedAt]
        FROM [Transaction] t
        JOIN [TransactionStatus] s ON s.[statusId] = t.[statusId]
        WHERE t.[providerId] = ${account.providerId}
          AND t.[channelId] IN (${Prisma.join(channels)})
          AND s.[code] IN (${Prisma.join(codes)})
          AND ${dateFilter}
          ${processedCycle === null ? Prisma.empty : this.notProcessed(account.providerId, processedCycle)}`
    const pending: Date | null = latest(ranges.APP?.max ?? null, ranges.DEC?.max ?? null)
    const queries: Promise<RawCandidate[]>[] = []
    if (ranges.APP)
      queries.push(query(['Successful'], Prisma.sql`t.[transactionDate] <= ${sqlDate(ranges.APP.max)}`, 'E'))
    if (ranges.DEC)
      queries.push(query(['Declined'], Prisma.sql`t.[transactionDate] <= ${sqlDate(ranges.DEC.max)}`, 'E'))
    if (ranges.I)
      queries.push(
        query(
          ADJUSTMENT_CODES,
          // Undated adjustments arrive too: the engine counts them in undatedCandidateCount.
          Prisma.sql`(t.[lastStatusChangedAt] <= ${sqlDate(ranges.I.max)} OR t.[lastStatusChangedAt] IS NULL)`,
          'I',
        ),
      )
    if (pending) queries.push(query(['Pending'], Prisma.sql`t.[transactionDate] <= ${sqlDate(pending)}`, null))
    return (await Promise.all(queries)).flat().map(toCandidate)
  }

  /**
   * E movements of current attempts that held a reserve without a current R movement, whose expiry under the channel's
   * current term is up to rMax. The predicate is written over transactionDate so the (providerId, transactionDate)
   * index applies: transactionDate <= rMax - days ⟺ transactionDate + days <= rMax.
   */
  async heldReserves(account: AccountScope, rMax: Date): Promise<HeldReserve[]> {
    const channels = [...account.primaryChannelIds]
    if (channels.length === 0) return []
    const rows = await this.prisma.$queryRaw<RawReserve[]>`
      SELECT t.[transactionId], t.[sourceTransactionId], t.[channelId], t.[statusId], t.[transactionDate],
             t.[lastStatusChangedAt], LOWER(CONVERT(VARCHAR(36), st.[batchId])) AS batchId,
             CONVERT(VARCHAR(40), st.[reserveHeldAmt]) AS reserveHeldAmt,
             CONVERT(VARCHAR(40), st.[reserveEarlyReleasedAmt]) AS reserveEarlyReleasedAmt
      FROM [SettlementTransaction] st
      JOIN [SettlementBatch] b ON b.[batchId] = st.[batchId]
      JOIN [Account] a ON a.[accountId] = b.[accountId]
      JOIN [Transaction] t ON t.[transactionId] = st.[transactionId]
      JOIN [Channel] c ON c.[channelId] = t.[channelId]
      WHERE st.[cycle] = 'E'
        AND st.[reserveHeldAmt] > 0
        AND b.[status] <> 'undone'
        AND a.[providerId] = ${account.providerId}
        AND t.[providerId] = ${account.providerId}
        AND t.[channelId] IN (${Prisma.join(channels)})
        AND t.[transactionDate] <= DATEADD(day, -c.[rollingReserveDays], ${sqlDate(rMax)})
        ${this.notProcessed(account.providerId, 'R')}`
    return rows.map((r) => ({
      ...toCandidate(r),
      batchId: r.batchId,
      reserveHeldAmt: r.reserveHeldAmt,
      reserveEarlyReleasedAmt: r.reserveEarlyReleasedAmt,
    }))
  }

  /** NOT EXISTS a movement of that cycle of `t` in a non-undone attempt of the provider. */
  private notProcessed(providerId: number, cycle: Cycle): Prisma.Sql {
    return Prisma.sql`AND NOT EXISTS (
      SELECT 1 FROM [SettlementTransaction] p
      JOIN [SettlementBatch] pb ON pb.[batchId] = p.[batchId]
      JOIN [Account] pa ON pa.[accountId] = pb.[accountId]
      WHERE p.[transactionId] = t.[transactionId] AND p.[cycle] = ${cycle}
        AND pb.[status] <> 'undone' AND pa.[providerId] = ${providerId})`
  }

  // ── RegisteredMissingSource ──

  async registered(providerId: number): Promise<Set<string>> {
    const issues = await this.prisma.validationIssue.findMany({
      where: {
        issueType: 'missing',
        resolutionStatus: 'persistent',
        transactionId: { not: null },
        result: {
          run: {
            isSuperseded: false,
            import: { account: { providerId }, batches: { some: { status: { in: ['processed', 'paid'] } } } },
          },
        },
      },
      select: { cycle: true, transactionId: true },
    })
    return new Set(issues.map((i) => `${i.cycle}:${i.transactionId}`))
  }

  // ── StatusCatalogSource ──

  async statuses(): Promise<StatusEntry[]> {
    const rows = await this.prisma.transactionStatus.findMany({ select: { statusId: true, code: true, cycle: true } })
    return rows.map((s) => ({
      statusId: s.statusId,
      code: TransactionStatusCode.parse(s.code),
      cycle: s.cycle === 'I' ? 'I' : 'E',
    }))
  }
}

function latest(a: Date | null, b: Date | null): Date | null {
  if (a === null) return b
  if (b === null) return a
  return a > b ? a : b
}
