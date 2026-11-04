/**
 * In-memory double of AccountAdminRepository (../ports.ts). It writes into the catalog double's fixture, so the
 * service answers with CatalogService.getAccount as it does over Prisma. A write that throws leaves nothing behind,
 * as a rolled-back transaction would. Fees of ProviderC-USD mirror the seed (five fees, NULL…NULL).
 */
import { ACCOUNT_IDS, type InMemoryCatalogRepository } from '../../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../../catalog/domain/scope.js'
import type { FeeState } from '../../../fees/domain/fee-patch.js'
import type { AccountState } from '../../domain/account-rules.js'
import type {
  AccountAdminRepository,
  AccountAdminUnit,
  AccountAuditWrite,
  NewAccount,
  StoredAccount,
} from '../ports.js'

export const LEGACY_RULE_SET = { ruleSetId: 1, providerId: 201, isActive: true, name: 'Provider C legacy' }
export const INACTIVE_RULE_SET = { ruleSetId: 2, providerId: 201, isActive: false, name: 'Provider C retired' }
export const PROVIDER_A_RULE_SET = { ruleSetId: 3, providerId: 101, isActive: true, name: 'Provider A' }

const USER_NAMES: Record<number, string> = { 1: 'admin', 2: 'analyst', 3: 'payments', 4: 'viewer' }

const seedFee = (feeId: string, feeTypeId: number, values: Partial<FeeState>): FeeState => ({
  feeId,
  feeTypeId,
  fixedAmount: null,
  percentage: null,
  conditionalPercentage: null,
  conditionThresholdAmt: null,
  brandFixedAmount: null,
  brandPercentage: null,
  startDate: null,
  endDate: null,
  description: null,
  ...values,
})

/** The seed's fees of ProviderC-USD (backend/prisma/synthetic.ts ACCOUNT_FEES). */
export function providerCUsdFees(): FeeState[] {
  return [
    seedFee('f0000000-0000-4000-8000-000000000001', 1, { percentage: '0.085000' }),
    seedFee('f0000000-0000-4000-8000-000000000002', 2, { fixedAmount: '0.5000' }),
    seedFee('f0000000-0000-4000-8000-000000000003', 3, { fixedAmount: '0.2000' }),
    seedFee('f0000000-0000-4000-8000-000000000004', 4, { fixedAmount: '40.0000' }),
    seedFee('f0000000-0000-4000-8000-000000000005', 5, { fixedAmount: '4.0000' }),
  ]
}

export interface StoredHistory {
  feeId: string
  action: 'copied'
  before: null
  after: FeeState
  userId: number
}

interface State {
  accounts: InMemoryCatalogRepository['fixture']['accounts']
  accountChannels: InMemoryCatalogRepository['fixture']['accountChannels']
  fees: Map<string, FeeState[]>
  history: StoredHistory[]
  audits: AccountAuditWrite[]
}

export class InMemoryAccountAdminRepository implements AccountAdminRepository {
  ruleSets = [LEGACY_RULE_SET, INACTIVE_RULE_SET, PROVIDER_A_RULE_SET].map((r) => ({ ...r }))
  fees = new Map<string, FeeState[]>([[ACCOUNT_IDS['ProviderC-USD'], providerCUsdFees()]])
  history: StoredHistory[] = []
  audits: AccountAuditWrite[] = []
  /** Accounts whose row a write locked, in order (the copy locks its source). */
  locked: string[] = []
  private tick = 0

  constructor(readonly catalog: InMemoryCatalogRepository) {}

  feesOf(accountId: string): FeeState[] {
    return structuredClone(this.fees.get(accountId) ?? [])
  }

  async inProvider<T>(scope: Scope, providerId: number, work: (unit: AccountAdminUnit) => Promise<T>) {
    const provider = this.catalog.fixture.providers.find((p) => p.providerId === providerId)
    if (!provider || !scope.merchantIds.includes(provider.merchantId)) return null
    return this.transaction(() => work(this.unit()))
  }

  async inAccount<T>(
    scope: Scope,
    accountId: string,
    work: (unit: AccountAdminUnit, current: StoredAccount) => Promise<T>,
  ) {
    const row = this.find(accountId)
    const provider = row && this.catalog.fixture.providers.find((p) => p.providerId === row.providerId)
    if (!row || !provider || !scope.merchantIds.includes(provider.merchantId)) return null
    this.locked.push(row.accountId)
    const current: StoredAccount = {
      accountId: row.accountId,
      providerId: row.providerId,
      name: row.name,
      chargebackReservePolicy: row.chargebackReservePolicy,
      rollingReserveCapAmt: row.rollingReserveCapAmt,
      matchingRuleSetId: row.matchingRuleSetId,
      isActive: row.isActive,
    }
    return this.transaction(() => work(this.unit(), current))
  }

  private find(accountId: string) {
    return this.catalog.fixture.accounts.find((a) => a.accountId.toLowerCase() === accountId.toLowerCase())
  }

  private now(): string {
    return new Date(Date.UTC(2026, 10, 3, 12, 0, ++this.tick)).toISOString()
  }

  /** Rolls everything back when the work throws. */
  private async transaction<T>(work: () => Promise<T>): Promise<T> {
    const saved: State = structuredClone({
      accounts: this.catalog.fixture.accounts,
      accountChannels: this.catalog.fixture.accountChannels,
      fees: this.fees,
      history: this.history,
      audits: this.audits,
    })
    try {
      return await work()
    } catch (error) {
      this.catalog.fixture.accounts = saved.accounts
      this.catalog.fixture.accountChannels = saved.accountChannels
      this.fees = saved.fees
      this.history = saved.history
      this.audits = saved.audits
      throw error
    }
  }

  private unit(): AccountAdminUnit {
    return {
      ruleSet: async (ruleSetId) => {
        const set = this.ruleSets.find((r) => r.ruleSetId === ruleSetId)
        return set ? { providerId: set.providerId, isActive: set.isActive } : null
      },

      nameTaken: async (name, exceptAccountId) =>
        this.catalog.fixture.accounts.some(
          (a) =>
            a.name.toLowerCase() === name.toLowerCase() && a.accountId.toLowerCase() !== exceptAccountId?.toLowerCase(),
        ),

      lockSourceAccount: async (accountId, providerId) => {
        const source = this.find(accountId)
        if (!source || source.providerId !== providerId) return false
        this.locked.push(source.accountId)
        return true
      },

      sourceFees: async (accountId) => this.feesOf(accountId),

      insertAccount: async (account: NewAccount) => {
        const at = this.now()
        this.catalog.fixture.accounts.push({
          accountId: account.accountId,
          providerId: account.providerId,
          name: account.name,
          chargebackReservePolicy: account.chargebackReservePolicy,
          rollingReserveCapAmt: account.rollingReserveCapAmt,
          matchingRuleSetId: account.matchingRuleSetId,
          isActive: account.isActive,
          createdAt: at,
          createdBy: { userId: account.createdByUserId, userName: USER_NAMES[account.createdByUserId] ?? 'unknown' },
          updatedAt: at,
        })
      },

      updateAccount: async (accountId, state: AccountState) => {
        const row = this.find(accountId)!
        Object.assign(row, state, { updatedAt: this.now() })
      },

      insertFee: async (accountId, fee) => {
        this.fees.set(accountId, [...(this.fees.get(accountId) ?? []), structuredClone(fee)])
      },

      copiedHistory: async (fee, userId) => {
        this.history.push({ feeId: fee.feeId, action: 'copied', before: null, after: structuredClone(fee), userId })
      },

      audit: async (row) => {
        this.audits.push(structuredClone(row))
      },
    }
  }
}
