// Ports of the fees module: the read side Settlement Review and the settlement engine need (settlement-process D1)
// and the write side of the fee administration (admin-fees design D1, D6).
import type { AccountFee, FeeTypeView } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeState, FeeUsage } from '../domain/fee-patch.js'

/** A fee as stored, already as the API shapes it (money and dates as text); the status depends on today. */
export type StoredFee = Omit<AccountFee, 'status'>

export type StoredFeeType = FeeTypeView

/** A history row as FeeHistory stores it, plus who wrote it. */
export interface FeeHistoryWrite {
  feeId: string
  action: 'created' | 'updated' | 'closed'
  before: FeeState | null
  after: FeeState
  reason: string | null
  userId: number
}

/** An AuditLog entry of the fee administration (design D10). */
export interface FeeAuditWrite {
  action: 'fee.create' | 'fee.update' | 'fee.close' | 'fee.change'
  feeId: string
  detail: Record<string, unknown>
  userId: number
}

/** What a write may do inside the account lock (design D6); everything commits or rolls back together. */
export interface FeeAdminUnit {
  /** The fee type, or null when unknown. */
  feeType(feeTypeId: number): Promise<{ isActive: boolean } | null>
  /** Every fee of the account and type, as the overlap rule sees them. */
  feesOfType(accountId: string, feeTypeId: number): Promise<FeeState[]>
  /** The fee re-read under the lock, with its account; null when it is gone. */
  fee(feeId: string): Promise<(FeeState & { accountId: string }) | null>
  usage(feeId: string): Promise<FeeUsage>
  insert(accountId: string, fee: FeeState, userId: number): Promise<void>
  update(fee: FeeState): Promise<void>
  history(row: FeeHistoryWrite): Promise<void>
  audit(row: FeeAuditWrite): Promise<void>
  /** The fee as the API shapes it, after the writes. */
  stored(feeId: string): Promise<StoredFee>
}

export interface FeeAdminRepository {
  /**
   * Runs `work` in one transaction holding the account lock (UPDLOCK, HOLDLOCK); null when the account is unknown
   * or outside the scope. A deadlock victim is retried whole.
   */
  inAccount<T>(scope: Scope, accountId: string, work: (unit: FeeAdminUnit) => Promise<T>): Promise<T | null>
  /** The account of a fee inside the scope; null when the fee is unknown or outside it. */
  accountOfFee(scope: Scope, feeId: string): Promise<string | null>
}

export interface FeeReadRepository {
  /** Every fee of an account inside the scope (any validity), with its usage; null when unknown or outside it. */
  accountFees(scope: Scope, accountId: string): Promise<StoredFee[] | null>
  /** The active fee types. */
  feeTypesList(): Promise<StoredFeeType[]>
}
