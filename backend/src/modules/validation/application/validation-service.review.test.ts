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
  InclusionsChangedError,
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

/** What the analyst saw: the current run and the version of its inclusions, as GET validations answers them. */
async function seen(service: ValidationService, importId: string) {
  const { run } = await service.getCurrentRun(ANALYST, importId)
  return { runId: run!.runId, inclusionVersion: run!.inclusionVersion }
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

    const view = await service.review(ANALYST, ANALYST_ID, importId, await seen(service, importId))

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
        inclusionVersion: 1,
      },
    })
  })

  it('without a current run: 409 validation_run_required', async () => {
    const { service, importId } = await serviceFor('batch-issues')

    await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId: 1, inclusionVersion: 0 }),
      ValidationRunRequiredError,
    )
  })

  it('an old runId: 409 validation_run_superseded with the current one, and the import stays analyzed', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const first = await service.run(ANALYST, ANALYST_ID, importId)
    const second = await service.run(ANALYST, ANALYST_ID, importId)

    const error = await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId: first.run!.runId, inclusionVersion: 0 }),
      ValidationRunSupersededError,
    )

    expect(error.details).toEqual({ runId: first.run!.runId, currentRunId: second.run!.runId })
    expect((await service.getCurrentRun(VIEWER, importId)).importStatus).toBe('analyzed')
  })

  it('a blocked run: 409 blocking_validation_issue with the codes and the finding ids; still analyzed (HU2 CA5)', async () => {
    const { service, importId } = await serviceFor('batch-blocked')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    const mismatch = runs.runsOf(importId)[0]!.issues.filter((i) => i.issueType === 'provider_mismatch')

    const error = await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId: run!.runId, inclusionVersion: 0 }),
      BlockingValidationIssueError,
    )

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

    const error = await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId: run!.runId, inclusionVersion: 0 }),
      ImportNotAnalyzedError,
    )

    expect(error.details).toEqual({ status })
  })

  it('a new review after an invalidation: the new review is shown and the invalidated one is kept', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    await service.review(ANALYST, ANALYST_ID, importId, { runId: run!.runId, inclusionVersion: 0 })
    const occurrence = runs
      .runsOf(importId)[0]!
      .issues.flatMap((i) => i.occurrences)
      .find((o) => !o.defaultIncluded)!
    await service.setInclusion(ANALYST, ANALYST_ID, occurrence.occurrenceId, true)

    const view = await service.review(ANALYST, ANALYST_ID, importId, await seen(service, importId))

    expect(view.importStatus).toBe('validated')
    expect(view.run!.review).not.toBeNull()
    expect(view.lastInvalidatedReview).toMatchObject({ runId: run!.runId, reason: 'inclusion_change' })
  })

  it('404 for an import outside the scope', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    runs.setMerchant(importId, 2)

    await caught(service.review(VIEWER, ANALYST_ID, importId, { runId: 1, inclusionVersion: 0 }), NotFoundError)
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

      const error = await caught(
        service.review(ANALYST, ANALYST_ID, importId, { runId, inclusionVersion: 0, confirmEmptyBatch: confirm }),
        NoMatchedRowsError,
      )

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

    const view = await service.review(ANALYST, ANALYST_ID, importId, {
      runId,
      inclusionVersion: 0,
      confirmEmptyBatch: true,
    })

    expect(view.importStatus).toBe('validated')
    expect(runs.auditOf(importId).find((e) => e.action === 'import.review')?.detail).toMatchObject({
      emptyBatchConfirmed: true,
    })
  })

  it('a confirmation on an import with matched rows is ignored: validated, no emptyBatchConfirmed', async () => {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)

    await service.review(ANALYST, ANALYST_ID, importId, {
      runId: run!.runId,
      inclusionVersion: 0,
      confirmEmptyBatch: true,
    })

    expect(runs.auditOf(importId).find((e) => e.action === 'import.review')?.detail).not.toHaveProperty(
      'emptyBatchConfirmed',
    )
  })

  it('a blocked run answers blocking_validation_issue before no_matched_rows', async () => {
    const { service, importId, runId } = await emptyImport('batch-blocked')

    await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId, inclusionVersion: 0 }),
      BlockingValidationIssueError,
    )
  })
})

// Spec validation "Versión de las inclusiones de una corrida" and "El review exige las inclusiones que se vieron"
// (review-inclusion-version D3, D4, D8): the review approves only the inclusions the analyst saw.
describe('inclusionVersion of the run (#53)', () => {
  async function withRun() {
    const { service, importId } = await serviceFor('batch-issues')
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    const excluded = runs
      .runsOf(importId)[0]!
      .issues.flatMap((i) => i.occurrences)
      .find((o) => !o.defaultIncluded)!
    return { service, importId, runId: run!.runId, occurrenceId: excluded.occurrenceId }
  }

  it('starts at 0, goes up with each applied change, not with the same value, and the change audits it', async () => {
    const { service, importId, occurrenceId } = await withRun()
    expect((await seen(service, importId)).inclusionVersion).toBe(0)

    await service.setInclusion(ANALYST, ANALYST_ID, occurrenceId, true)
    expect((await seen(service, importId)).inclusionVersion).toBe(1)
    await service.setInclusion(ANALYST, ANALYST_ID, occurrenceId, true)
    expect((await seen(service, importId)).inclusionVersion).toBe(1)
    await service.setInclusion(ANALYST, ANALYST_ID, occurrenceId, false)
    expect((await seen(service, importId)).inclusionVersion).toBe(2)

    const changes = runs.audit.filter((e) => e.action === 'validation.occurrence.set_inclusion')
    expect(changes.map((e) => e.detail.inclusionVersion)).toEqual([1, 2])
  })

  it('a new run starts at 0 and the superseded one keeps its version', async () => {
    const { service, importId, occurrenceId } = await withRun()
    await service.setInclusion(ANALYST, ANALYST_ID, occurrenceId, true)

    const { run } = await service.run(ANALYST, ANALYST_ID, importId)

    expect(run!.inclusionVersion).toBe(0)
    expect(runs.runsOf(importId)[0]!.inclusionVersion).toBe(1)
  })

  it('a resolution by hand does not move it (design D5)', async () => {
    const { service, importId } = await withRun()
    const nra = runs.runsOf(importId)[0]!.issues.find((i) => i.issueType === 'non_recorded_adjustment')!

    await service.resolveIssue(ANALYST, ANALYST_ID, nra.issueId, 'Recorded by hand')

    const { run } = await service.getCurrentRun(ANALYST, importId)
    expect(run!.inclusionVersion).toBe(0)
    expect(run!.manualChangeCount).toBe(1)
  })

  it('another analyst changed an inclusion: 409 inclusions_changed, still analyzed, no review and no audit', async () => {
    const { service, importId, runId, occurrenceId } = await withRun()
    const read = await seen(service, importId)
    await service.setInclusion(ANALYST, 3, occurrenceId, true)

    const error = await caught(service.review(ANALYST, ANALYST_ID, importId, read), InclusionsChangedError)

    expect(error).toMatchObject({ status: 409, code: 'inclusions_changed' })
    expect(error.details).toEqual({ runId, inclusionVersion: 0, currentInclusionVersion: 1 })
    const view = await service.getCurrentRun(ANALYST, importId)
    expect(view.importStatus).toBe('analyzed')
    expect(view.run!.review).toBeNull()
    expect(runs.auditOf(importId).some((e) => e.action === 'import.review')).toBe(false)
  })

  it('an old run with a stale version: validation_run_superseded, not inclusions_changed', async () => {
    const { service, importId, runId } = await withRun()
    await service.run(ANALYST, ANALYST_ID, importId)
    runs.bumpInclusionVersion(importId)

    await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId, inclusionVersion: 0 }),
      ValidationRunSupersededError,
    )
  })

  it('a blocked run or an empty batch with a stale version: inclusions_changed first', async () => {
    const { service, importId } = await serviceFor('batch-blocked')
    runs.setEmptyBatchFacts(importId, {
      rowsTotal: 1,
      matchedOwn: 0,
      unmatchedByReason: { no_match: 1, id_format: 0, lossy_numeric_id: 0, no_gateways: 0 },
    })
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    runs.bumpInclusionVersion(importId)

    await caught(
      service.review(ANALYST, ANALYST_ID, importId, { runId: run!.runId, inclusionVersion: 0 }),
      InclusionsChangedError,
    )
  })
})
