// In-memory double of GlobalRulesRepository (admin-matching design D3, D4): a subset of the seed's global rules
// (backend/prisma/synthetic.ts), enough for the template sheets, the read-only row ignore, the aliases and the
// catalog. A write that throws leaves nothing behind, as a rolled-back transaction would.
import type { ColumnRule, GlobalMatchingRules, RowIgnoreRule, SheetRule, StatusAlias } from '@recon/shared'
import { columnRuleOf, type GlobalRulesDocument, sheetRuleOf, statusAliasOf } from '../../domain/rule-diff.js'
import type { GlobalRulesAdminUnit, GlobalRulesAuditWrite, GlobalRulesRepository } from '../ports.js'
import { STATUSES } from './in-memory-rule-sets.js'

interface State {
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
  rowIgnoreRules: RowIgnoreRule[]
  statusAliases: StatusAlias[]
  audits: GlobalRulesAuditWrite[]
  nextRuleId: number
}

const sheet = (sheetRuleId: number, sheetPattern: string, rest: Partial<SheetRule>): SheetRule => ({
  sheetRuleId,
  sheetPattern,
  isRegex: false,
  kind: 'transactions',
  cycle: 'E',
  statusId: null,
  priority: 10,
  isActive: true,
  ...rest,
})

const column = (columnRuleId: number, columnPattern: string, targetField: ColumnRule['targetField']): ColumnRule => ({
  columnRuleId,
  sheetPattern: null,
  columnPattern,
  isRegex: false,
  targetField,
  priority: 10,
  isActive: true,
})

function seed(): State {
  return {
    sheetRules: [
      sheet(1, 'APP', { statusId: 2 }),
      sheet(2, 'DEC', { statusId: 3 }),
      sheet(3, 'CHB', { cycle: 'I', statusId: 4 }),
      sheet(4, 'REF', { cycle: 'I', statusId: 5 }),
      sheet(5, 'RDR', { cycle: 'I', statusId: 6 }),
      sheet(6, 'RR', { cycle: 'R' }),
      sheet(7, 'Other Fees', { kind: 'batch_fees', cycle: null }),
      sheet(10, 'Settings', { kind: 'ignore', cycle: null }),
    ],
    columnRules: [column(1, 'ID', 'transactionId'), column(2, 'Amount', 'amount'), column(3, 'Currency', 'currency')],
    rowIgnoreRules: [
      {
        rowIgnoreId: 1,
        pattern: 'transactionId:empty',
        isRegex: false,
        description: 'Total rows (=SUM) and blank rows: no ID, no row',
        isActive: true,
      },
    ],
    statusAliases: [
      { alias: 'CHB 2', statusId: 4, excludeAmount: true, isLegacy: true },
      { alias: 'Successful', statusId: 2, excludeAmount: false, isLegacy: false },
    ],
    audits: [],
    nextRuleId: 100,
  }
}

const byPriorityThen =
  <T extends { priority: number }>(id: (r: T) => number) =>
  (a: T, b: T) =>
    a.priority - b.priority || id(a) - id(b)

export class InMemoryGlobalRules implements GlobalRulesRepository {
  state: State = seed()
  /** How many writes took the application lock. */
  locks = 0

  get audits(): GlobalRulesAuditWrite[] {
    return this.state.audits
  }

  async globals(): Promise<GlobalMatchingRules> {
    return structuredClone({
      sheetRules: [...this.state.sheetRules].sort(byPriorityThen((r: SheetRule) => r.sheetRuleId)),
      columnRules: [...this.state.columnRules].sort(byPriorityThen((r: ColumnRule) => r.columnRuleId)),
      rowIgnoreRules: this.state.rowIgnoreRules,
      statusAliases: [...this.state.statusAliases].sort((a, b) => a.alias.localeCompare(b.alias)),
      statuses: STATUSES,
    })
  }

  async inGlobals<T>(work: (unit: GlobalRulesAdminUnit, current: GlobalRulesDocument) => Promise<T>): Promise<T> {
    this.locks++
    const before = structuredClone(this.state)
    const read = await this.globals()
    const current: GlobalRulesDocument = {
      sheetRules: read.sheetRules.map(sheetRuleOf),
      columnRules: read.columnRules.map(columnRuleOf),
      statusAliases: read.statusAliases.map(statusAliasOf),
    }
    try {
      return await work(this.unit(), current)
    } catch (error) {
      this.state = before
      throw error
    }
  }

  private unit(): GlobalRulesAdminUnit {
    return {
      statuses: async () => structuredClone(STATUSES),
      replaceGlobals: async (changes) => {
        if (changes.sheetRules)
          this.state.sheetRules = changes.sheetRules.map((r) => ({
            sheetRuleId: this.state.nextRuleId++,
            ...sheetRuleOf(r),
          }))
        if (changes.columnRules)
          this.state.columnRules = changes.columnRules.map((r) => ({
            columnRuleId: this.state.nextRuleId++,
            ...columnRuleOf(r),
          }))
        if (changes.statusAliases) this.state.statusAliases = changes.statusAliases.map(statusAliasOf)
      },
      globals: () => this.globals(),
      audit: async (row) => {
        this.state.audits.push(structuredClone(row))
      },
    }
  }
}
