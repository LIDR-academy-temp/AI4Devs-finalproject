import { ValidationCode, ValidationIssueDetail } from '@recon/shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotFoundError } from '../../../shared/errors.js'
import type { Scope } from '../../catalog/domain/scope.js'
import { ImportNotEditableError } from '../../imports/domain/errors.js'
import type { Issue, Occurrence, ValidationReport } from '../domain/types.js'
import { sampleInput } from '../test-support/sample-input.js'
import { InMemoryRunRepository } from './__fakes__/in-memory-runs.js'
import {
  IssueAlreadyResolvedError,
  IssueNotResolvableError,
  OccurrenceNotEditableError,
  OccurrenceNotIncludableError,
  ValidationRunSupersededError,
} from './errors.js'
import { ValidationService } from './validation-service.js'

// The analyst's actions (validation-runs design D9, D16; P2–P6): changing the inclusion of an occurrence, with the
// rule of cycle R, and resolving a finding by hand, over the doubles.
const ANALYST: Scope = { merchantIds: [1, 2] }
const VIEWER: Scope = { merchantIds: [1] }
const ANALYST_ID = 2
const NOW = new Date('2026-10-18T10:20:01.456Z')

let runs: InMemoryRunRepository
let service: ValidationService
let importId: string

beforeEach(async () => {
  const issues = await sampleInput('batch-issues')
  runs = new InMemoryRunRepository()
  importId = issues.importId
  runs.addImport({ importId, merchantId: 1, status: 'analyzed' })
  runs.describeImport(issues.imports.stored(importId))
  service = new ValidationService({ sources: issues.sources, runs, log: { info: vi.fn() }, now: () => NOW })
})

const current = (rowNo: number, defaultIncluded: boolean): Occurrence => ({
  sourceType: 'current_import',
  fileId: 'file-1',
  sheetId: 'sheet-RR',
  rowNo,
  statusId: 2,
  excludeAmount: false,
  defaultIncluded,
})

const previous: Occurrence = {
  sourceType: 'previous_batch',
  batchId: 'batch:ProviderB-Main:51:1',
  batchNo: 51,
  attemptNo: 1,
  accountId: 'b0000000-0000-4000-8000-000000000001',
  sheetId: null,
  rowNo: null,
  statusId: 2,
  excludeAmount: false,
  defaultIncluded: true,
}

const duplicate = (
  transactionId: bigint,
  cycle: 'E' | 'I' | 'R',
  scope: 'in_batch' | 'across_batches',
  occurrences: Occurrence[],
): Issue => ({
  issueType: 'duplicate',
  scope,
  blocking: false,
  transactionIdRaw: String(transactionId),
  transactionId,
  cycle,
  statusId: 2,
  occurrences,
})

/** A run with the given duplicates, stored straight in the double. */
async function storeRun(inBatch: Issue[], acrossBatches: Issue[]): Promise<void> {
  const issuesOf = (code: ValidationCode) =>
    code === 'duplicate_in_batch' ? inBatch : code === 'duplicate_across_batches' ? acrossBatches : []
  const report: ValidationReport = {
    results: ValidationCode.options.map((code) => {
      const issues = issuesOf(code)
      return { code, outcome: issues.length > 0 ? 'warning' : 'passed', issueCount: issues.length, issues }
    }),
    blocked: false,
    ranges: { APP: null, DEC: null, I: null, R: null },
    pendingInRangeCount: 0,
    undatedAdjustmentCount: 0,
    undatedCandidateCount: 0,
  }
  const ref = await runs.findImport(ANALYST, importId)
  await runs.saveRun(importId, ref!.updatedAt, ANALYST_ID, report, NOW)
}

const occurrencesOf = (transactionId: bigint) =>
  runs
    .runsOf(importId)
    .filter((r) => !r.isSuperseded)
    .flatMap((r) => r.issues)
    .find((i) => i.transactionId === transactionId)!.occurrences

async function caught<E>(promise: Promise<unknown>, type: new (...args: never[]) => E): Promise<E> {
  const error = await promise.catch((e: unknown) => e)
  expect(error).toBeInstanceOf(type)
  return error as E
}

describe('setInclusion on batch-issues', () => {
  let excludedId: string

  beforeEach(async () => {
    await service.run(ANALYST, ANALYST_ID, importId)
    const run = runs.runsOf(importId)[0]!
    const dup = run.issues.find((i) => i.issueType === 'duplicate' && i.scope === 'in_batch')!
    excludedId = dup.occurrences.find((o) => !o.defaultIncluded)!.occurrenceId
  })

  it('includes the excluded duplicate: 200 with the author, the history and the audit; the finding stays', async () => {
    const detail = await service.setInclusion(ANALYST, ANALYST_ID, excludedId, true)

    expect(ValidationIssueDetail.safeParse(detail).success).toBe(true)
    const changed = detail.occurrences.find((o) => o.occurrenceId === excludedId)!
    expect(changed).toMatchObject({
      includeInSettlement: true,
      defaultIncluded: false,
      changedBy: { userName: 'analyst' },
      changedAt: NOW.toISOString(),
    })
    expect(detail.resolutionStatus).toBe('persistent')
    expect(detail.history).toEqual([
      {
        at: NOW.toISOString(),
        user: { userId: ANALYST_ID, userName: 'analyst' },
        action: 'set_inclusion',
        occurrenceId: excludedId,
        from: false,
        to: true,
        note: null,
      },
    ])
    expect(runs.audit.find((e) => e.action === 'validation.occurrence.set_inclusion')).toMatchObject({
      entityType: 'ConflictOccurrence',
      entityId: excludedId,
      detail: { issueId: detail.issueId, runId: detail.runId, importId, from: false, to: true },
    })
  })

  it('the same value: 200 unchanged and nothing audited', async () => {
    const detail = await service.setInclusion(ANALYST, ANALYST_ID, excludedId, false)

    expect(detail.occurrences.find((o) => o.occurrenceId === excludedId)?.changedBy).toBeNull()
    expect(runs.audit).toEqual([])
  })

  it('a previous_batch occurrence: 409 occurrence_not_editable (P2)', async () => {
    const dup = runs
      .runsOf(importId)[0]!
      .issues.find((i) => i.scope === 'across_batches' && i.issueType === 'duplicate')!
    const historical = dup.occurrences.find((o) => o.sourceType === 'previous_batch')!

    const error = await caught(
      service.setInclusion(ANALYST, ANALYST_ID, historical.occurrenceId, false),
      OccurrenceNotEditableError,
    )

    expect(error.details).toEqual({ sourceType: 'previous_batch' })
  })

  it('in validated: 200 back in analyzed, the run kept and the review invalidated with the occurrence (P4, D16)', async () => {
    const runId = runs.runsOf(importId)[0]!.runId
    runs.markReviewed(importId, runId, ANALYST_ID, new Date('2026-10-18T10:10:00.000Z'))

    const detail = await service.setInclusion(ANALYST, ANALYST_ID, excludedId, true)
    const view = await service.getCurrentRun(VIEWER, importId)

    expect(detail.importStatus).toBe('analyzed')
    expect(view.run!.runId).toBe(runId)
    expect(view.run!.review).toBeNull()
    expect(view.lastInvalidatedReview).toMatchObject({
      runId,
      reason: 'inclusion_change',
      occurrenceId: excludedId,
      newRunId: null,
      reviewedBy: { userName: 'analyst' },
    })
  })

  it.each(['processed', 'cancelled'] as const)('in %s: 409 import_not_editable', async (status) => {
    runs.setStatus(importId, status)

    const error = await caught(service.setInclusion(ANALYST, ANALYST_ID, excludedId, true), ImportNotEditableError)

    expect(error.details).toEqual({ status })
  })

  it('an occurrence of a superseded run: 409 validation_run_superseded with both run ids', async () => {
    const oldRunId = runs.runsOf(importId)[0]!.runId
    const { run } = await service.run(ANALYST, ANALYST_ID, importId)

    const error = await caught(
      service.setInclusion(ANALYST, ANALYST_ID, excludedId, true),
      ValidationRunSupersededError,
    )

    expect(error.details).toEqual({ runId: oldRunId, currentRunId: run!.runId })
  })

  it('a new run inherits neither the inclusion nor the resolution, and starts with manualChangeCount = 0 (P6)', async () => {
    await service.setInclusion(ANALYST, ANALYST_ID, excludedId, true)
    const nra = runs.runsOf(importId)[0]!.issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    await service.resolveIssue(ANALYST, ANALYST_ID, nra.issueId, 'Verified in the gateway')

    const { run } = await service.run(ANALYST, ANALYST_ID, importId)

    expect(run!.manualChangeCount).toBe(0)
    const fresh = runs.runsOf(importId)[1]!
    expect(fresh.issues.every((i) => i.resolutionStatus === 'persistent')).toBe(true)
    expect(fresh.issues.flatMap((i) => i.occurrences).every((o) => o.includeInSettlement === o.defaultIncluded)).toBe(
      true,
    )
    const old = runs.runsOf(importId)[0]!
    expect(
      old.issues.flatMap((i) => i.occurrences).find((o) => o.occurrenceId === excludedId)?.includeInSettlement,
    ).toBe(true)
  })

  it('404 for an unknown occurrence and for one outside the scope', async () => {
    await caught(service.setInclusion(ANALYST, ANALYST_ID, '999999', true), NotFoundError)
    runs.setMerchant(importId, 2)
    const foreign = await caught(service.setInclusion(VIEWER, ANALYST_ID, excludedId, true), NotFoundError)
    expect(foreign.message).toBe('Conflict occurrence not found')
  })
})

describe('the rule of cycle R (P3)', () => {
  it('a second RR row of the same reserve: 409 reserve_already_included; after excluding the first, 200', async () => {
    await storeRun([duplicate(70n, 'R', 'in_batch', [current(2, true), current(3, false)])], [])
    const [first, second] = occurrencesOf(70n)

    const error = await caught(
      service.setInclusion(ANALYST, ANALYST_ID, second!.occurrenceId, true),
      OccurrenceNotIncludableError,
    )
    expect(error.details).toEqual({ reason: 'reserve_already_included' })
    expect(occurrencesOf(70n).map((o) => o.includeInSettlement)).toEqual([true, false])

    await service.setInclusion(ANALYST, ANALYST_ID, first!.occurrenceId, false)
    const detail = await service.setInclusion(ANALYST, ANALYST_ID, second!.occurrenceId, true)
    expect(detail.occurrences.map((o) => o.includeInSettlement)).toEqual([false, true])
  })

  it('a reserve already released in a previous batch: 409 reserve_already_released', async () => {
    await storeRun([], [duplicate(71n, 'R', 'across_batches', [current(4, false), previous])])
    const [row] = occurrencesOf(71n)

    const error = await caught(
      service.setInclusion(ANALYST, ANALYST_ID, row!.occurrenceId, true),
      OccurrenceNotIncludableError,
    )

    expect(error.details).toEqual({ reason: 'reserve_already_released' })
  })

  it('excluding a reserve is always accepted and leaves none included', async () => {
    await storeRun([duplicate(72n, 'R', 'in_batch', [current(2, true), current(3, false)])], [])
    const [first] = occurrencesOf(72n)

    const detail = await service.setInclusion(ANALYST, ANALYST_ID, first!.occurrenceId, false)

    expect(detail.occurrences.every((o) => !o.includeInSettlement)).toBe(true)
  })

  it('a 409 of the rule on a validated import leaves the review valid', async () => {
    await storeRun([duplicate(73n, 'R', 'in_batch', [current(2, true), current(3, false)])], [])
    const runId = runs.runsOf(importId).at(-1)!.runId
    runs.markReviewed(importId, runId, ANALYST_ID, new Date('2026-10-18T10:10:00.000Z'))
    const [, second] = occurrencesOf(73n)

    await caught(service.setInclusion(ANALYST, ANALYST_ID, second!.occurrenceId, true), OccurrenceNotIncludableError)

    const view = await service.getCurrentRun(VIEWER, importId)
    expect(view.importStatus).toBe('validated')
    expect(view.run!.review).not.toBeNull()
    expect(view.lastInvalidatedReview).toBeNull()
  })

  it('includable is false where the rule blocks, editable stays true', async () => {
    await storeRun(
      [duplicate(74n, 'R', 'in_batch', [current(2, true), current(3, false)])],
      [duplicate(75n, 'R', 'across_batches', [current(4, false), previous])],
    )
    const inBatch = runs
      .runsOf(importId)
      .at(-1)!
      .issues.find((i) => i.transactionId === 74n)!
    const across = runs
      .runsOf(importId)
      .at(-1)!
      .issues.find((i) => i.transactionId === 75n)!

    const a = await service.getIssue(ANALYST, true, inBatch.issueId)
    const b = await service.getIssue(ANALYST, true, across.issueId)

    expect(a.occurrences.map((o) => [o.editable, o.includable])).toEqual([
      [true, true],
      [true, false],
    ])
    expect(b.occurrences.map((o) => [o.sourceType, o.editable, o.includable])).toEqual([
      ['current_import', true, false],
      ['previous_batch', false, false],
    ])
  })

  it('duplicates of I and E, in the batch and against a previous batch, are included by hand: 200 and audited', async () => {
    await storeRun(
      [duplicate(80n, 'I', 'in_batch', [current(2, true), current(3, false)])],
      [
        duplicate(81n, 'E', 'across_batches', [current(4, false), previous]),
        duplicate(82n, 'I', 'across_batches', [current(5, false), previous]),
      ],
    )

    for (const id of [80n, 81n, 82n]) {
      const target = occurrencesOf(id).find((o) => o.sourceType === 'current_import' && !o.includeInSettlement)!
      const detail = await service.setInclusion(ANALYST, ANALYST_ID, target.occurrenceId, true)
      expect(detail.occurrences.find((o) => o.occurrenceId === target.occurrenceId)?.includeInSettlement).toBe(true)
    }
    expect(runs.audit.filter((e) => e.action === 'validation.occurrence.set_inclusion')).toHaveLength(3)
  })
})

describe('resolveIssue', () => {
  let nraId: number

  beforeEach(async () => {
    await service.run(ANALYST, ANALYST_ID, importId)
    nraId = runs.runsOf(importId)[0]!.issues.find((i) => i.issueType === 'non_recorded_adjustment')!.issueId
  })

  it('a non_recorded_adjustment: 200 resolved with author, date and note, audited, inclusions untouched', async () => {
    const before = runs.runsOf(importId)[0]!.issues.flatMap((i) => i.occurrences.map((o) => o.includeInSettlement))

    const detail = await service.resolveIssue(ANALYST, ANALYST_ID, nraId, 'Verified in the gateway')

    expect(detail).toMatchObject({
      resolutionStatus: 'resolved',
      resolvedBy: { userName: 'analyst' },
      resolvedAt: NOW.toISOString(),
      resolutionNote: 'Verified in the gateway',
      resolvable: false,
    })
    expect(detail.history.map((h) => [h.action, h.note])).toEqual([['resolve', 'Verified in the gateway']])
    expect(runs.audit.find((e) => e.action === 'validation.issue.resolve')).toMatchObject({
      entityType: 'ValidationIssue',
      entityId: String(nraId),
      detail: { note: 'Verified in the gateway' },
    })
    expect(runs.runsOf(importId)[0]!.issues.flatMap((i) => i.occurrences.map((o) => o.includeInSettlement))).toEqual(
      before,
    )
  })

  it('a status_mismatch is resolvable too', async () => {
    const mismatch = runs.runsOf(importId)[0]!.issues.find((i) => i.issueType === 'status_mismatch')!

    await expect(service.resolveIssue(ANALYST, ANALYST_ID, mismatch.issueId, 'Checked')).resolves.toMatchObject({
      resolutionStatus: 'resolved',
    })
  })

  it('twice: 409 issue_already_resolved with the first resolution', async () => {
    await service.resolveIssue(ANALYST, ANALYST_ID, nraId, 'Verified in the gateway')

    const error = await caught(service.resolveIssue(ANALYST, ANALYST_ID, nraId, 'Again'), IssueAlreadyResolvedError)

    expect(error.details).toEqual({
      resolvedAt: NOW.toISOString(),
      resolvedBy: { userId: ANALYST_ID, userName: 'analyst' },
    })
  })

  it.each(['duplicate', 'collision', 'missing'] as const)('a %s: 422 issue_not_resolvable', async (issueType) => {
    const issue = runs.runsOf(importId)[0]!.issues.find((i) => i.issueType === issueType)!

    const error = await caught(service.resolveIssue(ANALYST, ANALYST_ID, issue.issueId, 'No'), IssueNotResolvableError)

    expect(error.details).toEqual({ issueType })
  })

  it.each(['validated', 'cancelled'] as const)('in %s: 200 (P5)', async (status) => {
    runs.setStatus(importId, status)

    await expect(service.resolveIssue(ANALYST, ANALYST_ID, nraId, 'Verified')).resolves.toMatchObject({
      resolutionStatus: 'resolved',
    })
  })

  it('a finding of a superseded run: 409 validation_run_superseded', async () => {
    await service.run(ANALYST, ANALYST_ID, importId)

    await caught(service.resolveIssue(ANALYST, ANALYST_ID, nraId, 'Late'), ValidationRunSupersededError)
  })
})
