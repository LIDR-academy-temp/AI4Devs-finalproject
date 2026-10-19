/**
 * The settlement engine input of a sample of data/samples without a database (design D2, D20): the analyzed rows of
 * the validation sample input, the matched transactions completed from the synthetic world (their in-memory
 * transactionId is the 1-based index in buildWorld().txns), the default inclusions of a validation run, and the
 * seed's channels, fees, fee types and attempts of the account.
 */
import { type BatchFeeInput, TRANSACTION_STATUSES, type TransactionStatusCode } from '@recon/shared'
import { ACCOUNT_FEES, ACCOUNTS, buildWorld, CHANNELS, FEE_TYPES, STATUS, text4 } from '../../../../prisma/synthetic.js'
import { ACCOUNT_IDS, type AccountName } from '../../catalog/application/__fakes__/in-memory.js'
import { computeRanges } from '../../validation/domain/ranges.js'
import { runValidations } from '../../validation/domain/run-validations.js'
import { expectedOf, STATUSES } from '../../validation/test-support/builders.js'
import { SAMPLES, type SampleName, sampleInput } from '../../validation/test-support/sample-input.js'
import type { AccountFeeConfig, SettlementFeeType, SettlementInput, SettlementRow } from '../domain/types.js'

const world = buildWorld()
const codeOf = new Map<number, TransactionStatusCode>(TRANSACTION_STATUSES.map((s) => [s.statusId, s.code]))
const statusCode = (statusId: number | null) => (statusId === null ? null : (codeOf.get(statusId) ?? null))

export const SETTLEMENT_FEE_TYPES: SettlementFeeType[] = FEE_TYPES.map((t) => ({
  feeTypeId: t.feeTypeId,
  code: t.code,
  title: t.title,
  isTransactional: t.isTransactional,
  appliesToStatusCode: statusCode(t.appliesToStatusId),
  allowsFreeAmount: t.allowsFreeAmount,
}))

export function accountFeesOf(name: AccountName): AccountFeeConfig[] {
  return (ACCOUNT_FEES[name] ?? []).map((f, i) => ({
    feeId: `fe000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    feeTypeId: f.feeTypeId,
    fixedAmount: f.fixed === undefined ? null : text4(f.fixed),
    percentage: f.pct === undefined ? null : f.pct.toFixed(6),
    conditionalPercentage: f.condPct === undefined ? null : f.condPct.toFixed(6),
    conditionThresholdAmt: f.threshold === undefined ? null : text4(f.threshold),
    brandFixedAmount: null,
    brandPercentage: null,
    startDate: null,
    endDate: null,
    description: null,
  }))
}

/** The batch fees pre-filled from the sample's Other Fees sheet, as the analyst confirms them. */
export function prefilledBatchFees(name: SampleName): BatchFeeInput[] {
  const prefilled = (expectedOf(name).batchFeesPrefilled ?? []) as { feeType: string; amount: number }[]
  return prefilled.map((p) => {
    const type = SETTLEMENT_FEE_TYPES.find((t) => t.title === p.feeType)!
    return { feeTypeId: type.feeTypeId, feeId: null, amount: text4(p.amount), description: p.feeType, source: 'file' }
  })
}

export async function settlementSampleInput(
  name: SampleName,
  overrides: Partial<SettlementInput> = {},
): Promise<SettlementInput> {
  const { importId, input } = await sampleInput(name)
  const accountName = SAMPLES[name].account
  const account = ACCOUNTS.find((a) => a.name === accountName)!
  const rows: SettlementRow[] = input.rows.map((r) => {
    const t = r.transaction === null ? null : world.txns[Number(r.transaction.transactionId) - 1]!
    return {
      fileId: r.fileId,
      fileOrder: r.fileOrder,
      sheetId: r.sheetId,
      sheetOrder: r.sheetOrder,
      rowNo: r.rowNo,
      cycle: r.cycle,
      statusCode: statusCode(r.statusId),
      excludeAmount: r.excludeAmount,
      matchResult: r.matchResult,
      ignore: false,
      txnDate: null,
      transaction:
        t === null || r.transaction === null
          ? null
          : {
              transactionId: r.transaction.transactionId,
              sourceTransactionId: t.sourceTransactionId,
              providerId: t.providerId,
              channelId: t.channelId,
              amount: text4(t.amount),
              statusCode: t.status,
              transactionDate: t.transactionDate,
              lastStatusChangedAt: t.lastStatusChangedAt,
              appliedReservePct: t.appliedReservePct.toFixed(6),
              cardBrand: t.cardBrand,
            },
    }
  })
  const report = runValidations(input)
  const inclusions = report.results.flatMap((result) =>
    result.issues.flatMap((issue) =>
      issue.occurrences.flatMap((o) =>
        o.sourceType === 'current_import'
          ? [{ sheetId: o.sheetId, rowNo: o.rowNo, includeInSettlement: o.defaultIncluded }]
          : [],
      ),
    ),
  )
  const channelIds = new Set(rows.flatMap((r) => (r.transaction ? [r.transaction.channelId] : [])))
  const channels = CHANNELS.filter((c) => channelIds.has(c.channelId)).map((c) => ({
    channelId: c.channelId,
    name: c.name,
    rollingReserveDays: c.days,
    assignment:
      c.account === accountName
        ? ('assigned' as const)
        : c.account === null
          ? ('unassigned' as const)
          : ('assigned_to_other_account' as const),
    otherAccount:
      c.account === null || c.account === accountName
        ? null
        : { accountId: ACCOUNT_IDS[c.account as AccountName], name: c.account },
  }))
  const { ranges } = computeRanges(input.rows, input.account, STATUSES)
  const prefilled = prefilledBatchFees(name)
  return {
    importId,
    account: {
      accountId: ACCOUNT_IDS[accountName],
      name: accountName,
      providerId: account.providerId,
      chargebackReservePolicy: account.policy,
      rollingReserveCapAmt: account.cap === null ? null : text4(account.cap),
    },
    runId: 1,
    ranges,
    rows,
    inclusions,
    channels,
    previousE: new Set(input.history.filter((m) => m.cycle === 'E').map((m) => m.transactionId)),
    fees: accountFeesOf(accountName),
    feeTypes: SETTLEMENT_FEE_TYPES,
    attempts: world.batches
      .filter((b) => b.account === accountName)
      .map((b) => ({
        batchNo: b.batchNo,
        attemptNo: 1,
        status: b.status,
        importId: `import:${b.account}:${b.batchNo}`,
      })),
    prefilledFeeTypeIds: new Set(prefilled.map((f) => f.feeTypeId)),
    request: { batchFees: prefilled },
    options: { transactionalFees: false },
    ...overrides,
  }
}

export { STATUS }
