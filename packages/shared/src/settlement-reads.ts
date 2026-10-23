// Reads of an attempt and its exports (README §4.4, summary-exports design "Contrato para #13"): the movements of a
// cycle, the attempts of an import or an account and the export query. Money travels as decimal strings, never numbers.
import { z } from 'zod'
import { UserRef } from './auth.js'
import { Money4, Rate6, SettledStatus } from './settlement.js'
import { BatchStatus, Cycle, IsoDate, TransactionStatusCode } from './vocabulary.js'

/** BIGINT ids travel as decimal strings, never as JSON numbers (README §4). */
const BigIntId = z.string().regex(/^\d+$/)
const nonNegativeInt = z.number().int().nonnegative()
const positiveInt = z.number().int().positive()
/** A JSON snapshot as written; null when it cannot be read. */
const Snapshot = z.record(z.string(), z.unknown()).nullable()

// ───────────────────────── Movements of an attempt ─────────────────────────

/** GET /settlements/{id}/transactions: one cycle per request, paginated like GET /imports/{id}/rows. */
export const SettlementTransactionsQuery = z.object({
  type: Cycle,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
})
export type SettlementTransactionsQuery = z.infer<typeof SettlementTransactionsQuery>

/** A fee applied to a movement, with the configuration it used. */
export const AppliedFee = z.object({
  appliedFeeId: BigIntId,
  feeId: z.uuid().nullable(),
  feeTypeId: positiveInt,
  code: z.string(),
  title: z.string(),
  /** Business date (New York wall time; the Z is transport only, debt #48). */
  eventDate: z.iso.datetime().nullable(),
  amountUsd: Money4,
  configurationSnapshot: Snapshot,
})
export type AppliedFee = z.infer<typeof AppliedFee>

/** A movement never carries Pending: processing skips it. */
export const MovementStatus = TransactionStatusCode.exclude(['Pending'])
export type MovementStatus = z.infer<typeof MovementStatus>

export const SettlementMovement = z.object({
  settlementTxnId: BigIntId,
  /** Internal id. */
  transactionId: BigIntId,
  /** External id, always text. */
  sourceTransactionId: z.string(),
  gatewayId: z.number().int(),
  cycle: Cycle,
  status: MovementStatus,
  roundNo: z.union([z.literal(1), z.literal(2)]).nullable(),
  /** null for seeded history. */
  sheetId: z.uuid().nullable(),
  sheetName: z.string().nullable(),
  rowNo: positiveInt.nullable(),
  amount: Money4,
  excludeAmount: z.boolean(),
  feeAmount: Money4,
  /** Business date; null: an adjustment the source cannot date. */
  eventDate: z.iso.datetime().nullable(),
  appliedReservePct: Rate6,
  reserveDaysUsed: nonNegativeInt,
  /** Business date. */
  expectedReserveReleaseAt: z.iso.datetime().nullable(),
  reserveHeldAmt: Money4,
  reserveReleasedAmt: Money4,
  reserveEarlyReleasedAmt: Money4,
  reservePolicySnapshot: Snapshot,
  /** The attempt is paid; never read from settlementStatusId. */
  settled: z.boolean(),
  /** Ordered by appliedFeeId. */
  fees: z.array(AppliedFee),
})
export type SettlementMovement = z.infer<typeof SettlementMovement>

export const SettlementTransactionsPage = z.object({
  batchId: z.uuid(),
  type: Cycle,
  items: z.array(SettlementMovement),
  page: positiveInt,
  pageSize: positiveInt,
  total: nonNegativeInt,
})
export type SettlementTransactionsPage = z.infer<typeof SettlementTransactionsPage>

// ───────────────────────── Attempts of an import ─────────────────────────

export const ImportSettlementAttempt = z.object({
  batchId: z.uuid(),
  batchNo: positiveInt,
  attemptNo: positiveInt,
  status: BatchStatus,
  settledStatus: SettledStatus,
  /** Audit instant (UTC). */
  processedAt: z.iso.datetime(),
  approvedBy: UserRef,
  amountPayable: Money4,
  /** It is the import's currentBatchId. */
  isCurrent: z.boolean(),
})
export type ImportSettlementAttempt = z.infer<typeof ImportSettlementAttempt>

/** GET /imports/{id}/settlements: newest first. */
export const ImportSettlements = z.object({
  importId: z.uuid(),
  currentBatchId: z.uuid().nullable(),
  items: z.array(ImportSettlementAttempt),
})
export type ImportSettlements = z.infer<typeof ImportSettlements>

// ───────────────────────── Attempts of an account ─────────────────────────

/** The date that from and to filter: the business settlement date, or the New York day of the processing instant. */
export const SettlementDateField = z.enum(['settlementDate', 'processedAt'])
export type SettlementDateField = z.infer<typeof SettlementDateField>

/** GET /accounts/{id}/settlements: inclusive days compared as YYYY-MM-DD text, paginated like the other reads. */
export const AccountSettlementsQuery = z
  .strictObject({
    status: BatchStatus.optional(),
    dateField: SettlementDateField.default('settlementDate'),
    from: IsoDate.optional(),
    to: IsoDate.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(500).default(50),
  })
  .superRefine((query, ctx) => {
    if (query.from && query.to && query.from > query.to)
      ctx.addIssue({ code: 'custom', path: ['from'], message: 'from must not be after to' })
  })
export type AccountSettlementsQuery = z.infer<typeof AccountSettlementsQuery>

export const AccountSettlement = z.object({
  batchId: z.uuid(),
  importId: z.uuid(),
  batchNo: positiveInt,
  attemptNo: positiveInt,
  status: BatchStatus,
  settledStatus: SettledStatus,
  /** Business date, unconverted; null when the attempt was written without one. */
  settlementDate: IsoDate.nullable(),
  /** Audit instant (UTC). */
  processedAt: z.iso.datetime(),
  approvedBy: UserRef,
  amountPayable: Money4,
  /** The stored label, comma-joined and possibly cut with an ellipsis; never split into a list. */
  channels: z.string().nullable(),
})
export type AccountSettlement = z.infer<typeof AccountSettlement>

/** Newest first: processedAt, then batchNo and attemptNo, descending. */
export const AccountSettlementsPage = z.object({
  accountId: z.uuid(),
  items: z.array(AccountSettlement),
  page: positiveInt,
  pageSize: positiveInt,
  total: nonNegativeInt,
})
export type AccountSettlementsPage = z.infer<typeof AccountSettlementsPage>

// ───────────────────────── Exports ─────────────────────────

export const ExportType = z.enum(['summary', 'transactions', 'reserves'])
export type ExportType = z.infer<typeof ExportType>

/** GET /settlements/{id}/export. */
export const ExportQuery = z.object({ type: ExportType })
export type ExportQuery = z.infer<typeof ExportQuery>
