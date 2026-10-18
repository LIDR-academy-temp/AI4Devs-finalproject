/**
 * Input and report of the validation engine (design D2, D4). The engine is pure: everything it needs arrives in one
 * immutable `ValidationInput`, and the report has the shape #9 persists as ValidationRun / ValidationResult /
 * ValidationIssue / ConflictOccurrence.
 */
import type { Cycle, MatchResult, TransactionStatusCode, ValidationCode } from '@recon/shared'

// Local vocabulary until group 2 moves it to @recon/shared (design D11).
export type ValidationOutcome = 'passed' | 'warning' | 'blocked' | 'not_applicable' | 'not_implemented'
export type IssueType =
  | 'provider_mismatch'
  | 'non_recorded_adjustment'
  | 'status_mismatch'
  | 'duplicate'
  | 'collision'
  | 'missing'
export type IssueScope = 'in_batch' | 'across_batches' | 'previous_to_batch' | 'in_range'
export type MissingType = 'previous_to_batch' | 'in_range'
export type MissingRange = 'APP' | 'DEC' | 'I' | 'R'

// ───────────────────────── Input ─────────────────────────

export interface StatusEntry {
  statusId: number
  code: TransactionStatusCode
  /** Natural cycle of the status (the rolling reserve is not a status). */
  cycle: 'E' | 'I'
}

export interface AccountScope {
  accountId: string
  providerId: number
  /** Channels whose primary account is this one (AccountChannel.isPrimary). */
  primaryChannelIds: ReadonlySet<number>
}

/** What the engine knows of the matched transaction: no merchant, channel name nor amount (design D7). */
export interface RowTransaction {
  transactionId: bigint
  providerId: number
  channelId: number
  statusId: number
  transactionDate: Date
  lastStatusChangedAt: Date | null
}

export interface ValidationRow {
  fileId: string
  /** Upload order of the file within the import (0 = first). */
  fileOrder: number
  sheetId: string
  /** Position of the sheet in its workbook (0 = first). */
  sheetOrder: number
  rowNo: number
  transactionIdRaw: string | null
  cycle: Cycle
  /** Reported status (sheet or alias); for an R row, the current status of the transaction. */
  statusId: number | null
  /** `CHB 2`: a Chargeback whose amount is excluded. */
  excludeAmount: boolean
  matchResult: MatchResult
  /** Present exactly when `matchResult = matched`. */
  transaction: RowTransaction | null
}

export type HistoryBatchStatus = 'processed' | 'paid'

/** A SettlementTransaction of a non-undone attempt of any account of the provider. */
export interface HistoryMovement {
  batchId: string
  accountId: string
  batchNo: number
  attemptNo: number
  batchStatus: HistoryBatchStatus
  transactionId: bigint
  cycle: Cycle
  statusId: number
  excludeAmount: boolean
  sheetId: string | null
  rowNo: number | null
}

export interface CandidateTransaction {
  transactionId: bigint
  sourceTransactionId: string
  channelId: number
  statusId: number
  transactionDate: Date
  lastStatusChangedAt: Date | null
}

/** An E movement of a non-undone attempt that held a reserve not released yet. Money as decimal strings. */
export interface HeldReserve {
  transactionId: bigint
  sourceTransactionId: string
  channelId: number
  /** Current status of the transaction (the statusId of a missing R finding). */
  statusId: number
  transactionDate: Date
  batchId: string
  reserveHeldAmt: string
  reserveEarlyReleasedAmt: string
}

export interface ValidationInput {
  account: AccountScope
  rows: readonly ValidationRow[]
  history: readonly HistoryMovement[]
  /** Is there any non-undone attempt of the provider (this import excluded)? */
  hasPreviousBatches: boolean
  candidates: readonly CandidateTransaction[]
  reserveCandidates: readonly HeldReserve[]
  /** `${cycle}:${transactionId}` of missing findings registered by imports with a processed or paid batch. */
  registeredMissing: ReadonlySet<string>
  statuses: readonly StatusEntry[]
}

// ───────────────────────── Report ─────────────────────────

export interface DateRange {
  min: Date
  max: Date
}

export type CycleRanges = Record<MissingRange, DateRange | null>

export type Occurrence =
  | {
      sourceType: 'current_import'
      fileId: string
      sheetId: string
      rowNo: number
      statusId: number
      excludeAmount: boolean
      defaultIncluded: boolean
    }
  | {
      sourceType: 'previous_batch'
      batchId: string
      batchNo: number
      attemptNo: number
      accountId: string
      statusId: number
      excludeAmount: boolean
      defaultIncluded: boolean
    }

export interface Issue {
  issueType: IssueType
  scope: IssueScope | null
  blocking: boolean
  transactionIdRaw: string | null
  transactionId: bigint | null
  cycle: Cycle | null
  /** Reported status of the row, or the expected one for a missing finding. */
  statusId: number | null
  missingType?: MissingType
  missingRange?: MissingRange
  relevantDate?: Date
  /** Only non_recorded_adjustment / status_mismatch: the status the gateway holds. */
  gatewayStatusId?: number
  /** Empty except for duplicate / collision. */
  occurrences: Occurrence[]
}

export interface ValidationResult {
  code: ValidationCode
  outcome: ValidationOutcome
  issueCount: number
  issues: Issue[]
}

export interface ValidationReport {
  /** Eight results, fixed order. */
  results: ValidationResult[]
  blocked: boolean
  ranges: CycleRanges
  pendingInRangeCount: number
  undatedAdjustmentCount: number
}
