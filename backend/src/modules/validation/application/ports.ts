/**
 * Read ports of the validation engine (design D3). #9 implements them with Prisma and feeds `runValidations` in two
 * steps: `computeRanges(rows)` says which candidates to load, then the full input is built and validated.
 */
import type {
  AccountScope,
  CandidateTransaction,
  CycleRanges,
  HeldReserve,
  HistoryMovement,
  ValidationRow,
} from '../domain/types.js'

/** ImportRow ⋈ ImportSheet ⋈ ImportFile ⋈ Transaction; fileOrder by uploadedAt, sheetOrder by workbook position. */
export interface ValidationRowSource {
  rowsOf(importId: string): Promise<ValidationRow[]>
}

/** The account of the import with the channels it is primary for (AccountChannel.isPrimary = 1). */
export interface AccountScopeSource {
  accountOf(importId: string): Promise<AccountScope>
}

/** SettlementTransaction of attempts with status <> 'undone', of every account of the provider. */
export interface SettlementHistorySource {
  hasPreviousBatches(providerId: number, excludeImportId: string): Promise<boolean>
  movements(providerId: number, transactionIds: readonly bigint[]): Promise<HistoryMovement[]>
}

/**
 * Candidates per range (APP Successful, DEC Declined, I natural-cycle-I statuses, plus Pending for the count), dated
 * up to each range's max, and only those NOT processed in that cycle in a non-undone attempt of the provider; held
 * reserves without a current R movement.
 */
export interface MissingCandidateSource {
  candidates(account: AccountScope, ranges: CycleRanges): Promise<CandidateTransaction[]>
  heldReserves(account: AccountScope, rMax: Date): Promise<HeldReserve[]>
}

/** `${cycle}:${transactionId}` of persistent missing findings of imports with a processed or paid SettlementBatch. */
export interface RegisteredMissingSource {
  registered(providerId: number): Promise<Set<string>>
}
