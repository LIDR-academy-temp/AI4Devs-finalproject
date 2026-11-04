// Schemas of the matching rules administration (README §3.2 "Reglas de pareo", §4.4; admin-matching design D1).
// The kind–cycle–status coherence, the fixed-status rules, regex compilation and repeated patterns are domain
// rules answered as 400 validation_error with an exact details.field, not schema rules.
import { z } from 'zod'
import { AccountRef, MatchingRuleSetSummary } from './catalog.js'
import { Cycle, SheetKind, TargetField } from './vocabulary.js'

/** Patterns are stored without surrounding spaces; the length is the one of the NVARCHAR(128) columns. */
const Pattern = z.string().trim().min(1).max(128)
const Priority = z.number().int().min(0).max(32_767)
const StatusId = z.number().int().positive().max(2_147_483_647)
const Reason = z.string().trim().min(1).max(500)
/** At most 200 rules per list (design D1). */
const MAX_RULES = 200

export const SheetRuleInput = z.strictObject({
  sheetPattern: Pattern,
  isRegex: z.boolean(),
  kind: SheetKind,
  cycle: Cycle.nullable(),
  statusId: StatusId.nullable(),
  priority: Priority.default(100),
  isActive: z.boolean().default(true),
})
export type SheetRuleInput = z.infer<typeof SheetRuleInput>

export const ColumnRuleInput = z.strictObject({
  /** null = any sheet. */
  sheetPattern: Pattern.nullable(),
  columnPattern: Pattern,
  isRegex: z.boolean(),
  targetField: TargetField,
  priority: Priority.default(100),
  isActive: z.boolean().default(true),
})
export type ColumnRuleInput = z.infer<typeof ColumnRuleInput>

export const StatusAliasInput = z.strictObject({
  alias: z.string().trim().min(1).max(50),
  statusId: StatusId,
  /** The alias counts and applies its fee but does not add its amount (`CHB 2`). */
  excludeAmount: z.boolean(),
  isLegacy: z.boolean(),
})
export type StatusAliasInput = z.infer<typeof StatusAliasInput>

export const SheetRule = z.object({
  sheetRuleId: z.number().int(),
  sheetPattern: z.string(),
  isRegex: z.boolean(),
  kind: SheetKind,
  cycle: Cycle.nullable(),
  statusId: z.number().int().nullable(),
  priority: z.number().int(),
  isActive: z.boolean(),
})
export type SheetRule = z.infer<typeof SheetRule>

export const ColumnRule = z.object({
  columnRuleId: z.number().int(),
  sheetPattern: z.string().nullable(),
  columnPattern: z.string(),
  isRegex: z.boolean(),
  targetField: TargetField,
  priority: z.number().int(),
  isActive: z.boolean(),
})
export type ColumnRule = z.infer<typeof ColumnRule>

/** Read-only: the engine does not apply these rules yet (#120). */
export const RowIgnoreRule = z.object({
  rowIgnoreId: z.number().int(),
  pattern: z.string(),
  isRegex: z.boolean(),
  description: z.string().nullable(),
  isActive: z.boolean(),
})
export type RowIgnoreRule = z.infer<typeof RowIgnoreRule>

export const StatusAlias = z.object({
  alias: z.string(),
  statusId: z.number().int(),
  excludeAmount: z.boolean(),
  isLegacy: z.boolean(),
})
export type StatusAlias = z.infer<typeof StatusAlias>

/** A status of the catalog with its natural cycle, for the rule editor. */
export const MatchingStatus = z.object({
  statusId: z.number().int(),
  name: z.string(),
  cycle: Cycle,
})
export type MatchingStatus = z.infer<typeof MatchingStatus>

/** Rules in `priority` order and, at equal priority, in the order they were saved (the proposal's tie-break). */
export const MatchingRuleSetDetail = z.object({
  ruleSetId: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
  provider: z.object({ providerId: z.number().int(), name: z.string() }),
  accounts: MatchingRuleSetSummary.shape.accounts,
  sheetRules: z.array(SheetRule),
  columnRules: z.array(ColumnRule),
  rowIgnoreRules: z.array(RowIgnoreRule),
})
export type MatchingRuleSetDetail = z.infer<typeof MatchingRuleSetDetail>

/** Body of POST /providers/{id}/matching-rule-sets. */
export const MatchingRuleSetCreate = z.strictObject({
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean().optional(),
  sheetRules: z.array(SheetRuleInput).max(MAX_RULES).default([]),
  columnRules: z.array(ColumnRuleInput).max(MAX_RULES).default([]),
  reason: Reason.optional(),
})
export type MatchingRuleSetCreate = z.infer<typeof MatchingRuleSetCreate>

/** Body of PUT /matching-rule-sets/{id}: the whole document; it replaces every sheet and column rule of the set. */
export const MatchingRuleSetPut = z.strictObject({
  name: z.string().trim().min(1).max(80),
  isActive: z.boolean(),
  sheetRules: z.array(SheetRuleInput).max(MAX_RULES),
  columnRules: z.array(ColumnRuleInput).max(MAX_RULES),
  reason: Reason.optional(),
})
export type MatchingRuleSetPut = z.infer<typeof MatchingRuleSetPut>

/** GET /matching-rules/global. */
export const GlobalMatchingRules = z.object({
  sheetRules: z.array(SheetRule),
  columnRules: z.array(ColumnRule),
  rowIgnoreRules: z.array(RowIgnoreRule),
  statusAliases: z.array(StatusAlias),
  statuses: z.array(MatchingStatus),
})
export type GlobalMatchingRules = z.infer<typeof GlobalMatchingRules>

/** Body of PUT /matching-rules/global: replaces the global sheet and column rules and the status aliases. */
export const GlobalMatchingRulesPut = z.strictObject({
  sheetRules: z.array(SheetRuleInput).max(MAX_RULES),
  columnRules: z.array(ColumnRuleInput).max(MAX_RULES),
  statusAliases: z.array(StatusAliasInput).max(MAX_RULES),
  reason: Reason.optional(),
})
export type GlobalMatchingRulesPut = z.infer<typeof GlobalMatchingRulesPut>

/** details of 409 rule_set_in_use: the accounts linked to the set, open or closed, by name. */
export const RuleSetInUseDetails = z.object({ accounts: z.array(AccountRef) })
export type RuleSetInUseDetails = z.infer<typeof RuleSetInUseDetails>
