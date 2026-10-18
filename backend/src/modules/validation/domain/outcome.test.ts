import { describe, expect, it } from 'vitest'
import { deriveOutcome, overallBlocked } from './outcome.js'
import type { Issue, ValidationOutcome, ValidationResult } from './types.js'

// Spec "Resultado derivado de los hallazgos" (design D4): the outcome comes from the findings, never `failed`.
function issue(blocking: boolean): Issue {
  return {
    issueType: blocking ? 'provider_mismatch' : 'duplicate',
    scope: blocking ? null : 'in_batch',
    blocking,
    transactionIdRaw: '1',
    transactionId: 1n,
    cycle: 'E',
    statusId: 2,
    occurrences: [],
  }
}

function result(outcome: ValidationOutcome): ValidationResult {
  return { code: 'provider_mismatch', outcome, issueCount: 0, issues: [] }
}

describe('deriveOutcome', () => {
  it('is not_applicable when the validation does not apply', () => {
    expect(deriveOutcome([], false)).toBe('not_applicable')
  })

  it('is passed without findings', () => {
    expect(deriveOutcome([], true)).toBe('passed')
  })

  it('is warning with findings none of which blocks', () => {
    expect(deriveOutcome([issue(false), issue(false)], true)).toBe('warning')
  })

  it('is blocked with at least one blocking finding', () => {
    expect(deriveOutcome([issue(false), issue(true)], true)).toBe('blocked')
  })

  it('refuses a not_applicable validation with findings (impossible by construction)', () => {
    expect(() => deriveOutcome([issue(false)], false)).toThrow(/not applicable/)
  })

  it('never yields failed', () => {
    const outcomes = [
      deriveOutcome([], false),
      deriveOutcome([], true),
      deriveOutcome([issue(false)], true),
      deriveOutcome([issue(true)], true),
    ]
    expect(outcomes).not.toContain('failed')
  })
})

describe('overallBlocked', () => {
  it('is true only when some result is blocked', () => {
    expect(overallBlocked([result('passed'), result('blocked')])).toBe(true)
    expect(
      overallBlocked([result('passed'), result('warning'), result('not_applicable'), result('not_implemented')]),
    ).toBe(false)
    expect(overallBlocked([])).toBe(false)
  })
})
