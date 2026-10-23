/**
 * In-memory double of FeeReadRepository (../ports.ts) over the seed's fees (backend/prisma/synthetic.ts: ACCOUNT_FEES,
 * all NULL…NULL, and FEE_TYPES), with the catalog fixture's account ids. Tests may add fees of their own.
 */
import { ACCOUNT_FEES, ACCOUNTS, FEE_TYPES, PROVIDERS } from '../../../../../prisma/synthetic.js'
import { ACCOUNT_IDS, type AccountName } from '../../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../../catalog/domain/scope.js'
import type { FeeReadRepository, StoredFee, StoredFeeType } from '../ports.js'

const merchantOf = (name: AccountName) => {
  const account = ACCOUNTS.find((a) => a.name === name)!
  return PROVIDERS.find((p) => p.providerId === account.providerId)!.merchantId
}

const text = (value: number | undefined, decimals: number) => (value === undefined ? null : value.toFixed(decimals))

export class InMemoryFeeRepository implements FeeReadRepository {
  readonly fees: (StoredFee & { accountId: string })[] = []
  private readonly feeTypes: StoredFeeType[] = FEE_TYPES.map((t) => ({ ...t }))
  private sequence = 0

  constructor() {
    for (const name of Object.keys(ACCOUNT_IDS) as AccountName[])
      for (const f of ACCOUNT_FEES[name] ?? []) this.add(name, { feeTypeId: f.feeTypeId, fixed: f.fixed, pct: f.pct })
  }

  /** A fee of an account; validity NULL…NULL unless given. */
  add(
    name: AccountName,
    fee: { feeTypeId: number; fixed?: number; pct?: number; startDate?: string; endDate?: string },
  ): StoredFee {
    const type = this.feeTypes.find((t) => t.feeTypeId === fee.feeTypeId)!
    const stored = {
      accountId: ACCOUNT_IDS[name],
      feeId: `f0000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`,
      feeTypeId: fee.feeTypeId,
      code: type.code,
      title: type.title,
      isTransactional: type.isTransactional,
      fixedAmount: text(fee.fixed, 4),
      percentage: text(fee.pct, 6),
      startDate: fee.startDate ?? null,
      endDate: fee.endDate ?? null,
      description: null,
    }
    this.fees.push(stored)
    return stored
  }

  async accountFees(scope: Scope, accountId: string): Promise<StoredFee[] | null> {
    const name = (Object.keys(ACCOUNT_IDS) as AccountName[]).find((n) => ACCOUNT_IDS[n] === accountId)
    if (!name || !scope.merchantIds.includes(merchantOf(name))) return null
    return this.fees.filter((f) => f.accountId === accountId).map(({ accountId: _, ...fee }) => fee)
  }

  async feeTypesList(): Promise<StoredFeeType[]> {
    return this.feeTypes.map((t) => ({ ...t }))
  }
}
