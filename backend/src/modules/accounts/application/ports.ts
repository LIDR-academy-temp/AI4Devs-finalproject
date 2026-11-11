// Ports of the account administration (admin-accounts design D4). Adapters live in ../infrastructure; the in-memory
// double in ./__fakes__.
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeState } from '../../fees/domain/fee-patch.js'
import type { AccountEditAction, AccountState } from '../domain/account-rules.js'

/** An account as a write reads it under the lock. */
export interface StoredAccount extends AccountState {
  accountId: string
  providerId: number
}

export interface NewAccount extends AccountState {
  accountId: string
  providerId: number
  createdByUserId: number
}

/** An AuditLog entry of the account administration (design D6). */
export interface AccountAuditWrite {
  action: 'account.create' | AccountEditAction
  accountId: string
  detail: Record<string, unknown>
  userId: number
}

/** What a write may do inside its transaction (design D4); everything commits or rolls back together. */
export interface AccountAdminUnit {
  /** The rule set's provider and flag, or null when unknown. */
  ruleSet(ruleSetId: number): Promise<{ providerId: number; isActive: boolean } | null>
  /** Whether another account (of any provider, open or closed) has this name, ignoring case. */
  nameTaken(name: string, exceptAccountId?: string): Promise<boolean>
  /** Locks the fee source account (UPDLOCK, HOLDLOCK) if it belongs to the provider; false when it does not exist there. */
  lockSourceAccount(accountId: string, providerId: number): Promise<boolean>
  /** Every fee of the account, any validity, read under its lock. */
  sourceFees(accountId: string): Promise<FeeState[]>
  insertAccount(account: NewAccount): Promise<void>
  updateAccount(accountId: string, state: AccountState): Promise<void>
  insertFee(accountId: string, fee: FeeState, userId: number): Promise<void>
  /** The FeeHistory row of a copied fee (`action = copied`, no before, no reason). */
  copiedHistory(fee: FeeState, userId: number): Promise<void>
  audit(row: AccountAuditWrite): Promise<void>
}

export interface AccountAdminRepository {
  /**
   * Runs `work` in one transaction once the provider is known to exist inside the scope; null when it is unknown or
   * outside it. A deadlock victim is retried whole.
   */
  inProvider<T>(scope: Scope, providerId: number, work: (unit: AccountAdminUnit) => Promise<T>): Promise<T | null>
  /**
   * Runs `work` in one transaction holding the account row (UPDLOCK, HOLDLOCK), the lock the fee writes take too;
   * null when the account is unknown or outside the scope.
   */
  inAccount<T>(
    scope: Scope,
    accountId: string,
    work: (unit: AccountAdminUnit, current: StoredAccount) => Promise<T>,
  ): Promise<T | null>
}
