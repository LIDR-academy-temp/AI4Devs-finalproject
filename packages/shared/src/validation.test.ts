import { describe, expect, it } from 'vitest'
import {
  IssueScope,
  IssueType,
  isApproved,
  MissingRange,
  MissingType,
  OccurrenceSource,
  ValidationOutcome,
} from './validation.js'

describe('validation vocabulary (spec "Resultado derivado de los hallazgos", README §3.2)', () => {
  it('ValidationOutcome has passed, warning, blocked, not_applicable and not_implemented, and no failed', () => {
    expect(ValidationOutcome.options).toEqual(['passed', 'warning', 'blocked', 'not_applicable', 'not_implemented'])
    expect(ValidationOutcome.safeParse('failed').success).toBe(false)
  })

  it('IssueType includes status_mismatch (business decision 2)', () => {
    expect(IssueType.options).toEqual([
      'provider_mismatch',
      'non_recorded_adjustment',
      'status_mismatch',
      'duplicate',
      'collision',
      'missing',
    ])
  })

  it('IssueScope, OccurrenceSource, MissingType and MissingRange are the closed lists of §3.2', () => {
    expect(IssueScope.options).toEqual(['in_batch', 'across_batches', 'previous_to_batch', 'in_range'])
    expect(OccurrenceSource.options).toEqual(['current_import', 'previous_batch'])
    expect(MissingType.options).toEqual(['previous_to_batch', 'in_range'])
    expect(MissingRange.options).toEqual(['APP', 'DEC', 'I', 'R'])
    expect(IssueScope.safeParse('persistent').success).toBe(false)
  })

  it('isApproved is true only for passed and warning', () => {
    expect(ValidationOutcome.options.filter(isApproved)).toEqual(['passed', 'warning'])
  })
})
