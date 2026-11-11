import { ValidationCode } from '@recon/shared'

/** What POST review sends: the run the analyst saw and the version of its inclusions (#53). */
export interface ReviewRequest {
  runId: number
  inclusionVersion: number
}

/** The current run of the import as the review reads it under the lock of the import. */
export interface ReviewedRun {
  runId: number
  inclusionVersion: number
  /** As stored: the code and the outcome are text. */
  results: readonly { validationCode: string; outcome: string }[]
}

export type ReviewRefusal =
  | { kind: 'run_required' }
  | { kind: 'run_superseded'; currentRunId: number }
  | { kind: 'inclusions_changed'; currentInclusionVersion: number }
  | { kind: 'blocked'; validationCodes: ValidationCode[] }

/**
 * The first reason the review cannot validate the import, or null (review-inclusion-version D4). First what says the
 * screen is stale, from the run to its inclusions, then the rules of its content: a block is always told on what the
 * analyst saw. no_matched_rows comes after this guard: it needs the facts of the batch.
 */
export function reviewRefusal(request: ReviewRequest, current: ReviewedRun | null): ReviewRefusal | null {
  if (current === null) return { kind: 'run_required' }
  if (current.runId !== request.runId) return { kind: 'run_superseded', currentRunId: current.runId }
  if (current.inclusionVersion !== request.inclusionVersion) {
    return { kind: 'inclusions_changed', currentInclusionVersion: current.inclusionVersion }
  }
  const validationCodes = ValidationCode.options.filter((code) =>
    current.results.some((r) => r.validationCode === code && r.outcome === 'blocked'),
  )
  return validationCodes.length > 0 ? { kind: 'blocked', validationCodes } : null
}
