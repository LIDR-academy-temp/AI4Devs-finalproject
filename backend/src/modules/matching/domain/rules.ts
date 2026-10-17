// Matching rules as the domain sees them (README §3.2 "Reglas de pareo"): the rule set linked to the
// account (if any), the global rules (ruleSetId NULL) and the global status aliases. Loaded by the
// MatchingRulesRepository; consumed by the pure proposal functions.
import type { Cycle, SheetKind, TargetField } from '@recon/shared'

export interface SheetRule {
  sheetRuleId: number
  sheetPattern: string
  isRegex: boolean
  kind: SheetKind
  cycle: Cycle | null
  statusId: number | null
  priority: number
  isActive: boolean
}

export interface ColumnRule {
  columnRuleId: number
  /** null = applies to any sheet. */
  sheetPattern: string | null
  columnPattern: string
  isRegex: boolean
  targetField: TargetField
  priority: number
  isActive: boolean
}

export interface StatusAlias {
  alias: string
  statusId: number
  /** The alias counts and applies its fee but does not add its amount (`CHB 2`). */
  excludeAmount: boolean
}

export interface StatusCatalogEntry {
  statusId: number
  name: string
  /** Natural cycle of the status (E or I); used to warn when it differs from the sheet's cycle. */
  cycle: Cycle
}

export interface RuleSet {
  ruleSetId: number | null
  name: string | null
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
}

export interface MatchingRules {
  /** The rule set linked to the account, or null when the account uses the global rules only. */
  account: RuleSet | null
  global: RuleSet
  aliases: StatusAlias[]
  statuses: StatusCatalogEntry[]
}
