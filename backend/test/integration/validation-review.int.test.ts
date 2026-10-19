import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ValidationIssueDetail, ValidationIssuesPage, ValidationRunView } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ValidationRunRepository } from '../../src/modules/validation/application/ports.js'
import { ValidationService } from '../../src/modules/validation/application/validation-service.js'
import { PrismaValidationRunRepository } from '../../src/modules/validation/infrastructure/prisma-validation-run-repository.js'
import { PrismaValidationSources } from '../../src/modules/validation/infrastructure/prisma-validation-sources.js'
import { createTestApp } from './helpers.js'
import { ImportFlow, SAMPLE_FILES, samplePart } from './import-flow.js'

// The decision on the whole and the state machine of the import against SQL Server (validation-runs design D7, D12,
// D16): review, review and run overlapping (made deterministic by pausing one side), a row resolved after validating
// (P7, with an ambiguous fixture on gateway 9201) and cancel recording the current run.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

const GATEWAY_AMBIGUOUS = 9201
const CHANNEL_AMBIGUOUS = 9201
/** The first APP row of batch-clean; with the fixture it exists on gateways 1 and 9201. */
const FIRST_APP_ID = '252570479111759'
const ANALYST_SCOPE = { merchantIds: [1, 2] }

async function removeAmbiguousFixture(): Promise<void> {
  const { prisma } = ctx
  const imports = await prisma.importRow.findMany({
    where: { OR: [{ gatewayId: GATEWAY_AMBIGUOUS }, { transaction: { gatewayId: GATEWAY_AMBIGUOUS } }] },
    select: { sheet: { select: { file: { select: { importId: true } } } } },
  })
  await flow.removeImports([...new Set(imports.map((r) => r.sheet.file.importId))])
  await prisma.transaction.deleteMany({ where: { gatewayId: GATEWAY_AMBIGUOUS } })
  await prisma.accountChannel.deleteMany({ where: { channelId: CHANNEL_AMBIGUOUS } })
  await prisma.channel.deleteMany({ where: { channelId: CHANNEL_AMBIGUOUS } })
  await prisma.gateway.deleteMany({ where: { gatewayId: GATEWAY_AMBIGUOUS } })
}

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-validation-review-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
  await removeAmbiguousFixture()
})

afterAll(async () => {
  if (ctx) {
    await removeAmbiguousFixture()
    await flow.close()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

async function run(importId: string) {
  const res = await flow.call('POST', `/imports/${importId}/validations`)
  expect(res.statusCode, res.body).toBe(201)
  return ValidationRunView.parse(res.json())
}

const review = (importId: string, runId: number) => flow.call('POST', `/imports/${importId}/review`, { runId })

async function current(importId: string) {
  return ValidationRunView.parse((await flow.call('GET', `/imports/${importId}/validations`)).json())
}

/** A gate: `arrived` resolves when the paused call reaches it, `release` lets it go on. */
function gate() {
  let release: () => void = () => {}
  let arrive: () => void = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const arrived = new Promise<void>((resolve) => {
    arrive = resolve
  })
  return { released, arrived, release, arrive }
}

/** A service over the real adapters whose repository pauses before `method` until released. */
function pausedService(method: 'saveRun' | 'review', g: ReturnType<typeof gate>) {
  const repo = new PrismaValidationRunRepository(ctx.prisma)
  const paused: ValidationRunRepository = Object.create(repo)
  const original = repo[method].bind(repo) as (...args: unknown[]) => Promise<unknown>
  ;(paused as unknown as Record<string, unknown>)[method] = async (...args: unknown[]) => {
    g.arrive()
    await g.released
    return original(...args)
  }
  return new ValidationService({
    sources: new PrismaValidationSources(ctx.prisma),
    runs: paused,
    log: { info: () => {} },
  })
}

describe('review of batch-issues (D7)', () => {
  it('200 validated with the review; 23 findings persistent; AuditLog import.review with runId and counts', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    const view = await run(importId)

    const res = await review(importId, view.run!.runId)

    expect(res.statusCode, res.body).toBe(200)
    const reviewed = ValidationRunView.parse(res.json())
    expect(reviewed.importStatus).toBe('validated')
    expect(reviewed.run!.review).toMatchObject({ reviewedBy: { userName: 'analyst' } })
    expect(
      await ctx.prisma.validationIssue.count({
        where: { result: { runId: view.run!.runId }, resolutionStatus: 'persistent' },
      }),
    ).toBe(23)
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({ where: { action: 'import.review', entityId: importId } })
    expect(audit.entityType).toBe('Import')
    expect(JSON.parse(audit.detailJson ?? '{}')).toMatchObject({
      runId: view.run!.runId,
      issueCounts: { duplicate_in_batch: 1, missing_previous_to_batch: 10, missing_in_range: 6 },
      changedOccurrences: 0,
    })
    const again = await review(importId, view.run!.runId)
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ code: 'import_not_analyzed', details: { status: 'validated' } })
  })

  it('a new review after an invalidation shows the new review and keeps the invalidated one', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    const view = await run(importId)
    expect((await review(importId, view.run!.runId)).statusCode).toBe(200)
    const page = ValidationIssuesPage.parse(
      (await flow.call('GET', `/imports/${importId}/validation-issues?type=duplicate&scope=in_batch`)).json(),
    )
    const dup = ValidationIssueDetail.parse(
      (await flow.call('GET', `/validation-issues/${page.items[0]!.issueId}`)).json(),
    )
    const excluded = dup.occurrences.find((o) => !o.defaultIncluded)!
    const patched = await flow.call('PATCH', `/conflict-occurrences/${excluded.occurrenceId}`, {
      includeInSettlement: true,
    })
    expect(patched.json().importStatus).toBe('analyzed')

    const res = await review(importId, view.run!.runId)

    expect(res.statusCode).toBe(200)
    const after = ValidationRunView.parse(res.json())
    expect(after.run!.review).not.toBeNull()
    expect(after.lastInvalidatedReview).toMatchObject({ runId: view.run!.runId, reason: 'inclusion_change' })
  })

  it('an old runId: 409 validation_run_superseded with the current one, still analyzed', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    const first = await run(importId)
    const second = await run(importId)

    const res = await review(importId, first.run!.runId)

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      code: 'validation_run_superseded',
      details: { runId: first.run!.runId, currentRunId: second.run!.runId },
    })
    expect((await current(importId)).importStatus).toBe('analyzed')
  })
})

describe('review and run overlapping (D4)', () => {
  it('the review confirms while a run is computed: validated with the reviewed run, the run gets 409 import_changed', async () => {
    const issues = await flow.analyzedSample('batch-issues')
    const reviewed = await run(issues.importId)
    const g = gate()
    const pending = pausedService('saveRun', g)
      .run(ANALYST_SCOPE, flow.userIds.analyst, issues.importId)
      .catch((e: unknown) => e)
    await g.arrived

    expect((await review(issues.importId, reviewed.run!.runId)).statusCode).toBe(200)
    g.release()

    expect(await pending).toMatchObject({ code: 'import_changed' })
    const after = await current(issues.importId)
    expect(after.importStatus).toBe('validated')
    expect(after.run!.runId).toBe(reviewed.run!.runId)
  })

  it('a run confirms while the review waits: the review reads the current run in its transaction and gets 409 validation_run_superseded', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    const first = await run(importId)
    const g = gate()
    const pending = pausedService('review', g)
      .review(ANALYST_SCOPE, flow.userIds.analyst, importId, first.run!.runId)
      .catch((e: unknown) => e)
    await g.arrived

    const second = await run(importId)
    g.release()

    expect(await pending).toMatchObject({
      code: 'validation_run_superseded',
      details: { runId: first.run!.runId, currentRunId: second.run!.runId },
    })
    const after = await current(importId)
    expect(after.importStatus).toBe('analyzed')
    expect(after.run!.runId).toBe(second.run!.runId)
  })

  // Only watches the final invariant (never validated with another current run); it accepts either outcome, also a
  // serial one. The two orders are protected by the deterministic variants above: "the review confirms while a run is
  // computed…" and "a run confirms while the review waits…".
  it('both at once over HTTP: never validated with a run other than the reviewed one', async () => {
    const { importId } = await flow.analyzedSample('batch-issues')
    const first = await run(importId)

    const [reviewed, rerun] = await Promise.all([
      review(importId, first.run!.runId),
      flow.call('POST', `/imports/${importId}/validations`),
    ])

    const after = await current(importId)
    if (after.importStatus === 'validated') {
      expect(after.run!.runId).toBe(first.run!.runId)
      expect(reviewed.statusCode).toBe(200)
      expect(rerun.json().code).toBe('import_changed')
    } else {
      expect(after.run!.runId).not.toBe(first.run!.runId)
      expect(rerun.statusCode).toBe(201)
    }
  })
})

describe('batch-blocked (HU2 CA5, CA8)', () => {
  it('review: 409 blocking_validation_issue with no way to force it; cancel keeps the run and records it', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')
    const view = await run(importId)

    const res = await review(importId, view.run!.runId)

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({
      code: 'blocking_validation_issue',
      message: 'provider_mismatch: cancel the import and process it under the correct provider',
      details: { runId: view.run!.runId, validationCodes: ['provider_mismatch'], issueIds: [expect.any(Number)] },
    })
    expect((await current(importId)).importStatus).toBe('analyzed')

    const cancelled = await flow.call('POST', `/imports/${importId}/cancel`)
    expect(cancelled.statusCode).toBe(200)
    const after = await current(importId)
    expect(after.importStatus).toBe('cancelled')
    expect(after.run!.runId).toBe(view.run!.runId)
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({ where: { action: 'import.cancel', entityId: importId } })
    expect(JSON.parse(audit.detailJson ?? '{}')).toMatchObject({ previousStatus: 'analyzed', runId: view.run!.runId })
  })

  it('cancel without a run records runId null', async () => {
    const { importId } = await flow.analyzedSample('batch-blocked')

    expect((await flow.call('POST', `/imports/${importId}/cancel`)).statusCode).toBe(200)

    const audit = await ctx.prisma.auditLog.findFirstOrThrow({ where: { action: 'import.cancel', entityId: importId } })
    expect(JSON.parse(audit.detailJson ?? '{}')).toMatchObject({ previousStatus: 'analyzed', runId: null })
  })
})

describe('resolving an ambiguous row after validating (P7)', () => {
  beforeAll(async () => {
    const { prisma } = ctx
    await prisma.gateway.create({ data: { gatewayId: GATEWAY_AMBIGUOUS, name: 'Gateway 9201', idFormat: 'numeric' } })
    await prisma.channel.create({
      data: {
        channelId: CHANNEL_AMBIGUOUS,
        gatewayId: GATEWAY_AMBIGUOUS,
        providerId: 101,
        name: 'RAM-9201',
        settlementTermDays: 14,
        rollingReservePct: '0.100000',
        rollingReserveDays: 180,
      },
    })
    await prisma.accountChannel.create({
      data: {
        accountId: flow.accountIds['ProviderA-USD'] as string,
        channelId: CHANNEL_AMBIGUOUS,
        isPrimary: true,
        assignedAt: new Date(),
        assignedByUserId: flow.userIds.analyst,
      },
    })
    await prisma.transaction.create({
      data: {
        sourceTransactionId: FIRST_APP_ID,
        gatewayId: GATEWAY_AMBIGUOUS,
        merchantId: 1,
        providerId: 101,
        channelId: CHANNEL_AMBIGUOUS,
        amount: '16.2200',
        statusId: 2,
        transactionDate: new Date('2026-10-01T00:00:00.000Z'),
        appliedReservePct: '0.100000',
      },
    })
  })

  afterAll(async () => {
    await removeAmbiguousFixture()
  })

  it('the run is superseded without a replacement, GET validations answers run null, review asks for a run, the audit has supersededRunId', async () => {
    const detail = await flow.analyzed(
      flow.accountIds['ProviderA-USD'] as string,
      SAMPLE_FILES['batch-clean'].files.map(samplePart),
    )
    const app = detail.files[0]!.sheets.find((s) => s.sheetName === 'APP')!
    const view = await run(detail.importId)

    const resolved = await flow.call('PATCH', `/imports/${detail.importId}/rows/${app.sheetId}/2`, {
      gatewayId: GATEWAY_AMBIGUOUS,
    })

    expect(resolved.statusCode, resolved.body).toBe(200)
    const after = await current(detail.importId)
    expect(after.run).toBeNull()
    expect(after.importStatus).toBe('analyzed')
    const refused = await review(detail.importId, view.run!.runId)
    expect(refused.statusCode).toBe(409)
    expect(refused.json().code).toBe('validation_run_required')
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({
      where: { action: 'import.row.resolve_gateway', entityId: `${app.sheetId}:2` },
    })
    expect(JSON.parse(audit.detailJson ?? '{}')).toMatchObject({ supersededRunId: view.run!.runId })
    expect((await ctx.prisma.validationRun.findUniqueOrThrow({ where: { runId: view.run!.runId } })).isSuperseded).toBe(
      true,
    )
  })
})
