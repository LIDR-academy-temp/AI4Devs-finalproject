// The mapping proposal (README §1.2 "Importación de archivos con pareo revisado", §3.2 "Reglas de pareo"):
// a pure function from sheet names, headers and distinct values plus the rules of the account to a
// proposal per sheet and per column, each with its origin (account / global / none). Design D7.
import type { Cycle, ProposalSource, SheetKind, StatusValue, TargetField } from '@recon/shared'
import type { ColumnRule, MatchingRules, RuleSet, SheetRule } from './rules.js'
import { resolveStatusAlias, statusName } from './status-alias.js'

export interface ProposalSheetInput {
  name: string
  headers: string[]
  /** One entry per header; `distinctValues` null when the column has more values than tracked. */
  columnStats: { distinctValues: string[] | null }[]
}

export interface ProposalInput {
  sheets: ProposalSheetInput[]
}

export interface SheetProposalResult {
  kind: SheetKind | null
  cycle: Cycle | null
  statusId: number | null
  statusName: string | null
  source: ProposalSource
  note?: string
}

export interface ColumnProposalResult {
  sourceColumn: string
  targetField: TargetField | null
  source: ProposalSource
  /** Only for columns proposed as `status`, when the reader tracked the distinct values. */
  statusValues?: StatusValue[]
}

export interface SheetMappingProposal {
  sheetName: string
  proposed: SheetProposalResult
  columns: ColumnProposalResult[]
}

export interface MappingProposal {
  sheets: SheetMappingProposal[]
}

type Sourced<R> = { rule: R; source: Exclude<ProposalSource, 'none'> }

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

/** Non-regex patterns compare by equality ignoring case and surrounding spaces; regex patterns are case-insensitive. */
export function matchesPattern(pattern: string, isRegex: boolean, name: string): boolean {
  if (!isRegex) return normalize(pattern) === normalize(name)
  try {
    return new RegExp(pattern, 'i').test(name)
  } catch {
    // An invalid regex written by an administrator must not break uploads: the rule simply never matches,
    // which the proposal makes visible as "no proposal".
    return false
  }
}

function byPriority<R extends { priority: number }>(idOf: (r: R) => number) {
  return (a: Sourced<R>, b: Sourced<R>) => a.rule.priority - b.rule.priority || idOf(a.rule) - idOf(b.rule)
}

/** Specific (sheet-bound) column rules before generic ones at equal priority. */
function byColumnPrecedence(a: Sourced<ColumnRule>, b: Sourced<ColumnRule>): number {
  return (
    a.rule.priority - b.rule.priority ||
    Number(b.rule.sheetPattern !== null) - Number(a.rule.sheetPattern !== null) ||
    a.rule.columnRuleId - b.rule.columnRuleId
  )
}

function sourced<R>(set: RuleSet | null, source: 'account' | 'global', pick: (s: RuleSet) => R[]): Sourced<R>[] {
  if (!set) return []
  return pick(set).map((rule) => ({ rule, source }))
}

/** Candidates in precedence order: the account's rule set first, then the global rules (README §3.2). */
function candidates(rules: MatchingRules) {
  const active = <R extends { isActive: boolean }>(list: Sourced<R>[]) => list.filter((c) => c.rule.isActive)
  const sheetRules = [
    ...active(sourced(rules.account, 'account', (s) => s.sheetRules)).sort(byPriority((r: SheetRule) => r.sheetRuleId)),
    ...active(sourced(rules.global, 'global', (s) => s.sheetRules)).sort(byPriority((r: SheetRule) => r.sheetRuleId)),
  ]
  const columnRules = [
    ...active(sourced(rules.account, 'account', (s) => s.columnRules)).sort(byColumnPrecedence),
    ...active(sourced(rules.global, 'global', (s) => s.columnRules)).sort(byColumnPrecedence),
  ]
  return { sheetRules, columnRules }
}

function proposeSheet(sheetName: string, sheetRules: Sourced<SheetRule>[], rules: MatchingRules): SheetProposalResult {
  const match = sheetRules.find((c) => matchesPattern(c.rule.sheetPattern, c.rule.isRegex, sheetName))
  if (!match) return { kind: null, cycle: null, statusId: null, statusName: null, source: 'none' }
  const { rule, source } = match
  const proposed: SheetProposalResult = {
    kind: rule.kind,
    cycle: rule.cycle,
    statusId: rule.statusId,
    statusName: statusName(rule.statusId, rules),
    source,
  }
  if (rule.kind === 'ignore') proposed.note = `Sheet "${sheetName}" is ignored by rule "${rule.sheetPattern}"`
  return proposed
}

function proposeColumns(
  sheet: ProposalSheetInput,
  columnRules: Sourced<ColumnRule>[],
  rules: MatchingRules,
): ColumnProposalResult[] {
  const taken = new Set<TargetField>()
  return sheet.headers.map((header, index) => {
    const match = columnRules.find(
      (c) =>
        (c.rule.sheetPattern === null || matchesPattern(c.rule.sheetPattern, c.rule.isRegex, sheet.name)) &&
        matchesPattern(c.rule.columnPattern, c.rule.isRegex, header),
    )
    // One target field per sheet: the leftmost column keeps it, later matches are left without proposal.
    if (!match || taken.has(match.rule.targetField)) return { sourceColumn: header, targetField: null, source: 'none' }
    taken.add(match.rule.targetField)
    const column: ColumnProposalResult = {
      sourceColumn: header,
      targetField: match.rule.targetField,
      source: match.source,
    }
    const distinct = sheet.columnStats[index]?.distinctValues
    if (match.rule.targetField === 'status' && distinct) {
      column.statusValues = distinct.map((value) => resolveStatusAlias(value, rules))
    }
    return column
  })
}

export function proposeMapping(input: ProposalInput, rules: MatchingRules): MappingProposal {
  const { sheetRules, columnRules } = candidates(rules)
  return {
    sheets: input.sheets.map((sheet) => ({
      sheetName: sheet.name,
      proposed: proposeSheet(sheet.name, sheetRules, rules),
      columns: proposeColumns(sheet, columnRules, rules),
    })),
  }
}
