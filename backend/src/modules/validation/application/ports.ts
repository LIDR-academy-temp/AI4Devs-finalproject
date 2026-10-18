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
  StatusEntry,
  ValidationRow,
} from '../domain/types.js'

/** ImportRow ⋈ ImportSheet ⋈ ImportFile ⋈ Transaction; fileOrder by uploadedAt, sheetOrder by workbook position. */
export interface ValidationRowSource {
  rowsOf(importId: string): Promise<ValidationRow[]>
}

/**
 * The account of the import with the channels it is primary for (AccountChannel.isPrimary = 1) and the
 * Channel.rollingReserveDays of every channel of its provider, inactive ones included (the expiry of a reserve: a
 * channel missing from the map is a programming error in the engine).
 */
export interface AccountScopeSource {
  accountOf(importId: string): Promise<AccountScope>
}

/** SettlementTransaction of attempts with status <> 'undone', of every account of the provider, not of this import. */
export interface SettlementHistorySource {
  hasPreviousBatches(providerId: number, excludeImportId: string): Promise<boolean>
  movements(providerId: number, transactionIds: readonly bigint[], excludeImportId: string): Promise<HistoryMovement[]>
}

/**
 * Candidates per range (APP Successful, DEC Declined, I natural-cycle-I statuses, plus Pending for the count), dated
 * up to each range's max (for I, `lastStatusChangedAt <= max OR lastStatusChangedAt IS NULL`: the engine counts the
 * undated ones in undatedCandidateCount, so the source must not drop them), and only those NOT processed in that
 * cycle in a non-undone attempt of the provider; held reserves without a current R movement whose expiry (creation
 * + rollingReserveDays of the channel) is up to `rMax`, the max of the R range, which is also by expiry.
 */
export interface MissingCandidateSource {
  candidates(account: AccountScope, ranges: CycleRanges): Promise<CandidateTransaction[]>
  heldReserves(account: AccountScope, rMax: Date): Promise<HeldReserve[]>
}

/** `${cycle}:${transactionId}` of persistent missing findings of imports with a processed or paid SettlementBatch. */
export interface RegisteredMissingSource {
  registered(providerId: number): Promise<Set<string>>
}

/** TransactionStatus with its natural cycle: the catalog the engine resolves status codes against. */
export interface StatusCatalogSource {
  statuses(): Promise<StatusEntry[]>
}

/** Every read the engine input needs (validation-runs D4 step 2). */
export type ValidationSources = ValidationRowSource &
  AccountScopeSource &
  SettlementHistorySource &
  MissingCandidateSource &
  RegisteredMissingSource &
  StatusCatalogSource
