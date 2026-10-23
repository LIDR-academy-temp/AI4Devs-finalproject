// Rule of cycle R for including an occurrence by hand (P3; rule "Ciclo R sin estado" of validation-engine): a reserve
// has no status and is released only once. Used to answer `includable` and, inside the transaction, to refuse.
import type { NotIncludableReason } from './errors.js'

export interface RuleOccurrence {
  occurrenceId: string
  sourceType: 'current_import' | 'previous_batch'
  includeInSettlement: boolean
}

/** Why including `target` would release a reserve twice; null when it may be included (or already is). */
export function reserveRuleBlocks(
  cycle: string | null,
  occurrences: readonly RuleOccurrence[],
  target: RuleOccurrence,
): NotIncludableReason | null {
  if (cycle !== 'R' || target.includeInSettlement) return null
  if (occurrences.some((o) => o.sourceType === 'previous_batch')) return 'reserve_already_released'
  if (occurrences.some((o) => o.occurrenceId !== target.occurrenceId && o.includeInSettlement))
    return 'reserve_already_included'
  return null
}
