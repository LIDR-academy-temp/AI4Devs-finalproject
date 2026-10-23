// Ports of the matching application layer. The Prisma adapter lives in ../infrastructure; the in-memory
// double in ../../imports/application/__fakes__ (the import module is its only consumer for now).
import type { MatchingRules } from '../domain/rules.js'

export interface MatchingRulesRepository {
  /** Active rules in force for an account: its linked rule set (null = none) plus the global rules, aliases and statuses. */
  rulesFor(ruleSetId: number | null): Promise<MatchingRules>
}
