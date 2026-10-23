import type { AccountFee, AccountFeesQuery, FeeTypeView } from '@recon/shared'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { isInForce } from '../domain/fee-selection.js'
import type { FeeReadRepository } from './ports.js'

/** Spec fees "Fees de la cuenta vigentes a una fecha" and "Catálogo de tipos de fee" (README §4.4). */
export class FeeReadService {
  constructor(private readonly repository: FeeReadRepository) {}

  /** Fees of the account, filtered by kind and by the business date they must be in force at; by title and start. */
  async accountFees(scope: Scope, accountId: string, query: AccountFeesQuery): Promise<AccountFee[]> {
    const fees = await this.repository.accountFees(scope, accountId)
    if (fees === null) throw new NotFoundError('Account')
    return fees
      .filter((f) => query.transactional === undefined || f.isTransactional === query.transactional)
      .filter((f) => query.asOf === undefined || isInForce(f, query.asOf))
      .sort(
        (a, b) =>
          compareText(a.title, b.title) ||
          compareText(a.startDate ?? '', b.startDate ?? '') ||
          compareText(a.feeId, b.feeId),
      )
  }

  /** Active fee types in feeTypeId order. */
  async feeTypes(): Promise<FeeTypeView[]> {
    return (await this.repository.feeTypesList()).sort((a, b) => a.feeTypeId - b.feeTypeId)
  }
}

/** By code point, not by the locale of the machine. */
function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
