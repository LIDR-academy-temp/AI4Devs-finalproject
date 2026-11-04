// Detail ⇄ form values ⇄ bodies of the matching rules (web-admin-matching design D4). A body is always the whole
// document, built from the last answer of the API: never a rule id, never the rows to ignore nor the statuses. The
// browser only applies the *Input schemas of @recon/shared and adapts the fields to the kind of sheet; the domain
// rules (regex, repeated patterns, Pending, natural cycle, a transactions sheet without cycle) are the API's 400.
import {
  type ColumnRule,
  ColumnRuleInput,
  type Cycle,
  type GlobalMatchingRulesPut,
  type MatchingRuleSetCreate,
  type MatchingRuleSetPut,
  type SheetKind,
  type SheetRule,
  SheetRuleInput,
  type StatusAlias,
  StatusAliasInput,
  type TargetField,
} from '@recon/shared'
import type { z } from 'zod'
import { strings } from './strings'

const m = strings.form.local

/** A sheet rule as the form edits it: selects and numbers as text, `''` for none. */
export interface SheetRuleValues {
  /** Local React key; never sent. */
  key: string
  sheetPattern: string
  isRegex: boolean
  kind: SheetKind
  cycle: Cycle | ''
  statusId: string
  priority: string
  isActive: boolean
}

export interface ColumnRuleValues {
  key: string
  /** `''` = any sheet. */
  sheetPattern: string
  columnPattern: string
  isRegex: boolean
  targetField: TargetField
  priority: string
  isActive: boolean
}

export interface StatusAliasValues {
  key: string
  alias: string
  statusId: string
  excludeAmount: boolean
  isLegacy: boolean
}

export interface RulesValues {
  sheetRules: SheetRuleValues[]
  columnRules: ColumnRuleValues[]
  /** Only the global rules have aliases; a rule set leaves the list empty. */
  statusAliases: StatusAliasValues[]
  reason: string
}

/** The checked rules, as the API takes them. */
export interface RulesInput {
  sheetRules: SheetRuleInput[]
  columnRules: ColumnRuleInput[]
  statusAliases: StatusAliasInput[]
}

export type RulesCheck = { ok: true; rules: RulesInput } | { ok: false; fields: Record<string, string> }

interface StoredRules {
  sheetRules: SheetRule[]
  columnRules: ColumnRule[]
  statusAliases?: StatusAlias[]
}

let seq = 0
const newKey = () => {
  seq += 1
  return `row-${seq}`
}

export const newSheetRule = (): SheetRuleValues => ({
  key: newKey(),
  sheetPattern: '',
  isRegex: false,
  kind: 'transactions',
  cycle: 'E',
  statusId: '',
  priority: '100',
  isActive: true,
})

export const newColumnRule = (): ColumnRuleValues => ({
  key: newKey(),
  sheetPattern: '',
  columnPattern: '',
  isRegex: false,
  targetField: 'transactionId',
  priority: '100',
  isActive: true,
})

export const newStatusAlias = (): StatusAliasValues => ({
  key: newKey(),
  alias: '',
  statusId: '',
  excludeAmount: false,
  isLegacy: false,
})

const text = (id: number | null) => (id === null ? '' : String(id))

/** The values of the form from the last answer, in its order, without ids nor read-only lists. */
export function valuesOf(doc: StoredRules): RulesValues {
  return {
    sheetRules: doc.sheetRules.map((r) => ({
      key: newKey(),
      sheetPattern: r.sheetPattern,
      isRegex: r.isRegex,
      kind: r.kind,
      cycle: r.cycle ?? '',
      statusId: text(r.statusId),
      priority: String(r.priority),
      isActive: r.isActive,
    })),
    columnRules: doc.columnRules.map((r) => ({
      key: newKey(),
      sheetPattern: r.sheetPattern ?? '',
      columnPattern: r.columnPattern,
      isRegex: r.isRegex,
      targetField: r.targetField,
      priority: String(r.priority),
      isActive: r.isActive,
    })),
    statusAliases: (doc.statusAliases ?? []).map((a) => ({
      key: newKey(),
      alias: a.alias,
      statusId: String(a.statusId),
      excludeAmount: a.excludeAmount,
      isLegacy: a.isLegacy,
    })),
    reason: '',
  }
}

/** The stored rules as the API takes them back (Rename, Deactivate, Activate, Copy of…). */
export function inputsOf(doc: StoredRules): { sheetRules: SheetRuleInput[]; columnRules: ColumnRuleInput[] } {
  return {
    sheetRules: doc.sheetRules.map(({ sheetRuleId: _id, ...rule }) => rule),
    columnRules: doc.columnRules.map(({ columnRuleId: _id, ...rule }) => rule),
  }
}

/** A whole number as text, or NaN so the schema rejects it. */
const integer = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : Number.NaN)
const optionalId = (value: string) => (value === '' ? null : Number(value))

/** The fields that do not exist for the kind of the sheet travel as null (design D4). */
function sheetInput(row: SheetRuleValues) {
  const transactions = row.kind === 'transactions'
  const cycle = transactions && row.cycle !== '' ? row.cycle : null
  return {
    sheetPattern: row.sheetPattern,
    isRegex: row.isRegex,
    kind: row.kind,
    cycle,
    statusId: !transactions || cycle === 'R' ? null : optionalId(row.statusId),
    priority: integer(row.priority),
    isActive: row.isActive,
  }
}

function columnInput(row: ColumnRuleValues) {
  return {
    sheetPattern: row.sheetPattern.trim() === '' ? null : row.sheetPattern,
    columnPattern: row.columnPattern,
    isRegex: row.isRegex,
    targetField: row.targetField,
    priority: integer(row.priority),
    isActive: row.isActive,
  }
}

function aliasInput(row: StatusAliasValues) {
  return {
    alias: row.alias,
    statusId: optionalId(row.statusId),
    excludeAmount: row.excludeAmount,
    isLegacy: row.isLegacy,
  }
}

/** The fixed text of the first issue of a field. */
function messageOf(field: string, issue: z.core.$ZodIssue): string {
  if (field === 'priority') return m.priority
  if (field === 'statusId') return m.status
  if (issue.code === 'too_big' && typeof issue.maximum === 'number') return m.tooLong(issue.maximum)
  if (field === 'alias') return m.aliasText
  if (field === 'sheetPattern' || field === 'columnPattern') return m.pattern
  return m.invalid
}

/** Each row through its *Input schema; issues keyed by the path details.field would use (`sheetRules[1].kind`). */
export function checkRules(values: RulesValues): RulesCheck {
  const fields: Record<string, string> = {}
  const parseList = <T>(list: string, rows: unknown[], schema: z.ZodType<T>): T[] =>
    rows.flatMap((row, index) => {
      const parsed = schema.safeParse(row)
      if (parsed.success) return [parsed.data]
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? '')
        const path = `${list}[${index}].${field}`
        fields[path] ??= messageOf(field, issue)
      }
      return []
    })

  const rules: RulesInput = {
    sheetRules: parseList('sheetRules', values.sheetRules.map(sheetInput), SheetRuleInput),
    columnRules: parseList('columnRules', values.columnRules.map(columnInput), ColumnRuleInput),
    statusAliases: parseList('statusAliases', values.statusAliases.map(aliasInput), StatusAliasInput),
  }
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, rules }
}

const withReason = (reason: string | undefined) => {
  const trimmed = reason?.trim()
  return trimmed ? { reason: trimmed } : {}
}

export interface RuleSetChanges {
  name?: string
  isActive?: boolean
  sheetRules?: SheetRuleInput[]
  columnRules?: ColumnRuleInput[]
  reason?: string
}

/** PUT /matching-rule-sets/{id}: the last detail with what changed; whatever did not change is sent as stored. */
export function ruleSetBody(
  detail: StoredRules & { name: string; isActive: boolean },
  changes: RuleSetChanges,
): MatchingRuleSetPut {
  const stored = inputsOf(detail)
  return {
    name: changes.name ?? detail.name,
    isActive: changes.isActive ?? detail.isActive,
    sheetRules: changes.sheetRules ?? stored.sheetRules,
    columnRules: changes.columnRules ?? stored.columnRules,
    ...withReason(changes.reason),
  }
}

/** PUT /matching-rules/global. */
export function globalsBody(rules: RulesInput, reason: string): GlobalMatchingRulesPut {
  return {
    sheetRules: rules.sheetRules,
    columnRules: rules.columnRules,
    statusAliases: rules.statusAliases,
    ...withReason(reason),
  }
}

/** POST /providers/{id}/matching-rule-sets: empty, or a copy of the stored rules of another set. */
export function createBody(name: string, source: StoredRules | null, reason: string): MatchingRuleSetCreate {
  const rules = source ? inputsOf(source) : { sheetRules: [], columnRules: [] }
  return { name: name.trim(), ...rules, ...withReason(reason) }
}
