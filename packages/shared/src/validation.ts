// Vocabulary of the validation engine (README §1.2 "Resultado de una validación", §3.2 "Validaciones e incidencias").
// ValidationCode and BLOCKING_VALIDATIONS stay in vocabulary.ts.
import { z } from 'zod'

/** Outcome of one validation, derived from its findings. There is no `failed`. */
export const ValidationOutcome = z.enum(['passed', 'warning', 'blocked', 'not_applicable', 'not_implemented'])
export type ValidationOutcome = z.infer<typeof ValidationOutcome>

/** `status_mismatch` lives inside the non_recorded_adjustment validation (E row contradicting the gateway). */
export const IssueType = z.enum([
  'provider_mismatch',
  'non_recorded_adjustment',
  'status_mismatch',
  'duplicate',
  'collision',
  'missing',
])
export type IssueType = z.infer<typeof IssueType>

export const IssueScope = z.enum(['in_batch', 'across_batches', 'previous_to_batch', 'in_range'])
export type IssueScope = z.infer<typeof IssueScope>

export const OccurrenceSource = z.enum(['current_import', 'previous_batch'])
export type OccurrenceSource = z.infer<typeof OccurrenceSource>

export const MissingType = z.enum(['previous_to_batch', 'in_range'])
export type MissingType = z.infer<typeof MissingType>

/** Range a missing finding belongs to: E splits into APP and DEC. */
export const MissingRange = z.enum(['APP', 'DEC', 'I', 'R'])
export type MissingRange = z.infer<typeof MissingRange>

/** Counts as approved: `passed` and `warning`. `not_applicable` and `not_implemented` never do. */
export function isApproved(outcome: ValidationOutcome): boolean {
  return outcome === 'passed' || outcome === 'warning'
}
