import { ValidationCode, ValidationRunView } from '@recon/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { sampleInput } from '../test-support/sample-input.js'
import { InMemoryRunRepository } from './__fakes__/in-memory-runs.js'
import { ImportChangedError, ImportNotAnalyzedError } from './errors.js'
import { ValidationService } from './validation-service.js'

// ValidationService over the doubles of the read ports (the real analysis of batch-issues / legacy-provider) and the
// in-memory run repository (validation-runs design D4–D6, D16; P1, P6).
const ANALYST: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ANALYST_ID = 2
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
/** The sample inputs number their imports from the same sequence: the foreign import gets an id of its own. */
const FOREIGN_IMPORT_ID = '00000000-0000-4000-8000-0000000f0002'
const NOW = new Date('2026-10-18T10:15:30.123Z')

let runs: InMemoryRunRepository
let service: ValidationService
let importId: string
const log = { info: vi.fn() }

async function caught<E>(promise: Promise<unknown>, type: new (...args: never[]) => E): Promise<E> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(type)
  return error as E
}

beforeEach(async () => {
  const issues = await sampleInput('batch-issues')
  runs = new InMemoryRunRepository()
  importId = issues.importId
  runs.addImport({ importId, merchantId: 1, status: 'analyzed' })
  service = new ValidationService({ sources: issues.sources, runs, log, now: () => NOW })
  log.info.mockClear()
})

describe('run (POST validations)', () => {
  it.each(['uploaded', 'mapped', 'processed', 'cancelled'] as const)(
    'in %s: 409 import_not_analyzed with the status, and no run is created',
    async (status) => {
      runs.setStatus(importId, status)

      const error = await caught(service.run(ANALYST, ANALYST_ID, importId), ImportNotAnalyzedError)

      expect(error).toMatchObject({ status: 409, code: 'import_not_analyzed', details: { status } })
      expect(runs.runsOf(importId)).toEqual([])
    },
  )

  it('in analyzed: the run of batch-issues with its eight results in order, counts, breakdowns and ranges', async () => {
    const view = await service.run(ANALYST, ANALYST_ID, importId)

    expect(ValidationRunView.safeParse(view).success).toBe(true)
    expect(view.importStatus).toBe('analyzed')
    expect(view.lastInvalidatedReview).toBeNull()
    const run = view.run!
    expect(run).toMatchObject({
      runAt: NOW.toISOString(),
      runBy: { userId: ANALYST_ID, userName: 'analyst' },
      blocked: false,
      manualChangeCount: 0,
      review: null,
    })
    expect(run.results.map((r) => [r.validationCode, r.outcome, r.issueCount])).toEqual([
      ['provider_mismatch', 'passed', 0],
      ['non_recorded_adjustment', 'warning', 3],
      ['duplicate_in_batch', 'warning', 1],
      ['status_collision_in_batch', 'warning', 1],
      ['duplicate_across_batches', 'warning', 1],
      ['status_collision_across_batches', 'warning', 1],
      ['missing_previous_to_batch', 'warning', 10],
      ['missing_in_range', 'warning', 6],
    ])
    expect(run.results.map((r) => [r.blocking, r.approved])).toEqual(run.results.map(() => [false, true]))
    expect(run.results[1]!.breakdown).toEqual({ non_recorded_adjustment: 1, status_mismatch: 2 })
    expect(run.results[6]!.breakdown).toEqual({ APP: 0, DEC: 10, I: 0, R: 0 })
    expect(run.results[7]!.breakdown).toEqual({ APP: 3, DEC: 0, I: 0, R: 3 })
    expect(run.results[2]!.breakdown).toBeNull()
    expect(run.ranges.APP).not.toBeNull()
    expect(run.ranges.R).not.toBeNull()
    expect(run.pendingInRangeCount).toBe(0)
    // No invalidation is audited for an analyzed import.
    expect(runs.auditOf(importId).map((e) => e.action)).toEqual([])
  })

  it('stores the 23 findings persistent and every occurrence with includeInSettlement = defaultIncluded', async () => {
    await service.run(ANALYST, ANALYST_ID, importId)

    const [stored] = runs.runsOf(importId)
    expect(stored!.issues).toHaveLength(23)
    expect(stored!.issues.every((i) => i.resolutionStatus === 'persistent')).toBe(true)
    const occurrences = stored!.issues.flatMap((i) => i.occurrences)
    expect(occurrences.length).toBeGreaterThan(0)
    expect(occurrences.every((o) => o.includeInSettlement === o.defaultIncluded && o.changedBy === null)).toBe(true)
  })

  it('logs loadMs, engineMs and writeMs', async () => {
    await service.run(ANALYST, ANALYST_ID, importId)

    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({
        importId,
        loadMs: expect.any(Number),
        engineMs: expect.any(Number),
        writeMs: expect.any(Number),
      }),
      expect.any(String),
    )
  })

  it('a second run supersedes the first one, which keeps its findings (HU2 CA1)', async () => {
    const first = await service.run(ANALYST, ANALYST_ID, importId)
    const second = await service.run(ANALYST, ANALYST_ID, importId)

    expect(second.run!.runId).not.toBe(first.run!.runId)
    const stored = runs.runsOf(importId)
    expect(stored.map((r) => [r.runId, r.isSuperseded])).toEqual([
      [first.run!.runId, true],
      [second.run!.runId, false],
    ])
    expect(stored[0]!.issues).toHaveLength(23)
  })

  it('in validated: 201 back in analyzed, the review invalidated and audited with the reviewer copied (P1, D16)', async () => {
    const first = await service.run(ANALYST, ANALYST_ID, importId)
    const reviewedAt = new Date('2026-10-18T10:02:11.000Z')
    runs.markReviewed(importId, first.run!.runId, ANALYST_ID, reviewedAt)

    const view = await service.run(ANALYST, ANALYST_ID, importId)

    expect(view.importStatus).toBe('analyzed')
    expect(view.run!.review).toBeNull()
    expect(view.lastInvalidatedReview).toEqual({
      runId: first.run!.runId,
      reviewedBy: { userId: ANALYST_ID, userName: 'analyst' },
      reviewedAt: reviewedAt.toISOString(),
      invalidatedBy: { userId: ANALYST_ID, userName: 'analyst' },
      invalidatedAt: NOW.toISOString(),
      reason: 'rerun',
      newRunId: view.run!.runId,
      occurrenceId: null,
    })
    const invalidation = runs.auditOf(importId).find((e) => e.action === 'import.review.invalidate')
    expect(invalidation).toMatchObject({
      userId: ANALYST_ID,
      entityType: 'Import',
      entityId: importId,
      detail: {
        runId: first.run!.runId,
        reviewedByUserId: ANALYST_ID,
        reviewedAt: reviewedAt.toISOString(),
        reason: 'rerun',
        newRunId: view.run!.runId,
      },
    })
  })

  it('409 import_changed when the import changed between the load and the write, writing nothing', async () => {
    runs.beforeSave = () => runs.touch(importId)

    const error = await caught(service.run(ANALYST, ANALYST_ID, importId), ImportChangedError)

    expect(error).toMatchObject({ status: 409, code: 'import_changed', details: { status: 'analyzed' } })
    expect(runs.runsOf(importId)).toEqual([])
  })

  it('404 for an unknown import and for one outside the scope, with the same message', async () => {
    runs.addImport({ importId: FOREIGN_IMPORT_ID, merchantId: 2, status: 'analyzed' })

    const unknown = await caught(service.run(ANALYST, ANALYST_ID, UNKNOWN_UUID), NotFoundError)
    const foreign = await caught(service.run(VIEWER, ANALYST_ID, FOREIGN_IMPORT_ID), NotFoundError)

    expect(foreign.message).toBe(unknown.message)
    expect(unknown.message).toBe('Import not found')
  })
})

describe('getCurrentRun (GET validations)', () => {
  it('without a run: run null and lastInvalidatedReview null', async () => {
    const view = await service.getCurrentRun(VIEWER, importId)

    expect(view).toEqual({ importId, importStatus: 'analyzed', run: null, lastInvalidatedReview: null })
  })

  it('returns the results in the fixed order even when the repository returns them shuffled', async () => {
    await service.run(ANALYST, ANALYST_ID, importId)
    runs.shuffleResults = true

    const view = await service.getCurrentRun(VIEWER, importId)

    expect(view.run!.results.map((r) => r.validationCode)).toEqual(ValidationCode.options)
  })

  it('the valid review of the current run, with its reviewer and date', async () => {
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)
    const reviewedAt = new Date('2026-10-18T10:30:00.000Z')
    runs.markReviewed(importId, run!.runId, ANALYST_ID, reviewedAt)

    const view = await service.getCurrentRun(VIEWER, importId)

    expect(view.importStatus).toBe('validated')
    expect(view.run!.review).toEqual({
      reviewedBy: { userId: ANALYST_ID, userName: 'analyst' },
      reviewedAt: reviewedAt.toISOString(),
    })
  })

  it('manualChangeCount: changed inclusions plus findings resolved by hand; back to the default it goes down', async () => {
    await service.run(ANALYST, ANALYST_ID, importId)
    const [stored] = runs.runsOf(importId)
    const excluded = stored!.issues.flatMap((i) => i.occurrences).find((o) => !o.defaultIncluded)!
    const nra = stored!.issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    runs.setInclusionDirectly(excluded.occurrenceId, true, ANALYST_ID, NOW)
    runs.resolveDirectly(nra.issueId, ANALYST_ID, NOW)

    expect((await service.getCurrentRun(VIEWER, importId)).run!.manualChangeCount).toBe(2)
    runs.setInclusionDirectly(excluded.occurrenceId, false, ANALYST_ID, NOW)
    expect((await service.getCurrentRun(VIEWER, importId)).run!.manualChangeCount).toBe(1)
  })

  it('404 for an import outside the scope', async () => {
    runs.addImport({ importId: FOREIGN_IMPORT_ID, merchantId: 2, status: 'analyzed' })

    await caught(service.getCurrentRun(VIEWER, FOREIGN_IMPORT_ID), NotFoundError)
  })
})
