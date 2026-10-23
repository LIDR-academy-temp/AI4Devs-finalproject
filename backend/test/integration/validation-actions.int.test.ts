import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ValidationIssueDetail, ValidationIssuesPage, ValidationRunView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { buildXlsx } from '../../src/modules/imports/infrastructure/xlsx/test-support.js'
import type { ValidationRunRepository } from '../../src/modules/validation/application/ports.js'
import { ValidationService } from '../../src/modules/validation/application/validation-service.js'
import { PrismaValidationRunRepository } from '../../src/modules/validation/infrastructure/prisma-validation-run-repository.js'
import { PrismaValidationSources } from '../../src/modules/validation/infrastructure/prisma-validation-sources.js'
import { createTestApp } from './helpers.js'
import { ImportFlow } from './import-flow.js'

// The analyst's actions against SQL Server (validation-runs design D9, D16; P2–P6): inclusion changes with the rule of
// cycle R, manual resolution, audit inside the transaction, and their interplay with runs and reviews. RR fixtures are
// workbooks built in the test over seeded transactions; every import is removed in afterAll.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-actions-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
})

afterAll(async () => {
  if (ctx) {
    await flow.close()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

const ANALYST_SCOPE = { merchantIds: [1, 2] }

async function run(importId: string) {
  const res = await flow.call('POST', `/imports/${importId}/validations`)
  expect(res.statusCode, res.body).toBe(201)
  return ValidationRunView.parse(res.json())
}

async function issues(importId: string, query: string) {
  const res = await flow.call('GET', `/imports/${importId}/validation-issues?${query}`)
  expect(res.statusCode, res.body).toBe(200)
  return ValidationIssuesPage.parse(res.json())
}

async function detail(issueId: number) {
  const res = await flow.call('GET', `/validation-issues/${issueId}`)
  expect(res.statusCode, res.body).toBe(200)
  return ValidationIssueDetail.parse(res.json())
}

const include = (occurrenceId: string, includeInSettlement: boolean) =>
  flow.call('PATCH', `/conflict-occurrences/${occurrenceId}`, { includeInSettlement })

const resolve = (issueId: number, note: string) =>
  flow.call('PATCH', `/validation-issues/${issueId}`, { resolutionStatus: 'resolved', note })

/** Puts the import in validated with the review audit row of the run, as POST review leaves it (group 8). */
async function markReviewed(importId: string, runId: number, at = new Date(Date.now() - 60_000)) {
  await ctx.prisma.import.update({ where: { importId }, data: { status: 'validated' } })
  await ctx.prisma.auditLog.create({
    data: {
      userId: flow.userIds.analyst,
      action: 'import.review',
      entityType: 'Import',
      entityId: importId,
      detailJson: JSON.stringify({ runId, issueCounts: {}, changedOccurrences: 0 }),
      createdAt: at,
    },
  })
}

/** An import of ProviderB-Main with an RR sheet holding the given ids, analyzed. */
async function rrImport(ids: string[]) {
  const bytes = buildXlsx({
    sheets: [{ name: 'RR', rows: [['ID', 'Amount', 'Currency'], ...ids.map((id) => [id, { v: '1.50' }, 'USD'])] }],
  })
  return flow.analyzed(flow.accountIds['ProviderB-Main'] as string, [{ name: 'rr-fixture.xlsx', bytes }])
}

/** A Successful ProviderB transaction of a primary channel without any R movement (its reserve was never released). */
async function unreleasedReserveId(): Promise<string> {
  const [found] = await ctx.prisma.$queryRaw<{ sourceTransactionId: string }[]>`
    SELECT TOP 1 t.[sourceTransactionId] FROM [Transaction] t
    WHERE t.[providerId] = 102 AND t.[channelId] = 1011 AND t.[statusId] = 2
      AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId] AND st.[cycle] = 'R')
    ORDER BY t.[transactionId]`
  return found!.sourceTransactionId
}

/** A ProviderB transaction whose reserve was released (R movement) in a current batch. */
async function releasedReserveId(): Promise<string> {
  const [found] = await ctx.prisma.$queryRaw<{ sourceTransactionId: string }[]>`
    SELECT TOP 1 t.[sourceTransactionId] FROM [SettlementTransaction] st
    JOIN [SettlementBatch] b ON b.[batchId] = st.[batchId]
    JOIN [Transaction] t ON t.[transactionId] = st.[transactionId]
    WHERE st.[cycle] = 'R' AND b.[status] <> 'undone' AND t.[providerId] = 102 AND t.[channelId] IN (1011, 1012)
    ORDER BY st.[settlementTxnId]`
  return found!.sourceTransactionId
}

describe('inclusion and resolution on batch-issues', () => {
  let importId: string
  let dupIssueId: number
  let excludedId: string
  let mismatchIssueId: number

  beforeAll(async () => {
    importId = (await flow.analyzedSample('batch-issues')).importId
    await run(importId)
    dupIssueId = (await issues(importId, 'type=duplicate&scope=in_batch')).items[0]!.issueId
    mismatchIssueId = (await issues(importId, 'type=status_mismatch')).items[0]!.issueId
    excludedId = (await detail(dupIssueId)).occurrences.find((o) => !o.defaultIncluded)!.occurrenceId
  })

  it('includes the excluded duplicate: 200, author and date, AuditLog set_inclusion with from/to, finding persistent', async () => {
    const res = await include(excludedId, true)

    expect(res.statusCode, res.body).toBe(200)
    const body = ValidationIssueDetail.parse(res.json())
    expect(body.occurrences.find((o) => o.occurrenceId === excludedId)).toMatchObject({
      includeInSettlement: true,
      defaultIncluded: false,
      changedBy: { userName: 'analyst' },
      changedAt: expect.any(String),
    })
    expect(body.resolutionStatus).toBe('persistent')
    expect(body.history.map((h) => [h.action, h.from, h.to])).toEqual([['set_inclusion', false, true]])
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({
      where: { action: 'validation.occurrence.set_inclusion', entityId: excludedId },
    })
    expect(audit.entityType).toBe('ConflictOccurrence')
    expect(JSON.parse(audit.detailJson ?? '{}')).toMatchObject({
      from: false,
      to: true,
      issueId: dupIssueId,
      runId: body.runId,
      importId,
    })
  })

  it('the same value again: 200 and no new audit row', async () => {
    const before = await ctx.prisma.auditLog.count({ where: { entityId: excludedId } })

    const res = await include(excludedId, true)

    expect(res.statusCode).toBe(200)
    expect(await ctx.prisma.auditLog.count({ where: { entityId: excludedId } })).toBe(before)
  })

  it('a previous_batch occurrence: 409 occurrence_not_editable', async () => {
    const [across] = (await issues(importId, 'type=duplicate&scope=across_batches')).items
    const historical = (await detail(across!.issueId)).occurrences.find((o) => o.sourceType === 'previous_batch')!

    const res = await include(historical.occurrenceId, false)

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ code: 'occurrence_not_editable', details: { sourceType: 'previous_batch' } })
  })

  it('resolves the non_recorded_adjustment of 281520820250015: 200, AuditLog resolve with the note; twice → 409; a duplicate → 422', async () => {
    const nra = (await issues(importId, 'type=non_recorded_adjustment')).items.find(
      (i) => i.transactionIdRaw === '281520820250015',
    )!

    const res = await resolve(nra.issueId, 'Verified in the gateway')

    expect(res.statusCode, res.body).toBe(200)
    expect(res.json()).toMatchObject({
      resolutionStatus: 'resolved',
      resolvedBy: { userName: 'analyst' },
      resolutionNote: 'Verified in the gateway',
    })
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({
      where: { action: 'validation.issue.resolve', entityId: String(nra.issueId) },
    })
    expect(audit.entityType).toBe('ValidationIssue')
    expect(JSON.parse(audit.detailJson ?? '{}')).toMatchObject({ note: 'Verified in the gateway' })

    const again = await resolve(nra.issueId, 'Again')
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({
      code: 'issue_already_resolved',
      details: { resolvedBy: { userName: 'analyst' } },
    })
    const dup = await resolve(dupIssueId, 'No')
    expect(dup.statusCode).toBe(422)
    expect(dup.json()).toMatchObject({ code: 'issue_not_resolvable', details: { issueType: 'duplicate' } })
  })

  it('manualChangeCount counts the inclusion and the resolution; a new run starts at 0 and inherits nothing (P6)', async () => {
    const before = ValidationRunView.parse((await flow.call('GET', `/imports/${importId}/validations`)).json())
    expect(before.run!.manualChangeCount).toBe(2)

    const after = await run(importId)

    expect(after.run!.manualChangeCount).toBe(0)
    const fresh = (await issues(importId, 'type=duplicate&scope=in_batch')).items[0]!
    expect(fresh.includedCount).toBe(fresh.includedByDefaultCount)
    expect((await issues(importId, 'type=non_recorded_adjustment&status=resolved')).total).toBe(0)
    // The superseded run keeps the change.
    expect((await detail(dupIssueId)).occurrences.find((o) => o.occurrenceId === excludedId)?.includeInSettlement).toBe(
      true,
    )
  })

  it('an occurrence or a finding of the superseded run: 409 validation_run_superseded', async () => {
    const patch = await include(excludedId, false)
    const resolved = await resolve(mismatchIssueId, 'Late')

    expect(patch.statusCode).toBe(409)
    expect(patch.json()).toMatchObject({
      code: 'validation_run_superseded',
      details: { currentRunId: expect.any(Number) },
    })
    expect(resolved.statusCode).toBe(409)
    expect(resolved.json().code).toBe('validation_run_superseded')
  })
})

describe('inclusion on a validated import (P4, D16)', () => {
  it('200 back in analyzed, the run kept, the review invalidated with inclusion_change and the occurrence', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    const view = await run(importId)
    await markReviewed(importId, view.run!.runId)
    const dup = await detail((await issues(importId, 'type=duplicate&scope=in_batch')).items[0]!.issueId)
    const excluded = dup.occurrences.find((o) => !o.defaultIncluded)!

    const res = await include(excluded.occurrenceId, true)

    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().importStatus).toBe('analyzed')
    const after = ValidationRunView.parse((await flow.call('GET', `/imports/${importId}/validations`)).json())
    expect(after.run!.runId).toBe(view.run!.runId)
    expect(after.run!.review).toBeNull()
    expect(after.lastInvalidatedReview).toMatchObject({
      runId: view.run!.runId,
      reason: 'inclusion_change',
      occurrenceId: excluded.occurrenceId,
      reviewedBy: { userName: 'analyst' },
    })
  })

  it('an inclusion confirmed while a run is computed: the run gets 409 import_changed and the change stays', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    await run(importId)
    const dup = await detail((await issues(importId, 'type=duplicate&scope=in_batch')).items[0]!.issueId)
    const excluded = dup.occurrences.find((o) => !o.defaultIncluded)!
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let loaded: () => void = () => {}
    const arrived = new Promise<void>((resolve) => {
      loaded = resolve
    })
    const repo = new PrismaValidationRunRepository(ctx.prisma)
    const paused: ValidationRunRepository = Object.create(repo)
    paused.saveRun = async (...args: Parameters<ValidationRunRepository['saveRun']>) => {
      loaded()
      await gate
      return repo.saveRun(...args)
    }
    const service = new ValidationService({
      sources: new PrismaValidationSources(ctx.prisma),
      runs: paused,
      log: { info: () => {} },
    })

    const pending = service.run(ANALYST_SCOPE, flow.userIds.analyst, importId).catch((e: unknown) => e)
    await arrived
    expect((await include(excluded.occurrenceId, true)).statusCode).toBe(200)
    release()

    expect(await pending).toMatchObject({ code: 'import_changed' })
    expect((await detail(dup.issueId)).occurrences.find((o) => o.occurrenceId === excluded.occurrenceId)).toMatchObject(
      { includeInSettlement: true },
    )
  })
})

describe('the audit is part of the action (D7)', () => {
  it('when the audit row cannot be written, neither the inclusion nor the resolution stays', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    await run(importId)
    const dup = await detail((await issues(importId, 'type=duplicate&scope=in_batch')).items[0]!.issueId)
    const excluded = dup.occurrences.find((o) => !o.defaultIncluded)!
    const nra = (await issues(importId, 'type=non_recorded_adjustment')).items[0]!
    const failingAudit = ctx.prisma.$extends({
      query: {
        auditLog: {
          async create() {
            throw new Error('audit unavailable')
          },
        },
      },
    }) as unknown as PrismaClient
    const repo = new PrismaValidationRunRepository(failingAudit)

    await expect(repo.setInclusion(excluded.occurrenceId, true, flow.userIds.analyst, new Date())).rejects.toThrow(
      'audit unavailable',
    )
    await expect(repo.resolveIssue(nra.issueId, 'Verified', flow.userIds.analyst, new Date())).rejects.toThrow(
      'audit unavailable',
    )

    expect((await detail(dup.issueId)).occurrences.find((o) => o.occurrenceId === excluded.occurrenceId)).toMatchObject(
      { includeInSettlement: false, changedBy: null },
    )
    expect((await detail(nra.issueId)).resolutionStatus).toBe('persistent')
  })
})

describe('the rule of cycle R (P3)', () => {
  it('a second RR row of the same reserve: 409 reserve_already_included; after excluding the first, 200', async () => {
    const id = await unreleasedReserveId()
    const { importId } = await rrImport([id, id])
    await run(importId)
    const [dup] = (await issues(importId, 'type=duplicate&scope=in_batch&cycle=R')).items
    const [first, second] = (await detail(dup!.issueId)).occurrences

    const refused = await include(second!.occurrenceId, true)
    expect(refused.statusCode).toBe(409)
    expect(refused.json()).toMatchObject({
      code: 'occurrence_not_includable',
      details: { reason: 'reserve_already_included' },
    })

    expect((await include(first!.occurrenceId, false)).statusCode).toBe(200)
    const accepted = await include(second!.occurrenceId, true)
    expect(accepted.statusCode).toBe(200)
    expect(ValidationIssueDetail.parse(accepted.json()).occurrences.map((o) => o.includeInSettlement)).toEqual([
      false,
      true,
    ])
  })

  it('a reserve already released in a current batch: 409 reserve_already_released', async () => {
    const { importId } = await rrImport([await releasedReserveId()])
    await run(importId)
    const [dup] = (await issues(importId, 'type=duplicate&scope=across_batches&cycle=R')).items
    const row = (await detail(dup!.issueId)).occurrences.find((o) => o.sourceType === 'current_import')!

    const res = await include(row.occurrenceId, true)

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ details: { reason: 'reserve_already_released' } })
  })

  // Only watches the final invariant (one included occurrence); whether both requests really overlap depends on timing.
  // The rule inside the transaction is protected by the deterministic variant below: "an inclusion paused right
  // before its guard while another one of the same reserve commits…".
  it('two simultaneous inclusions of different occurrences of the same reserve leave exactly one included', async () => {
    const id = await unreleasedReserveId()
    const { importId } = await rrImport([id, id, id])
    await run(importId)
    const [dup] = (await issues(importId, 'type=duplicate&scope=in_batch&cycle=R')).items
    const [first, second, third] = (await detail(dup!.issueId)).occurrences
    expect((await include(first!.occurrenceId, false)).statusCode).toBe(200)

    const results = await Promise.all([include(second!.occurrenceId, true), include(third!.occurrenceId, true)])

    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409])
    expect((await detail(dup!.issueId)).occurrences.filter((o) => o.includeInSettlement)).toHaveLength(1)
  })

  it('an inclusion paused right before its guard while another one of the same reserve commits gets 409 reserve_already_included', async () => {
    const id = await unreleasedReserveId()
    const { importId } = await rrImport([id, id])
    await run(importId)
    const [dup] = (await issues(importId, 'type=duplicate&scope=in_batch&cycle=R')).items
    const [first, second] = (await detail(dup!.issueId)).occurrences
    // Neither occurrence is included: both inclusions are allowed on their own.
    expect((await include(first!.occurrenceId, false)).statusCode).toBe(200)
    let release: () => void = () => {}
    const released = new Promise<void>((resolve) => {
      release = resolve
    })
    let arrive: () => void = () => {}
    const arrived = new Promise<void>((resolve) => {
      arrive = resolve
    })
    // The first inclusion pauses inside its transaction right before the guard (beforeClaim), holding no lock. A rule
    // decided before the guard would already have seen nothing included; the correct one reads after the guard.
    const paused = new ValidationService({
      sources: new PrismaValidationSources(ctx.prisma),
      runs: new PrismaValidationRunRepository(ctx.prisma, {
        beforeClaim: async (operation) => {
          if (operation !== 'setInclusion') return
          arrive()
          await released
        },
      }),
      log: { info: () => {} },
    })
    const pending = paused
      .setInclusion(ANALYST_SCOPE, flow.userIds.analyst, first!.occurrenceId, true)
      .catch((e: unknown) => e)
    await arrived

    expect((await include(second!.occurrenceId, true)).statusCode).toBe(200)
    release()

    expect(await pending).toMatchObject({
      code: 'occurrence_not_includable',
      details: { reason: 'reserve_already_included' },
    })
    const included = (await detail(dup!.issueId)).occurrences.filter((o) => o.includeInSettlement)
    expect(included.map((o) => o.occurrenceId)).toEqual([second!.occurrenceId])
  })

  it('a 409 of the rule on a validated import leaves the import validated and its review valid', async () => {
    const id = await unreleasedReserveId()
    const { importId } = await rrImport([id, id])
    const view = await run(importId)
    await markReviewed(importId, view.run!.runId)
    const [dup] = (await issues(importId, 'type=duplicate&scope=in_batch&cycle=R')).items
    const [, second] = (await detail(dup!.issueId)).occurrences

    expect((await include(second!.occurrenceId, true)).statusCode).toBe(409)

    const after = ValidationRunView.parse((await flow.call('GET', `/imports/${importId}/validations`)).json())
    expect(after.importStatus).toBe('validated')
    expect(after.run!.review).not.toBeNull()
    expect(after.lastInvalidatedReview).toBeNull()
  })
})
