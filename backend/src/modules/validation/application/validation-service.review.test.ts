import { ValidationRunView } from '@recon/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { NoMatchedRowsError } from '../../imports/domain/errors.js'
import { expectedOf } from '../test-support/builders.js'
import { sampleInput } from '../test-support/sample-input.js'
import { InMemoryRunRepository } from './__fakes__/in-memory-runs.js'
import {
  BlockingValidationIssueError,
  ImportNotAnalyzedError,
  ValidationRunRequiredError,
  ValidationRunSupersededError,
} from './errors.js'
import { ValidationService } from './validation-service.js'

// The decision on the whole (validation-runs design D7, D16): POST review over the doubles, with batch-issues
// (warnings only) and batch-blocked (provider_mismatch).
const ANALYST: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ANALYST_ID = 2
const NOW = new Date('2026-10-18T10:30:00.000Z')

let runs: InMemoryRunRepository

async function serviceFor(sample: 'batch-issues' | 'batch-blocked' | 'batch-wrong-account') {
  const input = await sampleInput(sample)
  runs.addImport({ importId: input.importId, merchantId: 1, status: 'analyzed' })
  const service = new ValidationService({ sources: input.sources, runs, log: { info: vi.fn() }, now: () => NOW })
  return { service, importId: input.importId }
}

async function caught<E>(promise: Promise<unknown>, type: new (...args: never[]) => E): Promise<E> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(type)
  return error as E
}

beforeEach(() => {
  runs = new InMemoryRunRepository()
})

describe('review (POST review)', () => {
  it('the current run with warnings: 200 validated, the review with its author, audited with the counts (HU2 CA6)', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    const occurrence = runs
      .runsOf(importId)[0]!
      .issues.flatMap((i) => i.occurrences)
      .find((o) => !o.defaultIncluded)!
    await service.setInclusion(ANALYST, ANALYST_ID, occurrence.occurrenceId, true)

    const view = await service.review(ANALYST, ANALYST_ID, importId, run!.runId)

    expect(ValidationRunView.safeParse(view).success).toBe(true)
    expect(view.importStatus).toBe('validated')
    expect(view.run!.review).toEqual({
      reviewedBy: { userId: ANALYST_ID, userName: 'analyst' },
      reviewedAt: NOW.toISOString(),
    })
    expect(runs.runsOf(importId)[0]!.issues.every((i) => i.resolutionStatus === 'persistent')).toBe(true)
    expect(runs.auditOf(importId).find((e) => e.action === 'import.review')).toMatchObject({
      userId: ANALYST_ID,
      entityType: 'Import',
      entityId: importId,
      detail: {
        runId: run!.runId,
        issueCounts: {
          provider_mismatch: 0,
          non_recorded_adjustment: 3,
          duplicate_in_batch: 1,
          status_collision_in_batch: 1,
          duplicate_across_batches: 1,
          status_collision_across_batches: 1,
          missing_previous_to_batch: 10,
          missing_in_range: 6,
        },
        changedOccurrences: 1,
      },
    })
  })

  it('without a current run: 409 validation_run_required', async () => {
    const { service, importId } = await serviceFor('batch-issues')

    await caught(service.review(ANALYST, ANALYST_ID, importId, 1), ValidationRunRequiredError)
  })

  it('an old runId: 409 validation_run_superseded with the current one, and the import stays analyzed', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const first = await service.run(ANALYST, ANALYST_ID, importId)
    const second = await service.run(ANALYST, ANALYST_ID, importId)

    const error = await caught(
      service.review(ANALYST, ANALYST_ID, importId, first.run!.runId),
      ValidationRunSupersededError,
    )

    expect(error.details).toEqual({ runId: first.run!.runId, currentRunId: second.run!.runId })
    expect((await service.getCurrentRun(VIEWER, importId)).importStatus).toBe('analyzed')
  })

  it('a blocked run: 409 blocking_validation_issue with the codes and the finding ids; still analyzed (HU2 CA5)', async () => {
    const { service, importId } = await serviceFor('batch-blocked')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    const mismatch = runs.runsOf(importId)[0]!.issues.filter((i) => i.issueType === 'provider_mismatch')

    const error = await caught(service.review(ANALYST, ANALYST_ID, importId, run!.runId), BlockingValidationIssueError)

    expect(error.message).toBe('provider_mismatch: cancel the import and process it under the correct provider')
    expect(error.details).toEqual({
      runId: run!.runId,
      validationCodes: ['provider_mismatch'],
      issueIds: mismatch.map((i) => i.issueId),
    })
    expect((await service.getCurrentRun(VIEWER, importId)).importStatus).toBe('analyzed')
    expect(runs.auditOf(importId).some((e) => e.action === 'import.review')).toBe(false)
  })

  it.each(['validated', 'processed', 'cancelled'] as const)('in %s: 409 import_not_analyzed', async (status) => {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    runs.setStatus(importId, status)

    const error = await caught(service.review(ANALYST, ANALYST_ID, importId, run!.runId), ImportNotAnalyzedError)

    expect(error.details).toEqual({ status })
  })

  it('a new review after an invalidation: the new review is shown and the invalidated one is kept', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    await service.review(ANALYST, ANALYST_ID, importId, run!.runId)
    const occurrence = runs
      .runsOf(importId)[0]!
      .issues.flatMap((i) => i.occurrences)
      .find((o) => !o.defaultIncluded)!
    await service.setInclusion(ANALYST, ANALYST_ID, occurrence.occurrenceId, true)

    const view = await service.review(ANALYST, ANALYST_ID, importId, run!.runId)

    expect(view.importStatus).toBe('validated')
    expect(view.run!.review).not.toBeNull()
    expect(view.lastInvalidatedReview).toMatchObject({ runId: run!.runId, reason: 'inclusion_change' })
  })

  it('404 for an import outside the scope', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    runs.setMerchant(importId, 2)

    await caught(service.review(VIEWER, ANALYST_ID, importId, 1), NotFoundError)
  })
})

// Spec validation "Batch sin filas asociadas al revisar" (#92, design D2): not a validation, a confirmation.
describe('review of an import without matched rows (batch-wrong-account)', () => {
  const expected = expectedOf('batch-wrong-account') as {
    rows: { read: number; unmatched: number; unmatchedByReason: Record<string, number> }
  }
  const facts = {
    rowsTotal: expected.rows.read,
    matchedOwn: 0,
    unmatchedByReason: expected.rows.unmatchedByReason as {
      no_match: number
      id_format: number
      lossy_numeric_id: number
      no_gateways: number
    },
  }

  async function emptyImport(sample: 'batch-wrong-account' | 'batch-blocked' = 'batch-wrong-account') {
    const { service, importId } = await serviceFor(sample)
    runs.setEmptyBatchFacts(importId, facts)
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    return { service, importId, runId: run!.runId }
  }

  it.each([undefined, false])(
    'confirmEmptyBatch %s: 409 no_matched_rows with the details, still analyzed, no audit',
    async (confirm) => {
      const { service, importId, runId } = await emptyImport()

      const error = await caught(service.review(ANALYST, ANALYST_ID, importId, runId, confirm), NoMatchedRowsError)

      expect(error).toMatchObject({ status: 409, code: 'no_matched_rows' })
      expect(error.details).toEqual({
        rowsTotal: expected.rows.read,
        rowsUnmatched: expected.rows.unmatched,
        unmatchedByReason: expected.rows.unmatchedByReason,
        likelyWrongAccount: true,
      })
      expect((await service.getCurrentRun(ANALYST, importId)).importStatus).toBe('analyzed')
      expect(runs.auditOf(importId).some((e) => e.action === 'import.review')).toBe(false)
    },
  )

  it('confirmed: validated, and the review audit carries emptyBatchConfirmed', async () => {
    const { service, importId, runId } = await emptyImport()

    const view = await service.review(ANALYST, ANALYST_ID, importId, runId, true)

    expect(view.importStatus).toBe('validated')
    expect(runs.auditOf(importId).find((e) => e.action === 'import.review')?.detail).toMatchObject({
      emptyBatchConfirmed: true,
    })
  })

  it('a confirmation on an import with matched rows is ignored: validated, no emptyBatchConfirmed', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)

    await service.review(ANALYST, ANALYST_ID, importId, run!.runId, true)

    expect(runs.auditOf(importId).find((e) => e.action === 'import.review')?.detail).not.toHaveProperty(
      'emptyBatchConfirmed',
    )
  })

  it('a blocked run answers blocking_validation_issue before no_matched_rows', async () => {
    const { service, importId, runId } = await emptyImport('batch-blocked')

    await caught(service.review(ANALYST, ANALYST_ID, importId, runId), BlockingValidationIssueError)
  })
})
