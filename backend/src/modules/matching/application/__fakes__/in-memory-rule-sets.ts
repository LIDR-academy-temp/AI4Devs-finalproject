// In-memory double of the rule set reads and writes (admin-accounts design D8, admin-matching design D3), over the
// synthetic world of the catalog double: providers 101 and 102 of merchant 1 have no set; provider 201 of merchant 2
// has "Provider C legacy" (the seed's rules) with ProviderC-Alt, and an inactive set without accounts. A write that
// throws leaves nothing behind, as a rolled-back transaction would.
import type {
  AccountRef,
  ColumnRule,
  MatchingRuleSetDetail,
  MatchingRuleSetSummary,
  RowIgnoreRule,
  SheetRule,
} from '@recon/shared'
import { ACCOUNT_IDS, LEGACY_RULE_SET_ID } from '../../../catalog/application/__fakes__/in-memory.js'
import type { Scope } from '../../../catalog/domain/scope.js'
import { columnRuleOf, type RuleSetDocument, sheetRuleOf } from '../../domain/rule-diff.js'
import type { StatusCatalogEntry } from '../../domain/rules.js'
import type {
  MatchingRulesAdminRepository,
  RuleSetAdminUnit,
  RuleSetAuditWrite,
  RuleSetReadRepository,
  StoredRuleSet,
} from '../ports.js'

export const STATUSES: StatusCatalogEntry[] = [
  { statusId: 1, name: 'Pending', cycle: 'E' },
  { statusId: 2, name: 'Successful', cycle: 'E' },
  { statusId: 3, name: 'Declined', cycle: 'E' },
  { statusId: 4, name: 'Chargeback', cycle: 'I' },
  { statusId: 5, name: 'Refund', cycle: 'I' },
  { statusId: 6, name: 'RDR', cycle: 'I' },
]

const PROVIDERS = new Map<number, { merchantId: number; name: string }>([
  [101, { merchantId: 1, name: 'Provider A' }],
  [102, { merchantId: 1, name: 'Provider B' }],
  [201, { merchantId: 2, name: 'Provider C' }],
])

export const ARCHIVE_RULE_SET_ID = 2

interface StoredSet {
  ruleSetId: number
  providerId: number
  name: string
  isActive: boolean
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
  rowIgnoreRules: RowIgnoreRule[]
}

interface LinkedAccount extends AccountRef {
  isActive: boolean
  ruleSetId: number
}

interface State {
  sets: StoredSet[]
  accounts: LinkedAccount[]
  audits: RuleSetAuditWrite[]
  nextRuleId: number
  nextSetId: number
}

function seed(): State {
  return {
    sets: [
      {
        ruleSetId: LEGACY_RULE_SET_ID,
        providerId: 201,
        name: 'Provider C legacy',
        isActive: true,
        sheetRules: [
          { sheetRuleId: 31, sheetPattern: 'TRX', isRegex: false, kind: 'transactions', cycle: 'E', statusId: null },
          { sheetRuleId: 32, sheetPattern: 'CB', isRegex: false, kind: 'transactions', cycle: 'I', statusId: null },
          { sheetRuleId: 33, sheetPattern: 'Fail', isRegex: false, kind: 'transactions', cycle: 'E', statusId: 3 },
          { sheetRuleId: 34, sheetPattern: 'Summary', isRegex: false, kind: 'ignore', cycle: null, statusId: null },
        ].map((r) => ({ ...r, priority: 10, isActive: true }) as SheetRule),
        columnRules: [
          { columnRuleId: 41, columnPattern: 'Merchant Order No#', targetField: 'transactionId' },
          { columnRuleId: 42, columnPattern: 'Order Status', targetField: 'status' },
          { columnRuleId: 43, columnPattern: 'Amount USD', targetField: 'amount' },
        ].map((r) => ({ ...r, sheetPattern: null, isRegex: false, priority: 5, isActive: true }) as ColumnRule),
        rowIgnoreRules: [],
      },
      {
        ruleSetId: ARCHIVE_RULE_SET_ID,
        providerId: 201,
        name: 'Provider C archive',
        isActive: false,
        sheetRules: [],
        columnRules: [],
        rowIgnoreRules: [],
      },
    ],
    accounts: [
      { accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt', isActive: true, ruleSetId: LEGACY_RULE_SET_ID },
    ],
    audits: [],
    nextRuleId: 100,
    nextSetId: 10,
  }
}

const byPriorityThen =
  <T extends { priority: number }>(id: (r: T) => number) =>
  (a: T, b: T) =>
    a.priority - b.priority || id(a) - id(b)

export class InMemoryRuleSets implements RuleSetReadRepository, MatchingRulesAdminRepository {
  state: State = seed()
  /** Rule sets whose row a write locked, in order. */
  locked: number[] = []

  get audits(): RuleSetAuditWrite[] {
    return this.state.audits
  }

  /** Links an account to a set (the accounts module does it in production), e.g. a closed account for a 409 test. */
  link(account: AccountRef & { isActive: boolean }, ruleSetId: number): void {
    this.state.accounts.push({ ...account, ruleSetId })
  }

  set(ruleSetId: number): StoredSet | undefined {
    return this.state.sets.find((s) => s.ruleSetId === ruleSetId)
  }

  private inScope(scope: Scope, providerId: number): boolean {
    const provider = PROVIDERS.get(providerId)
    return provider !== undefined && scope.merchantIds.includes(provider.merchantId)
  }

  async listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[] | null> {
    if (!this.inScope(scope, providerId)) return null
    return this.state.sets
      .filter((s) => s.providerId === providerId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({
        ruleSetId: s.ruleSetId,
        providerId: s.providerId,
        name: s.name,
        isActive: s.isActive,
        accounts: this.accountsOf(s.ruleSetId).map(({ accountId, name, isActive }) => ({ accountId, name, isActive })),
      }))
  }

  async findDetail(scope: Scope, ruleSetId: number): Promise<MatchingRuleSetDetail | null> {
    const set = this.set(ruleSetId)
    return set === undefined || !this.inScope(scope, set.providerId) ? null : this.detailOf(set)
  }

  async inProvider<T>(scope: Scope, providerId: number, work: (unit: RuleSetAdminUnit) => Promise<T>) {
    if (!this.inScope(scope, providerId)) return null
    return this.transaction(() => work(this.unit()))
  }

  async inRuleSet<T>(
    scope: Scope,
    ruleSetId: number,
    work: (unit: RuleSetAdminUnit, current: StoredRuleSet) => Promise<T>,
  ) {
    const set = this.set(ruleSetId)
    if (set === undefined || !this.inScope(scope, set.providerId)) return null
    this.locked.push(ruleSetId)
    const current: StoredRuleSet = {
      ruleSetId: set.ruleSetId,
      providerId: set.providerId,
      name: set.name,
      isActive: set.isActive,
      sheetRules: this.ordered(set.sheetRules, (r) => r.sheetRuleId).map(sheetRuleOf),
      columnRules: this.ordered(set.columnRules, (r) => r.columnRuleId).map(columnRuleOf),
    }
    return this.transaction(() => work(this.unit(), current))
  }

  private async transaction<T>(work: () => Promise<T>): Promise<T> {
    const before = structuredClone(this.state)
    try {
      return await work()
    } catch (error) {
      this.state = before
      throw error
    }
  }

  /** The saving order: rule ids, the order of insertion. */
  private ordered<T extends { priority: number }>(rules: T[], id: (r: T) => number): T[] {
    return [...rules].sort((a, b) => id(a) - id(b))
  }

  private accountsOf(ruleSetId: number): LinkedAccount[] {
    return this.state.accounts.filter((a) => a.ruleSetId === ruleSetId).sort((a, b) => a.name.localeCompare(b.name))
  }

  private detailOf(set: StoredSet): MatchingRuleSetDetail {
    const provider = PROVIDERS.get(set.providerId)!
    return structuredClone({
      ruleSetId: set.ruleSetId,
      name: set.name,
      isActive: set.isActive,
      provider: { providerId: set.providerId, name: provider.name },
      accounts: this.accountsOf(set.ruleSetId).map(({ accountId, name, isActive }) => ({ accountId, name, isActive })),
      sheetRules: [...set.sheetRules].sort(byPriorityThen((r: SheetRule) => r.sheetRuleId)),
      columnRules: [...set.columnRules].sort(byPriorityThen((r: ColumnRule) => r.columnRuleId)),
      rowIgnoreRules: set.rowIgnoreRules,
    })
  }

  private withIds(document: Pick<RuleSetDocument, 'sheetRules' | 'columnRules'>) {
    return {
      sheetRules: document.sheetRules.map((r) => ({ sheetRuleId: this.state.nextRuleId++, ...sheetRuleOf(r) })),
      columnRules: document.columnRules.map((r) => ({ columnRuleId: this.state.nextRuleId++, ...columnRuleOf(r) })),
    }
  }

  private unit(): RuleSetAdminUnit {
    return {
      statuses: async () => structuredClone(STATUSES),

      // The column's collation compares without case.
      nameTaken: async (providerId, name, exceptRuleSetId) =>
        this.state.sets.some(
          (s) =>
            s.providerId === providerId &&
            s.ruleSetId !== exceptRuleSetId &&
            s.name.toLowerCase() === name.toLowerCase(),
        ),

      linkedAccounts: async (ruleSetId) =>
        this.accountsOf(ruleSetId).map(({ accountId, name }) => ({ accountId, name })),

      insertRuleSet: async (providerId, document) => {
        const ruleSetId = this.state.nextSetId++
        this.state.sets.push({
          ruleSetId,
          providerId,
          name: document.name,
          isActive: document.isActive,
          ...this.withIds(document),
          rowIgnoreRules: [],
        })
        return ruleSetId
      },

      updateRuleSet: async (ruleSetId, changes) => {
        const set = this.set(ruleSetId)!
        if (changes.name !== undefined) set.name = changes.name
        if (changes.isActive !== undefined) set.isActive = changes.isActive
        if (changes.sheetRules !== undefined)
          set.sheetRules = this.withIds({ sheetRules: changes.sheetRules, columnRules: [] }).sheetRules
        if (changes.columnRules !== undefined)
          set.columnRules = this.withIds({ sheetRules: [], columnRules: changes.columnRules }).columnRules
      },

      detail: async (ruleSetId) => this.detailOf(this.set(ruleSetId)!),

      audit: async (row) => {
        this.state.audits.push(structuredClone(row))
      },
    }
  }
}
