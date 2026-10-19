// Prisma adapter of the settlement reads (settlement-process design D2). It takes the client or the transactional
// client: the preview reads outside a transaction, processing inside its own after the guard on Import.
import {
  BatchStatus,
  ChargebackReservePolicy,
  Cycle,
  MatchResult,
  TRANSACTION_STATUSES,
  type TransactionStatusCode,
  ValidationCode,
} from '@recon/shared'
import { Prisma, type PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney, toPercentage } from '../../../infrastructure/decimal.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { businessDay } from '../../fees/domain/fee-selection.js'
import { MAX_SQL_PARAMETERS } from '../../imports/infrastructure/sql-limits.js'
import type { CurrentRun, ImportContext, SettlementSource } from '../application/ports.js'
import { channelStateOf } from '../domain/channels.js'
import type {
  AccountAttempt,
  AccountFeeConfig,
  RowInclusion,
  SettlementAccount,
  SettlementChannel,
  SettlementFeeType,
  SettlementRow,
} from '../domain/types.js'

type Db = PrismaClient | Prisma.TransactionClient

const codeOf = new Map<number, TransactionStatusCode>(TRANSACTION_STATUSES.map((s) => [s.statusId, s.code]))
const statusCode = (statusId: number | null): TransactionStatusCode | null =>
  statusId === null ? null : (codeOf.get(statusId) ?? null)

/** Binary order of text, the same in every environment (no collation involved). */
const binary = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const range = (min: Date | null, max: Date | null) => (min === null || max === null ? null : { min, max })
const day = (value: Date | null) => (value === null ? null : businessDay(value))

function chunks<T>(items: readonly T[], size = MAX_SQL_PARAMETERS): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export class PrismaSettlementSource implements SettlementSource {
  constructor(private readonly db: Db) {}

  async importContext(scope: Scope | null, importId: string): Promise<ImportContext | null> {
    const found = await this.db.import.findFirst({
      where: {
        importId,
        ...(scope === null ? {} : { account: { provider: { merchantId: { in: [...scope.merchantIds] } } } }),
      },
      select: {
        importId: true,
        status: true,
        account: {
          select: {
            accountId: true,
            name: true,
            providerId: true,
            chargebackReservePolicy: true,
            rollingReserveCapAmt: true,
          },
        },
      },
    })
    if (found === null) return null
    const { account } = found
    return {
      importId: found.importId,
      status: found.status as ImportContext['status'],
      account: {
        accountId: account.accountId,
        name: account.name,
        providerId: account.providerId,
        chargebackReservePolicy: ChargebackReservePolicy.parse(account.chargebackReservePolicy),
        rollingReserveCapAmt: toMoney(account.rollingReserveCapAmt),
      },
    }
  }

  async account(scope: Scope, accountId: string): Promise<SettlementAccount | null> {
    const account = await this.db.account.findFirst({
      where: { accountId, provider: { merchantId: { in: [...scope.merchantIds] } } },
      select: {
        accountId: true,
        name: true,
        providerId: true,
        chargebackReservePolicy: true,
        rollingReserveCapAmt: true,
      },
    })
    if (account === null) return null
    return {
      ...account,
      chargebackReservePolicy: ChargebackReservePolicy.parse(account.chargebackReservePolicy),
      rollingReserveCapAmt: toMoney(account.rollingReserveCapAmt),
    }
  }

  async currentRun(importId: string): Promise<CurrentRun | null> {
    const run = await this.db.validationRun.findFirst({
      where: { importId, isSuperseded: false },
      select: {
        runId: true,
        dateMinApp: true,
        dateMaxApp: true,
        dateMinDec: true,
        dateMaxDec: true,
        dateMinI: true,
        dateMaxI: true,
        dateMinR: true,
        dateMaxR: true,
        results: {
          where: { outcome: 'blocked' },
          select: { validationCode: true, issues: { where: { blocking: true }, select: { issueId: true } } },
        },
      },
    })
    if (run === null) return null
    return {
      runId: run.runId,
      ranges: {
        APP: range(run.dateMinApp, run.dateMaxApp),
        DEC: range(run.dateMinDec, run.dateMaxDec),
        I: range(run.dateMinI, run.dateMaxI),
        R: range(run.dateMinR, run.dateMaxR),
      },
      blocked:
        run.results.length === 0
          ? null
          : {
              validationCodes: run.results.map((r) => ValidationCode.parse(r.validationCode)),
              issueIds: run.results.flatMap((r) => r.issues.map((i) => i.issueId)).sort((a, b) => a - b),
            },
    }
  }

  async rows(importId: string): Promise<SettlementRow[]> {
    const rows = await this.db.importRow.findMany({
      where: { sheet: { file: { importId } } },
      select: {
        sheetId: true,
        rowNo: true,
        cycle: true,
        statusId: true,
        matchResult: true,
        ignore: true,
        txnDate: true,
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
            sourceTransactionId: true,
            providerId: true,
            channelId: true,
            amount: true,
            statusId: true,
            transactionDate: true,
            lastStatusChangedAt: true,
            appliedReservePct: true,
            cardBrand: true,
          },
        },
      },
    })
    // The same file and sheet order as the validation engine (validation-runs D2, D10).
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
      const t = matchResult === 'matched' ? r.transaction : null
      return {
        fileId: r.sheet.file.fileId,
        fileOrder: fileOrder.get(r.sheet.file.fileId) as number,
        sheetId: r.sheetId,
        sheetOrder: sheetOrder.get(r.sheetId) as number,
        rowNo: r.rowNo,
        cycle: Cycle.parse(r.cycle),
        statusCode: statusCode(r.statusId),
        excludeAmount: detail.excludeAmount === true,
        matchResult,
        ignore: r.ignore,
        txnDate: r.txnDate,
        transaction:
          t === null
            ? null
            : {
                transactionId: t.transactionId,
                sourceTransactionId: t.sourceTransactionId,
                providerId: t.providerId,
                channelId: t.channelId,
                amount: toMoney(t.amount),
                statusCode: statusCode(t.statusId) as TransactionStatusCode,
                transactionDate: t.transactionDate,
                lastStatusChangedAt: t.lastStatusChangedAt,
                appliedReservePct: toPercentage(t.appliedReservePct),
                cardBrand: t.cardBrand,
              },
      }
    })
  }

  async inclusions(runId: number): Promise<RowInclusion[]> {
    const occurrences = await this.db.conflictOccurrence.findMany({
      where: { sourceType: 'current_import', issue: { result: { runId } } },
      select: { sheetId: true, rowNo: true, includeInSettlement: true },
    })
    return occurrences.flatMap((o) =>
      o.sheetId === null || o.rowNo === null
        ? []
        : [{ sheetId: o.sheetId, rowNo: o.rowNo, includeInSettlement: o.includeInSettlement }],
    )
  }

  /** The same rule as the channel notice of the analysis (imports channel-notice.ts). */
  async channels(accountId: string, channelIds: readonly number[]): Promise<SettlementChannel[]> {
    if (channelIds.length === 0) return []
    const channels = await this.db.channel.findMany({
      where: { channelId: { in: [...channelIds] } },
      select: {
        channelId: true,
        name: true,
        rollingReserveDays: true,
        accountChannels: {
          where: { OR: [{ isPrimary: true }, { accountId }] },
          select: {
            accountId: true,
            isPrimary: true,
            account: { select: { accountId: true, name: true, provider: { select: { merchantId: true } } } },
          },
        },
      },
      orderBy: { channelId: 'asc' },
    })
    return channels.map((c) =>
      channelStateOf(
        accountId,
        { channelId: c.channelId, name: c.name, rollingReserveDays: c.rollingReserveDays },
        c.accountChannels.map((ac) => ({
          accountId: ac.account.accountId,
          isPrimary: ac.isPrimary,
          accountName: ac.account.name,
          merchantId: ac.account.provider.merchantId,
        })),
      ),
    )
  }

  async previousE(
    providerId: number,
    transactionIds: readonly bigint[],
    excludeImportId: string,
  ): Promise<Set<bigint>> {
    const found = new Set<bigint>()
    for (const ids of chunks(transactionIds)) {
      const rows = await this.db.$queryRaw<{ transactionId: bigint | number | string }[]>`
        SELECT DISTINCT st.[transactionId]
        FROM [SettlementTransaction] st
        JOIN [SettlementBatch] b ON b.[batchId] = st.[batchId]
        JOIN [Account] a ON a.[accountId] = b.[accountId]
        WHERE st.[cycle] = 'E' AND b.[status] <> 'undone' AND a.[providerId] = ${providerId}
          AND b.[importId] <> ${excludeImportId}
          AND st.[transactionId] IN (${Prisma.join(ids)})`
      for (const r of rows) found.add(BigInt(String(r.transactionId)))
    }
    return found
  }

  async accountFees(accountId: string): Promise<AccountFeeConfig[]> {
    const fees = await this.db.fee.findMany({
      where: { accountId },
      select: {
        feeId: true,
        feeTypeId: true,
        fixedAmount: true,
        percentage: true,
        conditionalPercentage: true,
        conditionThresholdAmt: true,
        brandFixedAmount: true,
        brandPercentage: true,
        startDate: true,
        endDate: true,
        description: true,
      },
      orderBy: [{ feeTypeId: 'asc' }, { startDate: 'asc' }],
    })
    return fees.map((f) => ({
      feeId: f.feeId,
      feeTypeId: f.feeTypeId,
      fixedAmount: toMoney(f.fixedAmount),
      percentage: toPercentage(f.percentage),
      conditionalPercentage: toPercentage(f.conditionalPercentage),
      conditionThresholdAmt: toMoney(f.conditionThresholdAmt),
      brandFixedAmount: toMoney(f.brandFixedAmount),
      brandPercentage: toPercentage(f.brandPercentage),
      startDate: day(f.startDate),
      endDate: day(f.endDate),
      description: f.description,
    }))
  }

  async feeTypes(): Promise<SettlementFeeType[]> {
    const types = await this.db.feeType.findMany({
      where: { isActive: true },
      select: {
        feeTypeId: true,
        code: true,
        title: true,
        isTransactional: true,
        appliesToStatusId: true,
        allowsFreeAmount: true,
      },
      orderBy: { feeTypeId: 'asc' },
    })
    return types.map(({ appliesToStatusId, ...t }) => ({ ...t, appliesToStatusCode: statusCode(appliesToStatusId) }))
  }

  async attempts(accountId: string): Promise<AccountAttempt[]> {
    const batches = await this.db.settlementBatch.findMany({
      where: { accountId },
      select: { batchNo: true, attemptNo: true, status: true, importId: true },
      orderBy: [{ batchNo: 'asc' }, { attemptNo: 'asc' }],
    })
    return batches.map((b) => ({ ...b, status: BatchStatus.parse(b.status) }))
  }
}
