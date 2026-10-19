// Ports of the settlement module (settlement-process design D1, D2, D5): what the calculation reads, and how processing
// writes it. The Prisma adapters take either the client or the transactional client, so the same reads serve the
// preview (outside a transaction) and processing (inside it, after the guard).
import type { ImportStatus, ValidationCode } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'
import type {
  AccountAttempt,
  AccountFeeConfig,
  BusinessRange,
  RowInclusion,
  SettlementAccount,
  SettlementChannel,
  SettlementFeeType,
  SettlementRow,
} from '../domain/types.js'

export interface ImportContext {
  importId: string
  status: ImportStatus
  account: SettlementAccount
}

export interface CurrentRun {
  runId: number
  ranges: { APP: BusinessRange | null; DEC: BusinessRange | null; I: BusinessRange | null; R: BusinessRange | null }
  /** The blocking findings of the run (only provider_mismatch blocks); null when it is not blocked. */
  blocked: { validationCodes: ValidationCode[]; issueIds: number[] } | null
}

export interface SettlementSource {
  /** The import with its account, when it is inside the scope; null otherwise (404 identical for both). */
  importContext(scope: Scope, importId: string): Promise<ImportContext | null>
  /** The current (not superseded) validation run of the import. */
  currentRun(importId: string): Promise<CurrentRun | null>
  /** Every ImportRow of the import with its sheet, file order and matched transaction. */
  rows(importId: string): Promise<SettlementRow[]>
  /** The current_import occurrences of a run, by row. */
  inclusions(runId: number): Promise<RowInclusion[]>
  /** The given channels with their reserve term and their situation for the account. */
  channels(accountId: string, channelIds: readonly number[]): Promise<SettlementChannel[]>
  /** Of the given transactions, those with an E movement in a non-undone attempt of the provider, the import excluded. */
  previousE(providerId: number, transactionIds: readonly bigint[], excludeImportId: string): Promise<Set<bigint>>
  accountFees(accountId: string): Promise<AccountFeeConfig[]>
  feeTypes(): Promise<SettlementFeeType[]>
  /** Every attempt of the account, in any status. */
  attempts(accountId: string): Promise<AccountAttempt[]>
}

/** feeTypeIds of the batch fees pre-filled from the Other Fees sheet, as GET /imports/{id} proposes them. */
export interface PrefilledBatchFees {
  feeTypeIdsOf(scope: Scope, importId: string): Promise<Set<number>>
}
