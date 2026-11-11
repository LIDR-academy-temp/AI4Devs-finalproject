import type { Issue, ValidationOutcome, ValidationResult } from './types.js'

/** Outcome of one validation from its findings (design D4); `not_implemented` is the orchestrator's, never derived. */
export function deriveOutcome(issues: readonly Issue[], applicable: boolean): ValidationOutcome {
  if (!applicable) {
    if (issues.length > 0) throw new Error('a validation that is not applicable cannot produce findings')
    return 'not_applicable'
  }
  if (issues.length === 0) return 'passed'
  return issues.some((i) => i.blocking) ? 'blocked' : 'warning'
}

/** The run is blocked when any validation is. */
export function overallBlocked(results: readonly ValidationResult[]): boolean {
  return results.some((r) => r.outcome === 'blocked')
}
