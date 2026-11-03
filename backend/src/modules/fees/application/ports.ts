// Read side of the fees module (settlement-process D1): what Settlement Review and the settlement engine need.
// The administration (create, edit, close, history) adds its own port in admin-fees.
import type { AccountFee, FeeTypeView } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'

/** A fee as stored, already as the API shapes it (money and dates as text); the status depends on today. */
export type StoredFee = Omit<AccountFee, 'status'>

export type StoredFeeType = FeeTypeView

export interface FeeReadRepository {
  /** Every fee of an account inside the scope (any validity), with its usage; null when unknown or outside it. */
  accountFees(scope: Scope, accountId: string): Promise<StoredFee[] | null>
  /** The active fee types. */
  feeTypesList(): Promise<StoredFeeType[]>
}
