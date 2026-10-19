// Read side of the fees module (settlement-process D1): what Settlement Review and the settlement engine need.
// Administration (create, edit, close, history) is tramo 5.
import type { AccountFee, FeeTypeView } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'

/** A fee as stored, already as the API shapes it (money and dates as text). */
export type StoredFee = AccountFee

export type StoredFeeType = FeeTypeView

export interface FeeReadRepository {
  /** Every fee of an account inside the scope (any validity); null when the account is unknown or outside it. */
  accountFees(scope: Scope, accountId: string): Promise<StoredFee[] | null>
  /** The active fee types. */
  feeTypesList(): Promise<StoredFeeType[]>
}
