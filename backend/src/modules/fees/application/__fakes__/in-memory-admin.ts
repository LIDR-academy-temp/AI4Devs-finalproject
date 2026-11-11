/**
 * In-memory double of FeeAdminRepository (../ports.ts) over the catalog fixture's accounts and the seed's fee types
 * (backend/prisma/synthetic.ts: FEE_TYPES). It starts without fees: tests add the ones they need. A unit of work runs
 * on copies and commits only when `work` returns, so a throw leaves nothing, like the database transaction.
 */
import { ACCOUNTS, FEE_TYPES, PROVIDERS } from '../../../../../prisma/synthetic.js'
import { ACCOUNT_IDS, type AccountName } from '../../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../../catalog/domain/scope.js'
import type { FeeState, FeeUsage } from '../../domain/fee-patch.js'
import type { FeeAdminRepository, FeeAdminUnit, FeeAuditWrite, FeeHistoryWrite, StoredFee } from '../ports.js'

interface Row {
  accountId: string
  fee: FeeState
  createdByUserId: number
}

interface Store {
  rows: Row[]
  history: FeeHistoryWrite[]
  audit: FeeAuditWrite[]
}

const USER_NAMES: Record<number, string> = { 1: 'admin', 2: 'analyst', 3: 'payments', 4: 'viewer' }
const AT = '2026-11-03T15:00:00.000Z'

const merchantOfAccount = (accountId: string) => {
  const name = (Object.keys(ACCOUNT_IDS) as AccountName[]).find((n) => ACCOUNT_IDS[n] === accountId)
  if (!name) return null
  const account = ACCOUNTS.find((a) => a.name === name)!
  return PROVIDERS.find((p) => p.providerId === account.providerId)!.merchantId
}

const copy = (store: Store): Store => ({
  rows: store.rows.map((r) => ({ ...r, fee: { ...r.fee } })),
  history: [...store.history],
  audit: [...store.audit],
})

export class InMemoryFeeAdminRepository implements FeeAdminRepository {
  store: Store = { rows: [], history: [], audit: [] }
  readonly usages = new Map<string, FeeUsage>()
  readonly inactiveTypes = new Set<number>()
  /** Set by a test to make the audit write fail inside the unit of work. */
  failAudit = false

  /** A fee of an account, as a test sets it up (no history). */
  seed(name: AccountName, fee: Partial<FeeState> & { feeId: string; feeTypeId: number }, usage?: FeeUsage): FeeState {
    const state: FeeState = {
      fixedAmount: null,
      percentage: null,
      conditionalPercentage: null,
      conditionThresholdAmt: null,
      brandFixedAmount: null,
      brandPercentage: null,
      startDate: null,
      endDate: null,
      description: null,
      ...fee,
    }
    this.store.rows.push({ accountId: ACCOUNT_IDS[name], fee: state, createdByUserId: 1 })
    if (usage) this.usages.set(fee.feeId, usage)
    return state
  }

  feeOf(feeId: string): FeeState | undefined {
    return this.store.rows.find((r) => r.fee.feeId === feeId)?.fee
  }

  async inAccount<T>(scope: Scope, accountId: string, work: (unit: FeeAdminUnit) => Promise<T>): Promise<T | null> {
    const merchantId = merchantOfAccount(accountId)
    if (merchantId === null || !scope.merchantIds.includes(merchantId)) return null
    const draft = copy(this.store)
    const result = await work(this.unit(draft))
    this.store = draft
    return result
  }

  async accountOfFee(scope: Scope, feeId: string): Promise<string | null> {
    const row = this.store.rows.find((r) => r.fee.feeId === feeId)
    if (!row) return null
    const merchantId = merchantOfAccount(row.accountId)
    return merchantId !== null && scope.merchantIds.includes(merchantId) ? row.accountId : null
  }

  private unit(draft: Store): FeeAdminUnit {
    const usageOf = (feeId: string) => this.usages.get(feeId) ?? { inUse: false, lastAppliedEventDate: null }
    return {
      feeType: async (feeTypeId) => {
        const type = FEE_TYPES.find((t) => t.feeTypeId === feeTypeId)
        return type ? { isActive: !this.inactiveTypes.has(feeTypeId) } : null
      },
      feesOfType: async (accountId, feeTypeId) =>
        draft.rows.filter((r) => r.accountId === accountId && r.fee.feeTypeId === feeTypeId).map((r) => ({ ...r.fee })),
      fee: async (feeId) => {
        const row = draft.rows.find((r) => r.fee.feeId === feeId)
        return row ? { ...row.fee, accountId: row.accountId } : null
      },
      usage: async (feeId) => usageOf(feeId),
      insert: async (accountId, fee, userId) => {
        draft.rows.push({ accountId, fee: { ...fee }, createdByUserId: userId })
      },
      update: async (fee) => {
        const row = draft.rows.find((r) => r.fee.feeId === fee.feeId)!
        row.fee = { ...fee }
      },
      history: async (row) => {
        draft.history.push(row)
      },
      audit: async (row) => {
        if (this.failAudit) throw new Error('audit write failed')
        draft.audit.push(row)
      },
      stored: async (feeId): Promise<StoredFee> => {
        const row = draft.rows.find((r) => r.fee.feeId === feeId)!
        const type = FEE_TYPES.find((t) => t.feeTypeId === row.fee.feeTypeId)!
        const { feeId: id, ...rest } = row.fee
        return {
          feeId: id,
          ...rest,
          code: type.code,
          title: type.title,
          isTransactional: type.isTransactional,
          ...usageOf(feeId),
          createdBy: { userId: row.createdByUserId, userName: USER_NAMES[row.createdByUserId] ?? 'user' },
          createdAt: AT,
          updatedAt: AT,
        }
      },
    }
  }
}
