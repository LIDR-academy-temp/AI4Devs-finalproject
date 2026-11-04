// Content rules of a matching rule document (README §3.2 "Reglas de pareo"; admin-matching design D2). Pure
// functions shared by the rule sets and the global rules. Each one throws a MatchingRuleError at the first broken
// rule, in list order; within a rule, in the order of the spec: kind/cycle/status shape, unknown status, Pending,
// natural cycle, regex, repetition. A repetition points at the second element.
import type { ColumnRuleInput, SheetRuleInput, StatusAliasInput } from '@recon/shared'
import { MatchingRuleError } from './errors.js'
import type { StatusCatalogEntry } from './rules.js'

/** The repetition key: what the proposal and UX_MatchingSheetRule_global_pattern compare, whatever isRegex says. */
function keyOf(text: string): string {
  return text.trim().toLowerCase()
}

/** Compiled with the same constructor as matchesPattern, so a pattern accepted here is the one the proposal runs. */
function compiles(pattern: string): boolean {
  try {
    new RegExp(pattern, 'i')
    return true
  } catch {
    return false
  }
}

export function validateSheetRules(rules: SheetRuleInput[], statuses: StatusCatalogEntry[]): void {
  const seen = new Set<string>()
  rules.forEach((rule, i) => {
    const at = (field: keyof SheetRuleInput) => `sheetRules[${i}].${field}`
    if (rule.kind === 'transactions') {
      if (rule.cycle === null) throw new MatchingRuleError(at('cycle'), 'A transactions sheet needs a cycle')
    } else {
      if (rule.cycle !== null) throw new MatchingRuleError(at('cycle'), `A ${rule.kind} sheet has no cycle`)
      if (rule.statusId !== null) throw new MatchingRuleError(at('statusId'), `A ${rule.kind} sheet has no status`)
    }
    if (rule.statusId !== null) {
      if (rule.cycle === 'R') throw new MatchingRuleError(at('statusId'), 'Cycle R has no status')
      const status = statuses.find((s) => s.statusId === rule.statusId)
      if (!status) throw new MatchingRuleError(at('statusId'), `Unknown status ${rule.statusId}`)
      if (status.name === 'Pending') throw new MatchingRuleError(at('statusId'), 'Pending cannot be a fixed status')
      if (status.cycle !== rule.cycle) {
        throw new MatchingRuleError(at('statusId'), `${status.name} is a cycle ${status.cycle} status`)
      }
    }
    if (rule.isRegex && !compiles(rule.sheetPattern)) {
      throw new MatchingRuleError(at('sheetPattern'), 'The regular expression does not compile')
    }
    const key = keyOf(rule.sheetPattern)
    if (seen.has(key)) throw new MatchingRuleError(at('sheetPattern'), `Sheet "${rule.sheetPattern}" is repeated`)
    seen.add(key)
  })
}

export function validateColumnRules(rules: ColumnRuleInput[]): void {
  const seen = new Set<string>()
  rules.forEach((rule, i) => {
    const at = (field: keyof ColumnRuleInput) => `columnRules[${i}].${field}`
    if (rule.isRegex) {
      if (rule.sheetPattern !== null && !compiles(rule.sheetPattern)) {
        throw new MatchingRuleError(at('sheetPattern'), 'The regular expression does not compile')
      }
      if (!compiles(rule.columnPattern)) {
        throw new MatchingRuleError(at('columnPattern'), 'The regular expression does not compile')
      }
    }
    // JSON keeps null (any sheet) apart from every sheet name.
    const key = JSON.stringify([
      rule.sheetPattern === null ? null : keyOf(rule.sheetPattern),
      keyOf(rule.columnPattern),
    ])
    if (seen.has(key)) {
      throw new MatchingRuleError(at('columnPattern'), `Column "${rule.columnPattern}" is repeated for the same sheet`)
    }
    seen.add(key)
  })
}

/** Aliases may name Pending: a status column may say it, only a sheet may not fix it. */
export function validateAliases(aliases: StatusAliasInput[], statuses: StatusCatalogEntry[]): void {
  const seen = new Set<string>()
  aliases.forEach((alias, i) => {
    const at = (field: keyof StatusAliasInput) => `statusAliases[${i}].${field}`
    if (!statuses.some((s) => s.statusId === alias.statusId)) {
      throw new MatchingRuleError(at('statusId'), `Unknown status ${alias.statusId}`)
    }
    const key = keyOf(alias.alias)
    if (seen.has(key)) throw new MatchingRuleError(at('alias'), `Alias "${alias.alias}" is repeated`)
    seen.add(key)
  })
}
