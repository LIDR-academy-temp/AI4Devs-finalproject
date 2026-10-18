import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ValidationIssueDetail, ValidationIssuesPage, ValidationRunView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ValidationRunRepository } from '../../src/modules/validation/application/ports.js'
import { ValidationService } from '../../src/modules/validation/application/validation-service.js'
import type { ValidationReport } from '../../src/modules/validation/domain/types.js'
import { PrismaValidationRunRepository } from '../../src/modules/validation/infrastructure/prisma-validation-run-repository.js'
import { PrismaValidationSources } from '../../src/modules/validation/infrastructure/prisma-validation-sources.js'
import { createTestApp } from './helpers.js'
import { expectedOf, ImportFlow } from './import-flow.js'

// Runs persisted in SQL Server (validation-runs design D4–D6, D16): what a run stores, one current run per import
// also under concurrent requests, and the invalidation of a review on re-run. Imports are uploaded through the API and
// removed in afterAll with everything they leave behind.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-runs-int-'))
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

async function runValidations(importId: string) {
  const res = await flow.call('POST', `/imports/${importId}/validations`)
  expect(res.statusCode, res.body).toBe(201)
  return ValidationRunView.parse(res.json())
}

const currentRuns = (importId: string) =>
  ctx.prisma.validationRun.findMany({ where: { importId, isSuperseded: false }, select: { runId: true } })

/** A service over the real adapters whose repository waits in saveRun until `release` resolves. */
function serviceWithPausedSave(release: Promise<void>, arrived: () => void) {
  const repo = new PrismaValidationRunRepository(ctx.prisma)
  const paused: ValidationRunRepository = Object.create(repo)
  paused.saveRun = async (...args: Parameters<ValidationRunRepository['saveRun']>) => {
    arrived()
    await release
    return repo.saveRun(...args)
  }
  return new ValidationService({
    sources: new PrismaValidationSources(ctx.prisma),
    runs: paused,
    log: { info: () => {} },
  })
}

describe('a run of batch-issues', () => {
  let importId: string
  let view: ValidationRunView

  beforeAll(async () => {
    importId = (await flow.analyzedSample('batch-issues')).importId
    view = await runValidations(importId)
  })

  it('answers the eight results with the counts of expected.json and stores 23 persistent findings', async () => {
    const expected = expectedOf('batch-issues') as { validations: Record<string, unknown> }
    const counts = Object.fromEntries(view.run!.results.map((r) => [r.validationCode, r.issueCount]))
    const total = (v: unknown) =>
      typeof v === 'number' ? v : Object.values(v as Record<string, number>).reduce((a, b) => a + b, 0)
    expect(counts).toEqual(Object.fromEntries(Object.entries(expected.validations).map(([k, v]) => [k, total(v)])))
    expect(view.run!.blocked).toBe(false)

    const run = await ctx.prisma.validationRun.findUniqueOrThrow({
      where: { runId: view.run!.runId },
      include: { results: { include: { issues: true } } },
    })
    expect(run.isSuperseded).toBe(false)
    expect(run.results).toHaveLength(8)
    const issues = run.results.flatMap((r) => r.issues)
    expect(issues).toHaveLength(23)
    expect(issues.every((i) => i.resolutionStatus === 'persistent')).toBe(true)
  })

  it('keeps the range of each missing finding, the gateway status and the source row in detailJson', async () => {
    const issues = await ctx.prisma.validationIssue.findMany({ where: { result: { runId: view.run!.runId } } })
    const missing = issues.filter((i) => i.issueType === 'missing')
    const ranges = missing.map((i) => JSON.parse(i.detailJson ?? '{}').missingRange)
    expect(ranges.filter((r) => r === 'DEC')).toHaveLength(10)
    expect(ranges.filter((r) => r === 'APP')).toHaveLength(3)
    expect(ranges.filter((r) => r === 'R')).toHaveLength(3)

    const nra = issues.find((i) => i.issueType === 'non_recorded_adjustment')!
    expect(nra.transactionIdRaw).toBe('281520820250015')
    const detail = JSON.parse(nra.detailJson ?? '{}')
    expect(detail.gatewayStatusId).toBe(2)
    expect(detail.source).toMatchObject({
      fileId: expect.any(String),
      sheetId: expect.any(String),
      rowNo: expect.any(Number),
    })
  })

  it('stores every occurrence with includeInSettlement = defaultIncluded and no change author', async () => {
    const occurrences = await ctx.prisma.conflictOccurrence.findMany({
      where: { issue: { result: { runId: view.run!.runId } } },
      include: { issue: { select: { transactionIdRaw: true, issueType: true, scope: true } } },
    })
    expect(occurrences.every((o) => o.includeInSettlement === o.defaultIncluded && o.changedByUserId === null)).toBe(
      true,
    )
    const duplicate = occurrences.filter((o) => o.issue.issueType === 'duplicate' && o.issue.scope === 'in_batch')
    expect(duplicate.map((o) => o.defaultIncluded).sort()).toEqual([false, true])
    expect(duplicate.every((o) => o.issue.transactionIdRaw === '441706751475644')).toBe(true)
    const historical = occurrences.find((o) => o.sourceType === 'previous_batch')!
    expect(historical.batchId).not.toBeNull()
  })

  it('a second run supersedes the first, which keeps its results, findings and occurrences', async () => {
    const second = await runValidations(importId)

    const first = await ctx.prisma.validationRun.findUniqueOrThrow({
      where: { runId: view.run!.runId },
      include: { results: { include: { issues: { include: { occurrences: true } } } } },
    })
    expect(first.isSuperseded).toBe(true)
    expect(first.results.flatMap((r) => r.issues)).toHaveLength(23)
    expect(await currentRuns(importId)).toEqual([{ runId: second.run!.runId }])
    view = second
  })

  it('GET validations returns the current run', async () => {
    const res = await flow.call('GET', `/imports/${importId}/validations`, undefined, 'viewer')

    expect(res.statusCode).toBe(200)
    expect(ValidationRunView.parse(res.json()).run!.runId).toBe(view.run!.runId)
  })
})

describe('an occurrence whose status could not be resolved', () => {
  it('is stored with statusId NULL and includeInSettlement = true', async () => {
    const detail = await flow.analyzedSample('batch-clean')
    const row = await ctx.prisma.importRow.findFirstOrThrow({
      where: { sheet: { file: { importId: detail.importId } }, matchResult: 'matched', cycle: 'E' },
      include: { sheet: true },
    })
    const imported = await ctx.prisma.import.findUniqueOrThrow({ where: { importId: detail.importId } })
    const report: ValidationReport = {
      results: [
        'provider_mismatch',
        'non_recorded_adjustment',
        'duplicate_in_batch',
        'status_collision_in_batch',
        'duplicate_across_batches',
        'status_collision_across_batches',
        'missing_previous_to_batch',
        'missing_in_range',
      ].map((code) => ({ code: code as never, outcome: 'passed' as const, issueCount: 0, issues: [] })),
      blocked: false,
      ranges: { APP: null, DEC: null, I: null, R: null },
      pendingInRangeCount: 0,
      undatedAdjustmentCount: 1,
      undatedCandidateCount: 1,
    }
    report.results[3] = {
      code: 'status_collision_in_batch',
      outcome: 'warning',
      issueCount: 1,
      issues: [
        {
          issueType: 'collision',
          scope: 'in_batch',
          blocking: false,
          transactionIdRaw: row.transactionIdRaw,
          transactionId: row.transactionId,
          cycle: 'E',
          statusId: 2,
          occurrences: [
            {
              sourceType: 'current_import',
              fileId: row.sheet.fileId,
              sheetId: row.sheetId,
              rowNo: row.rowNo,
              statusId: 2,
              excludeAmount: false,
              defaultIncluded: true,
            },
            {
              sourceType: 'current_import',
              fileId: row.sheet.fileId,
              sheetId: row.sheetId,
              rowNo: row.rowNo,
              statusId: null,
              excludeAmount: false,
              defaultIncluded: true,
            },
          ],
        },
      ],
    }

    const saved = await new PrismaValidationRunRepository(ctx.prisma).saveRun(
      detail.importId,
      imported.updatedAt,
      flow.userIds.analyst,
      report,
      new Date(),
    )

    const occurrences = await ctx.prisma.conflictOccurrence.findMany({
      where: { issue: { result: { runId: saved.runId } } },
      orderBy: { occurrenceId: 'asc' },
    })
    expect(occurrences.map((o) => [o.statusId, o.includeInSettlement])).toEqual([
      [2, true],
      [null, true],
    ])
    const run = await ctx.prisma.validationRun.findUniqueOrThrow({ where: { runId: saved.runId } })
    expect([run.undatedAdjustmentCount, run.undatedCandidateCount]).toEqual([1, 1])
  })
})

describe('one current run per import under concurrency', () => {
  it('two runs computed on the same version: one is stored, the other gets 409 import_changed', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    let arrivals = 0
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const bothArrived = () => {
      if (++arrivals === 2) release()
    }
    const a = serviceWithPausedSave(gate, bothArrived)
    const b = serviceWithPausedSave(gate, bothArrived)

    const results = await Promise.allSettled([
      a.run(ANALYST_SCOPE, flow.userIds.analyst, importId),
      b.run(ANALYST_SCOPE, flow.userIds.analyst, importId),
    ])

    const codes = results.map((r) => (r.status === 'fulfilled' ? 'stored' : (r.reason as { code: string }).code))
    expect(codes.sort()).toEqual(['import_changed', 'stored'])
    expect(await currentRuns(importId)).toHaveLength(1)
  })

  it('two POST validations at once leave exactly one current run', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')

    const [one, two] = await Promise.all([
      flow.call('POST', `/imports/${importId}/validations`),
      flow.call('POST', `/imports/${importId}/validations`),
    ])

    expect([one.statusCode, two.statusCode]).toContain(201)
    for (const res of [one, two]) {
      expect([201, 409]).toContain(res.statusCode)
      if (res.statusCode === 409) expect(res.json().code).toBe('import_changed')
    }
    expect(await currentRuns(importId)).toHaveLength(1)
  })

  it('a write confirmed on the import while a run is computed: the run gets 409 import_changed', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let arrived: () => void = () => {}
    const loaded = new Promise<void>((resolve) => {
      arrived = resolve
    })
    const service = serviceWithPausedSave(gate, arrived)

    const pending = service.run(ANALYST_SCOPE, flow.userIds.analyst, importId).catch((e: unknown) => e)
    await loaded
    await ctx.prisma.import.update({ where: { importId }, data: { updatedAt: new Date(Date.now() + 1_000) } })
    release()

    expect(await pending).toMatchObject({ code: 'import_changed', details: { status: 'analyzed' } })
    expect(await currentRuns(importId)).toHaveLength(0)
  })
})

describe('re-running a validated import (P1, D16)', () => {
  it('201 back in analyzed, the old run superseded and the review invalidated with the reviewer copied', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    const first = await runValidations(importId)
    const reviewedAt = new Date('2026-10-18T10:02:11.000Z')
    // The review itself is group 8: here the import is put in validated with its audit row by hand.
    await ctx.prisma.import.update({ where: { importId }, data: { status: 'validated' } })
    await ctx.prisma.auditLog.create({
      data: {
        userId: flow.userIds.analyst,
        action: 'import.review',
        entityType: 'Import',
        entityId: importId,
        detailJson: JSON.stringify({ runId: first.run!.runId, issueCounts: {}, changedOccurrences: 0 }),
        createdAt: reviewedAt,
      },
    })

    const second = await runValidations(importId)

    expect(second.importStatus).toBe('analyzed')
    expect(second.run!.review).toBeNull()
    expect(second.lastInvalidatedReview).toMatchObject({
      runId: first.run!.runId,
      reviewedBy: { userName: 'analyst' },
      reviewedAt: reviewedAt.toISOString(),
      invalidatedBy: { userName: 'analyst' },
      reason: 'rerun',
      newRunId: second.run!.runId,
      occurrenceId: null,
    })
    const invalidation = await ctx.prisma.auditLog.findFirstOrThrow({
      where: { action: 'import.review.invalidate', entityId: importId },
    })
    expect(JSON.parse(invalidation.detailJson ?? '{}')).toMatchObject({
      runId: first.run!.runId,
      reviewedByUserId: flow.userIds.analyst,
      reason: 'rerun',
      newRunId: second.run!.runId,
    })
    expect((await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })).status).toBe('analyzed')
  })

  it('re-running an analyzed import audits no invalidation', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    await runValidations(importId)
    await runValidations(importId)

    expect(await ctx.prisma.auditLog.count({ where: { action: 'import.review.invalidate', entityId: importId } })).toBe(
      0,
    )
  })
})

async function issues(importId: string, query: string) {
  const res = await flow.call('GET', `/imports/${importId}/validation-issues?${query}`, undefined, 'viewer')
  expect(res.statusCode, res.body).toBe(200)
  return ValidationIssuesPage.parse(res.json())
}

async function issueDetail(issueId: number) {
  const res = await flow.call('GET', `/validation-issues/${issueId}`, undefined, 'viewer')
  expect(res.statusCode, res.body).toBe(200)
  return ValidationIssueDetail.parse(res.json())
}

describe('findings of batch-issues (D8)', () => {
  let importId: string

  beforeAll(async () => {
    importId = (await flow.analyzedSample('batch-issues')).importId
    await runValidations(importId)
  })

  it('?type=duplicate&scope=in_batch: one finding with 2 occurrences, 1 included by default', async () => {
    const page = await issues(importId, 'type=duplicate&scope=in_batch')

    expect(page.total).toBe(1)
    expect(page.items[0]).toMatchObject({
      transactionIdRaw: '441706751475644',
      occurrenceCount: 2,
      includedByDefaultCount: 1,
      includedCount: 1,
    })
  })

  it('?type=missing&status=persistent: the 16 missing findings in the fixed order, with the ids of expected.json', async () => {
    const expected = expectedOf('batch-issues') as { affectedIds: Record<string, string[]> }

    const page = await issues(importId, 'type=missing&status=persistent&pageSize=50')

    expect(page.total).toBe(16)
    expect(page.items.map((i) => i.missingRange)).toEqual([
      ...Array(10).fill('DEC'),
      ...Array(3).fill('APP'),
      ...Array(3).fill('R'),
    ])
    const idsOf = (range: string) =>
      page.items.filter((i) => i.missingRange === range).map((i) => i.transactionIdRaw as string)
    expect(idsOf('DEC').sort()).toEqual([...(expected.affectedIds.missing_previous_to_batch_DEC ?? [])].sort())
    expect(idsOf('APP').sort()).toEqual([...(expected.affectedIds.missing_in_range_E ?? [])].sort())
    expect(idsOf('R').sort()).toEqual([...(expected.affectedIds.missing_in_range_R ?? [])].sort())
    for (const range of ['DEC', 'APP', 'R']) {
      const dates = page.items.filter((i) => i.missingRange === range).map((i) => i.relevantDate as string)
      expect(dates).toEqual([...dates].sort())
    }
  })

  it('the in-batch collision of 911545593909470: sheets APP and DEC, Successful and Declined, both included', async () => {
    const [collision] = (await issues(importId, 'type=collision&scope=in_batch')).items

    const detail = await issueDetail(collision!.issueId)

    expect(detail.transactionIdRaw).toBe('911545593909470')
    expect(detail.run.isCurrent).toBe(true)
    expect(
      detail.occurrences.map((o) => [o.sourceType, o.location?.sheetName, o.location?.fileName, o.status?.code]),
    ).toEqual([
      ['current_import', 'APP', 'Recon_Template_ProviderB-Main_batch-issues.xlsx', 'Successful'],
      ['current_import', 'DEC', 'Recon_Template_ProviderB-Main_batch-issues.xlsx', 'Declined'],
    ])
    expect(detail.occurrences.every((o) => o.defaultIncluded && o.includeInSettlement && o.changedBy === null)).toBe(
      true,
    )
    expect(detail.history).toEqual([])
  })

  it('the historical occurrence of 504712738863260 brings its batch, attempt, current status and account', async () => {
    const [duplicate] = (await issues(importId, 'type=duplicate&scope=across_batches')).items

    const detail = await issueDetail(duplicate!.issueId)

    expect(detail.transactionIdRaw).toBe('504712738863260')
    const historical = detail.occurrences.find((o) => o.sourceType === 'previous_batch')!
    expect(historical.batch).toMatchObject({ batchNo: 51, attemptNo: 1, accountName: 'ProviderB-Main' })
    expect(['processed', 'paid']).toContain(historical.batch?.status)
    expect(historical.status?.code).toBe('Successful')
    expect(historical.editable).toBe(false)
    expect(detail.occurrences[0]).toMatchObject({ sourceType: 'current_import', defaultIncluded: false })
  })

  it('the non_recorded_adjustment of 281520820250015 brings the gateway status and its source row', async () => {
    const page = await issues(importId, 'type=non_recorded_adjustment')

    const nra = page.items.find((i) => i.transactionIdRaw === '281520820250015')!

    expect(nra.gatewayStatus?.code).toBe('Successful')
    expect(nra.source).toMatchObject({
      fileName: 'Recon_Template_ProviderB-Main_batch-issues.xlsx',
      rowNo: expect.any(Number),
    })
  })
})

describe('the provider_mismatch of batch-blocked shows nothing of the other merchant', () => {
  it('only what the row brings: transactionId, raw id, cycle, reported status and source row', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    await runValidations(importId)
    const [mismatch] = (await issues(importId, 'type=provider_mismatch')).items

    const res = await flow.call('GET', `/validation-issues/${mismatch!.issueId}`, undefined, 'viewer')

    const body = res.json()
    expect(body).toMatchObject({
      transactionIdRaw: '252570479111759',
      cycle: 'E',
      blocking: true,
      gatewayStatus: null,
      source: { rowNo: expect.any(Number) },
    })
    expect(body.transactionId).toMatch(/^\d+$/)
    const text = JSON.stringify(body)
    for (const leak of ['channel', 'providerId', 'amount', 'transactionDate', 'merchant'])
      expect(text).not.toContain(leak)
  })
})
