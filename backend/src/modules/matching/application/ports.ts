// Ports of the matching application layer. The Prisma adapters live in ../infrastructure; the in-memory double of
// rulesFor in ../../imports/application/__fakes__ (the import module is its only consumer); the double of the rule
// set reads and writes in ./__fakes__.
import type { AccountRef, GlobalMatchingRules, MatchingRuleSetDetail, MatchingRuleSetSummary } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'
import type { GlobalRulesDocument, RuleSetDocument } from '../domain/rule-diff.js'
import type { MatchingRules, StatusCatalogEntry } from '../domain/rules.js'

export interface MatchingRulesRepository {
  /** Active rules in force for an account: its linked rule set (null = none) plus the global rules, aliases and statuses. */
  rulesFor(ruleSetId: number | null): Promise<MatchingRules>
}

export interface RuleSetReadRepository {
  /** The sets of a provider by name with their linked accounts; null when the provider does not exist or is out of scope. */
  listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[] | null>
  /** The detail of a set (admin-matching design D4); null when it does not exist or its provider is out of scope. */
  findDetail(scope: Scope, ruleSetId: number): Promise<MatchingRuleSetDetail | null>
}

/** A rule set as a write reads it under the lock: the normalized document, rules in saving order and without ids. */
export interface StoredRuleSet extends RuleSetDocument {
  ruleSetId: number
  providerId: number
}

export type RuleSetAuditAction =
  | 'matching_rule_set.create'
  | 'matching_rule_set.update'
  | 'matching_rule_set.activate'
  | 'matching_rule_set.deactivate'

/** An AuditLog entry of a rule set (design D6): entityType MatchingRuleSet, entityId the id. */
export interface RuleSetAuditWrite {
  action: RuleSetAuditAction
  ruleSetId: number
  detail: Record<string, unknown>
  userId: number
}

/** What a rule set write may do inside its transaction (design D3); everything commits or rolls back together. */
export interface RuleSetAdminUnit {
  statuses(): Promise<StatusCatalogEntry[]>
  /** Whether another set of the provider has this name, ignoring case (the column's collation). */
  nameTaken(providerId: number, name: string, exceptRuleSetId?: number): Promise<boolean>
  /** The accounts linked to the set, open or closed, by name. */
  linkedAccounts(ruleSetId: number): Promise<AccountRef[]>
  /** Inserts the set and its rules in list order (ids grow in that order: the tie-break); returns the new id. */
  insertRuleSet(providerId: number, document: RuleSetDocument): Promise<number>
  /** Writes the name and the flag, and replaces each rule list given, in list order. */
  updateRuleSet(
    ruleSetId: number,
    changes: Partial<Pick<RuleSetDocument, 'name' | 'isActive' | 'sheetRules' | 'columnRules'>>,
  ): Promise<void>
  /** The detail as GET /matching-rule-sets/{id} answers it, read inside the transaction (design D4). */
  detail(ruleSetId: number): Promise<MatchingRuleSetDetail>
  audit(row: RuleSetAuditWrite): Promise<void>
}

export interface MatchingRulesAdminRepository {
  /** Runs `work` in one transaction once the provider is known inside the scope; null when unknown or outside it. */
  inProvider<T>(scope: Scope, providerId: number, work: (unit: RuleSetAdminUnit) => Promise<T>): Promise<T | null>
  /**
   * Runs `work` in one transaction holding the set row (UPDLOCK, HOLDLOCK); null when the set is unknown or its
   * provider is outside the scope. A deadlock victim is retried whole.
   */
  inRuleSet<T>(
    scope: Scope,
    ruleSetId: number,
    work: (unit: RuleSetAdminUnit, current: StoredRuleSet) => Promise<T>,
  ): Promise<T | null>
}

/** The AuditLog entry of a global rules edit (design D6): entityType MatchingRules, entityId global. */
export interface GlobalRulesAuditWrite {
  detail: Record<string, unknown>
  userId: number
}

/** What a global rules write may do inside its transaction (design D3). */
export interface GlobalRulesAdminUnit {
  statuses(): Promise<StatusCatalogEntry[]>
  /** Replaces each list given, in list order; the row-ignore rules are never touched (#120). */
  replaceGlobals(changes: Partial<GlobalRulesDocument>): Promise<void>
  /** The global rules as GET /matching-rules/global answers them, read inside the transaction. */
  globals(): Promise<GlobalMatchingRules>
  audit(row: GlobalRulesAuditWrite): Promise<void>
}

export interface GlobalRulesRepository {
  /** The global rules, aliases and status catalog (design D4). */
  globals(): Promise<GlobalMatchingRules>
  /**
   * Runs `work` in one transaction holding the application lock of the global rules (there is no row to lock), with
   * the global document read under it. A deadlock victim is retried whole.
   */
  inGlobals<T>(work: (unit: GlobalRulesAdminUnit, current: GlobalRulesDocument) => Promise<T>): Promise<T>
}
