// Ports of the matching application layer. The Prisma adapter lives in ../infrastructure; the in-memory
// double in ../../imports/application/__fakes__ (the import module is its only consumer for now); the double of the
// rule set reads in ./__fakes__.
import type { MatchingRuleSetSummary } from '@recon/shared'
import type { Scope } from '../../catalog/domain/scope.js'
import type { MatchingRules } from '../domain/rules.js'

export interface MatchingRulesRepository {
  /** Active rules in force for an account: its linked rule set (null = none) plus the global rules, aliases and statuses. */
  rulesFor(ruleSetId: number | null): Promise<MatchingRules>
}

export interface RuleSetReadRepository {
  /** The sets of a provider by name with their linked accounts; null when the provider does not exist or is out of scope. */
  listForProvider(scope: Scope, providerId: number): Promise<MatchingRuleSetSummary[] | null>
}
