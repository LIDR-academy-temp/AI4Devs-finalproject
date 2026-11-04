// What a PUT of a rule document changes (admin-matching design D2), for the no-op answer and the audit detail. The
// documents compare normalized: without rule ids, each rule with its fields in a fixed order, the lists in the
// order they are saved. The order counts, because it is the tie-break of the proposal.
import type { ColumnRuleInput, SheetRuleInput, StatusAliasInput } from '@recon/shared'

export interface RuleSetDocument {
  name: string
  isActive: boolean
  sheetRules: SheetRuleInput[]
  columnRules: ColumnRuleInput[]
}

export interface GlobalRulesDocument {
  sheetRules: SheetRuleInput[]
  columnRules: ColumnRuleInput[]
  statusAliases: StatusAliasInput[]
}

export type Change<T> = { before: T; after: T }

export interface RuleSetChanges {
  name?: Change<string>
  isActive?: Change<boolean>
  sheetRules?: Change<SheetRuleInput[]>
  columnRules?: Change<ColumnRuleInput[]>
}

export interface GlobalRulesChanges {
  sheetRules?: Change<SheetRuleInput[]>
  columnRules?: Change<ColumnRuleInput[]>
  statusAliases?: Change<StatusAliasInput[]>
}

export const sheetRuleOf = (r: SheetRuleInput): SheetRuleInput => ({
  sheetPattern: r.sheetPattern,
  isRegex: r.isRegex,
  kind: r.kind,
  cycle: r.cycle,
  statusId: r.statusId,
  priority: r.priority,
  isActive: r.isActive,
})

export const columnRuleOf = (r: ColumnRuleInput): ColumnRuleInput => ({
  sheetPattern: r.sheetPattern,
  columnPattern: r.columnPattern,
  isRegex: r.isRegex,
  targetField: r.targetField,
  priority: r.priority,
  isActive: r.isActive,
})

export const statusAliasOf = (a: StatusAliasInput): StatusAliasInput => ({
  alias: a.alias,
  statusId: a.statusId,
  excludeAmount: a.excludeAmount,
  isLegacy: a.isLegacy,
})

/** Adds `key` to `changes` when the normalized lists differ, element by element and in order. */
function compareList<T, K extends string>(
  changes: Partial<Record<K, Change<T[]>>>,
  key: K,
  before: T[],
  after: T[],
  normalize: (item: T) => T,
): void {
  const b = before.map(normalize)
  const a = after.map(normalize)
  if (JSON.stringify(b) !== JSON.stringify(a)) changes[key] = { before: b, after: a }
}

/** Only the fields whose value changes; empty when the body changes nothing. A case-only rename is a change. */
export function diffRuleSet(before: RuleSetDocument, after: RuleSetDocument): RuleSetChanges {
  const changes: RuleSetChanges = {}
  if (before.name !== after.name) changes.name = { before: before.name, after: after.name }
  if (before.isActive !== after.isActive) changes.isActive = { before: before.isActive, after: after.isActive }
  compareList(changes, 'sheetRules', before.sheetRules, after.sheetRules, sheetRuleOf)
  compareList(changes, 'columnRules', before.columnRules, after.columnRules, columnRuleOf)
  return changes
}

export function diffGlobals(before: GlobalRulesDocument, after: GlobalRulesDocument): GlobalRulesChanges {
  const changes: GlobalRulesChanges = {}
  compareList(changes, 'sheetRules', before.sheetRules, after.sheetRules, sheetRuleOf)
  compareList(changes, 'columnRules', before.columnRules, after.columnRules, columnRuleOf)
  compareList(changes, 'statusAliases', before.statusAliases, after.statusAliases, statusAliasOf)
  return changes
}

/** The audit action of a set edit: a change of isActive names it, whatever else changes with it. */
export function actionFor(changes: RuleSetChanges): 'activate' | 'deactivate' | 'update' {
  if (changes.isActive === undefined) return 'update'
  return changes.isActive.after ? 'activate' : 'deactivate'
}
