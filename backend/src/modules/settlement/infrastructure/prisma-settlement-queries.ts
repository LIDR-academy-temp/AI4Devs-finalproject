// Reads of an attempt for GET /settlements/{id}/transactions, GET /imports/{id}/settlements and the exports
// (summary-exports design D3, D4, D6, D11). Money leaves as DECIMAL text, BIGINT ids as strings and business dates
// without converting; the stable order is (cycle, sheetId, rowNo, settlementTxnId), where SQL Server sorts NULL first,
// so seeded movements (no sheet, no row) come in settlementTxnId order.
import { BatchStatus, type Cycle, type ImportSettlements, MovementStatus, TRANSACTION_STATUSES } from '@recon/shared'
import type { FastifyBaseLogger } from 'fastify'
import type { PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney, toPercentage } from '../../../infrastructure/decimal.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { BatchHeader, SettlementQueries, StoredMovement, StoredMovementsPage } from '../application/read-ports.js'
import type { ExportRow } from '../domain/exports/transactions-csv.js'
import { settledStatusOf } from '../domain/settled.js'

/** Ids per IN list: well under SQL Server's 2 100 parameters. */
const CHUNK = 500

const STATUS_CODE = new Map<number, string>(TRANSACTION_STATUSES.map((s) => [s.statusId, s.code]))
const statusOf = (statusId: number) => MovementStatus.parse(STATUS_CODE.get(statusId))
const businessDate = (value: Date | null) => (value === null ? null : value.toISOString())
const roundOf = (value: number | null) => (value === 1 || value === 2 ? value : null)

export interface SettlementQueriesOptions {
  /** Warned when a stored JSON snapshot cannot be read (it is answered as null). */
  log?: Pick<FastifyBaseLogger, 'warn'>
}

function chunks<T>(values: readonly T[]): T[][] {
  const out: T[][] = []
  for (let i = 0; i < values.length; i += CHUNK) out.push(values.slice(i, i + CHUNK))
  return out
}

export class PrismaSettlementQueries implements SettlementQueries {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly options: SettlementQueriesOptions = {},
  ) {}

  async batchHeader(scope: Scope, batchId: string): Promise<BatchHeader | null> {
    const batch = await this.prisma.settlementBatch.findFirst({
      where: { batchId, account: { provider: { merchantId: { in: [...scope.merchantIds] } } } },
      select: {
        batchId: true,
        accountId: true,
        batchNo: true,
        attemptNo: true,
        status: true,
        account: { select: { name: true } },
      },
    })
    if (batch === null) return null
    return {
      batchId: batch.batchId,
      accountId: batch.accountId,
      accountName: batch.account.name,
      batchNo: batch.batchNo,
      attemptNo: batch.attemptNo,
      status: BatchStatus.parse(batch.status),
    }
  }

  async movementsPage(batchId: string, cycle: Cycle, page: number, pageSize: number): Promise<StoredMovementsPage> {
    const where = { batchId, cycle }
    const total = await this.prisma.settlementTransaction.count({ where })
    const rows = await this.prisma.settlementTransaction.findMany({
      where,
      orderBy: [{ sheetId: 'asc' }, { rowNo: 'asc' }, { settlementTxnId: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        transaction: { select: { sourceTransactionId: true, gatewayId: true } },
        sheet: { select: { sheetName: true } },
      },
    })
    // pageSize ≤ 500: one IN list.
    const fees =
      rows.length === 0
        ? []
        : await this.prisma.settlementTransactionFee.findMany({
            where: { settlementTxnId: { in: rows.map((r) => r.settlementTxnId) } },
            orderBy: [{ settlementTxnId: 'asc' }, { appliedFeeId: 'asc' }],
            include: { feeType: { select: { code: true, title: true } } },
          })
    const feesOf = new Map<bigint, typeof fees>()
    for (const f of fees) feesOf.set(f.settlementTxnId, [...(feesOf.get(f.settlementTxnId) ?? []), f])

    const items: StoredMovement[] = rows.map((r) => ({
      settlementTxnId: String(r.settlementTxnId),
      transactionId: String(r.transactionId),
      sourceTransactionId: r.transaction.sourceTransactionId,
      gatewayId: r.transaction.gatewayId,
      cycle,
      status: statusOf(r.statusId),
      roundNo: roundOf(r.roundNo),
      sheetId: r.sheetId,
      sheetName: r.sheet?.sheetName ?? null,
      rowNo: r.rowNo,
      amount: toMoney(r.amount),
      excludeAmount: r.excludeAmount,
      feeAmount: toMoney(r.feeAmount),
      eventDate: businessDate(r.eventDate),
      appliedReservePct: toPercentage(r.appliedReservePct),
      reserveDaysUsed: r.reserveDaysUsed,
      expectedReserveReleaseAt: businessDate(r.expectedReserveReleaseAt),
      reserveHeldAmt: toMoney(r.reserveHeldAmt),
      reserveReleasedAmt: toMoney(r.reserveReleasedAmt),
      reserveEarlyReleasedAmt: toMoney(r.reserveEarlyReleasedAmt),
      reservePolicySnapshot: this.snapshot(r.reservePolicySnapshot, { settlementTxnId: String(r.settlementTxnId) }),
      fees: (feesOf.get(r.settlementTxnId) ?? []).map((f) => ({
        appliedFeeId: String(f.appliedFeeId),
        feeId: f.feeId,
        feeTypeId: f.feeTypeId,
        code: f.feeType.code,
        title: f.feeType.title,
        eventDate: businessDate(f.eventDate),
        amountUsd: toMoney(f.amountUsd),
        configurationSnapshot: this.snapshot(f.configurationSnapshot, { appliedFeeId: String(f.appliedFeeId) }),
      })),
    }))
    return { items, total }
  }

  async exportRows(batchId: string, cycles: readonly Cycle[]): Promise<ExportRow[]> {
    const rows = await this.prisma.settlementTransaction.findMany({
      where: { batchId, cycle: { in: [...cycles] } },
      orderBy: [{ cycle: 'asc' }, { sheetId: 'asc' }, { rowNo: 'asc' }, { settlementTxnId: 'asc' }],
      select: {
        cycle: true,
        statusId: true,
        excludeAmount: true,
        transaction: { select: { sourceTransactionId: true } },
      },
    })
    return rows.map((r) => ({
      sourceTransactionId: r.transaction.sourceTransactionId,
      cycle: r.cycle as Cycle,
      status: statusOf(r.statusId),
      excludeAmount: r.excludeAmount,
    }))
  }

  async importAttempts(scope: Scope, importId: string): Promise<ImportSettlements | null> {
    const found = await this.prisma.import.findFirst({
      where: { importId, account: { provider: { merchantId: { in: [...scope.merchantIds] } } } },
      select: { importId: true, currentBatchId: true },
    })
    if (found === null) return null
    const batches = await this.prisma.settlementBatch.findMany({
      where: { importId },
      orderBy: [{ processedAt: 'desc' }, { attemptNo: 'desc' }],
      select: {
        batchId: true,
        batchNo: true,
        attemptNo: true,
        status: true,
        processedAt: true,
        amountPayable: true,
        approvedBy: { select: { userId: true, userName: true } },
      },
    })
    const current = found.currentBatchId?.toLowerCase() ?? null
    return {
      importId: found.importId,
      currentBatchId: found.currentBatchId,
      items: batches.map((b) => {
        const status = BatchStatus.parse(b.status)
        return {
          batchId: b.batchId,
          batchNo: b.batchNo,
          attemptNo: b.attemptNo,
          status,
          settledStatus: settledStatusOf(status),
          processedAt: b.processedAt.toISOString(),
          approvedBy: b.approvedBy,
          amountPayable: toMoney(b.amountPayable),
          isCurrent: b.batchId.toLowerCase() === current,
        }
      }),
    }
  }

  async sourceIds(transactionIds: readonly string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    for (const chunk of chunks([...new Set(transactionIds)])) {
      const rows = await this.prisma.transaction.findMany({
        where: { transactionId: { in: chunk.map((id) => BigInt(id)) } },
        select: { transactionId: true, sourceTransactionId: true },
      })
      for (const r of rows) map.set(String(r.transactionId), r.sourceTransactionId)
    }
    return map
  }

  /** A stored JSON object; null (and a warning) when it is missing or cannot be read as an object. */
  private snapshot(json: string | null, where: Record<string, string>): Record<string, unknown> | null {
    if (json === null) return null
    try {
      const value: unknown = JSON.parse(json)
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
    } catch {
      // Falls through to the warning below.
    }
    this.options.log?.warn(where, 'stored JSON snapshot is not an object; answered as null')
    return null
  }
}
