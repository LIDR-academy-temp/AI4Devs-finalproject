import { ValidationCode } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { type ReviewedRun, reviewRefusal } from './review-guard.js'

// Spec "El review exige las inclusiones que se vieron" (review-inclusion-version D4): the first refusal of a review,
// in the order of the API: the run, then its inclusions, then the block.
function run(overrides: Partial<ReviewedRun> = {}): ReviewedRun {
  return {
    runId: 12,
    inclusionVersion: 1,
    results: ValidationCode.options.map((validationCode) => ({ validationCode, outcome: 'warning' as const })),
    ...overrides,
  }
}

function blocked(...codes: ValidationCode[]): ReviewedRun {
  return run({
    results: ValidationCode.options.map((validationCode) => ({
      validationCode,
      outcome: codes.includes(validationCode) ? ('blocked' as const) : ('passed' as const),
    })),
  })
}

describe('reviewRefusal', () => {
  it('without a current run: run_required', () => {
    expect(reviewRefusal({ runId: 12, inclusionVersion: 1 }, null)).toEqual({ kind: 'run_required' })
  })

  it('another runId: run_superseded with the current one, even when the version differs too', () => {
    expect(reviewRefusal({ runId: 11, inclusionVersion: 1 }, run())).toEqual({
      kind: 'run_superseded',
      currentRunId: 12,
    })
    expect(reviewRefusal({ runId: 11, inclusionVersion: 0 }, run())).toEqual({
      kind: 'run_superseded',
      currentRunId: 12,
    })
  })

  it('the current run with another inclusionVersion: inclusions_changed with the current version', () => {
    expect(reviewRefusal({ runId: 12, inclusionVersion: 0 }, run())).toEqual({
      kind: 'inclusions_changed',
      currentInclusionVersion: 1,
    })
    // A version ahead of the run is just as stale: it is not the one the run has.
    expect(reviewRefusal({ runId: 12, inclusionVersion: 2 }, run())).toEqual({
      kind: 'inclusions_changed',
      currentInclusionVersion: 1,
    })
  })

  it('a blocked run with a stale version: inclusions_changed before the block', () => {
    expect(reviewRefusal({ runId: 12, inclusionVersion: 0 }, blocked('provider_mismatch'))).toEqual({
      kind: 'inclusions_changed',
      currentInclusionVersion: 1,
    })
  })

  it('a blocked run with the current version: blocked with the codes in the order of ValidationCode', () => {
    const refusal = reviewRefusal({ runId: 12, inclusionVersion: 1 }, blocked('missing_in_range', 'provider_mismatch'))
    expect(refusal).toEqual({ kind: 'blocked', validationCodes: ['provider_mismatch', 'missing_in_range'] })
  })

  it('the current run, its version and no block: no refusal', () => {
    expect(reviewRefusal({ runId: 12, inclusionVersion: 1 }, run())).toBeNull()
    expect(reviewRefusal({ runId: 12, inclusionVersion: 0 }, run({ inclusionVersion: 0 }))).toBeNull()
  })
})
