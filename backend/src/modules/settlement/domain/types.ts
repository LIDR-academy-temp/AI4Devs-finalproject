/**
 * Input and plan of the settlement engine (settlement-process design D2): pure and synchronous, like the validation
 * engine. Everything the calculation needs arrives in one `SettlementInput`; the preview returns the plan and
 * processing writes it. Money is DECIMAL(19,4) text and percentages DECIMAL(9,6) text, never JS numbers.
 */
import type {
  BatchFeeInput,
  BatchStatus,
  ChannelAssignment,
  ChargebackReservePolicy,
  Cycle,
  MatchResult,
  TransactionStatusCode,
} from '@recon/shared'

export type { BatchFeeInput, Cycle, TransactionStatusCode }

// ───────────────────────── Input ─────────────────────────

export interface SettlementAccount {
  accountId: string
  name: string
  providerId: number
  chargebackReservePolicy: ChargebackReservePolicy
  /** Cap of held reserve; not applied in the MVP (P10). */
  rollingReserveCapAmt: string | null
}

/** The matched transaction of a row: the gateway's amount, status and dates. */
export interface SettlementTransactionData {
  transactionId: bigint
  sourceTransactionId: string
  providerId: number
  channelId: number
  /** USD amount from the gateway. */
  amount: string
  /** Current status in the gateway. */
  statusCode: TransactionStatusCode
  /** Business date of creation. */
  transactionDate: Date
  /** Business date of the last status change; not a history. */
  lastStatusChangedAt: Date | null
  appliedReservePct: string
  cardBrand: string | null
}

export interface SettlementRow {
  fileId: string
  /** Upload order of the file within the import (0 = first). */
  fileOrder: number
  sheetId: string
  /** Position of the sheet in its workbook (0 = first). */
  sheetOrder: number
  rowNo: number
  cycle: Cycle
  /** Reported status (sheet or alias); null when it could not be resolved. Unused in R. */
  statusCode: TransactionStatusCode | null
  /** `CHB 2`: a Chargeback whose amount is excluded. */
  excludeAmount: boolean
  matchResult: MatchResult
  /** Marked as ignored by a rule or by the analyst. */
  ignore: boolean
  /** Date the provider wrote in the row, when a column is mapped as txnDate (business date, zone unknown). */
  txnDate: Date | null
  /** Present exactly when `matchResult = matched`. */
  transaction: SettlementTransactionData | null
}

/** An occurrence of the current run, current_import, by its row. */
export interface RowInclusion {
  sheetId: string
  rowNo: number
  includeInSettlement: boolean
}

export interface SettlementChannel {
  channelId: number
  name: string
  /** Channel.rollingReserveDays: the reserve term of the channel. */
  rollingReserveDays: number
  /** Its situation for the account of the import (same rule as the channel notice of the analysis). */
  assignment: ChannelAssignment
  /** The current primary account when `assignment = assigned_to_other_account`. */
  otherAccount: { accountId: string; name: string } | null
}

/** A fee of the account with its configuration (any validity). */
export interface AccountFeeConfig {
  feeId: string
  feeTypeId: number
  fixedAmount: string | null
  percentage: string | null
  conditionalPercentage: string | null
  conditionThresholdAmt: string | null
  brandFixedAmount: string | null
  brandPercentage: string | null
  /** YYYY-MM-DD; null = since forever. */
  startDate: string | null
  /** YYYY-MM-DD; null = no end. */
  endDate: string | null
  description: string | null
}

export interface SettlementFeeType {
  feeTypeId: number
  code: string
  title: string
  isTransactional: boolean
  appliesToStatusCode: TransactionStatusCode | null
  allowsFreeAmount: boolean
}

/** An attempt of the account (any status), for the number and the attempt. */
export interface AccountAttempt {
  batchNo: number
  attemptNo: number
  status: BatchStatus
  importId: string
}

export interface BusinessRange {
  min: Date
  max: Date
}

export interface SettlementInput {
  importId: string
  account: SettlementAccount
  runId: number
  /** Ranges of the current run (business dates): the dates the batch was validated with. */
  ranges: { APP: BusinessRange | null; DEC: BusinessRange | null; I: BusinessRange | null; R: BusinessRange | null }
  rows: readonly SettlementRow[]
  inclusions: readonly RowInclusion[]
  /** Channels of the matched transactions of the import. */
  channels: readonly SettlementChannel[]
  /** Transactions with an E movement in a non-undone attempt of any account of the provider (this import excluded). */
  previousE: ReadonlySet<bigint>
  fees: readonly AccountFeeConfig[]
  feeTypes: readonly SettlementFeeType[]
  attempts: readonly AccountAttempt[]
  /** feeTypeIds of the batch fees pre-filled from the Other Fees sheet (source = file exception, P7). */
  prefilledFeeTypeIds: ReadonlySet<number>
  request: {
    batchNo?: number
    settlementDate?: string
    batchFees?: readonly BatchFeeInput[]
  }
  /** Transactional fees are a separate step (design D17); off until it is implemented. */
  options: { transactionalFees: boolean }
}

// ───────────────────────── Plan ─────────────────────────

export interface AppliedFee {
  feeId: string
  feeTypeId: number
  code: string
  /** Percentage of the configuration applied (for mdrRate), null for a fixed-only fee. */
  percentage: string | null
  amount: string
  configurationSnapshot: string
}

export interface MovementPlan {
  sheetId: string
  rowNo: number
  transactionId: bigint
  sourceTransactionId: string
  channelId: number
  cardBrand: string | null
  cycle: Cycle
  /** E and I: the status of the row; R: the current status of the transaction. */
  statusCode: TransactionStatusCode
  amount: string
  excludeAmount: boolean
  /** null: an adjustment the source cannot date. */
  eventDate: Date | null
  roundNo: 1 | 2 | null
  appliedReservePct: string
  reserveDaysUsed: number
  expectedReserveReleaseAt: Date | null
  /** JSON; I movements only. */
  reservePolicySnapshot: string | null
  reserveHeldAmt: string
  reserveReleasedAmt: string
  reserveEarlyReleasedAmt: string
  feeAmount: string
  fees: AppliedFee[]
}

export interface BatchFeePlan {
  feeTypeId: number
  code: string
  title: string
  feeId: string | null
  amount: string
  description: string | null
  source: 'file' | 'manual'
}

export type { BatchFeeInvalidReason, PayableLine, SettlementCategory, SettlementWarning, Skipped } from '@recon/shared'
