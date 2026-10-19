import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { SettlementRequest } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Prisma } from '../../src/generated/prisma/client.js'
import { buildXlsx } from '../../src/modules/imports/infrastructure/xlsx/test-support.js'
import {
  PrismaSettlementRepository,
  type WritePhase,
} from '../../src/modules/settlement/infrastructure/prisma-settlement-repository.js'
import { PrismaMissingResolution } from '../../src/modules/validation/infrastructure/prisma-missing-resolution.js'
import { createTestApp, fixtureId } from './helpers.js'
import { type AccountChannelRow, ImportFlow, restoreAccountChannels, snapshotAccountChannels } from './import-flow.js'

// Overlaps of processing (settlement-process design D5–D7; spec settlement "Procesamiento atómico y auditado",
// "Precondición de procesar", "Intentos de batch"). Deterministic: one process waits inside its transaction right
// before the guard on Import (beforeClaim, holding no lock) while the other side commits; never Promise.all alone.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string
let channels: AccountChannelRow[]
let ids: string[]

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-settlement-concurrency-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
  channels = await snapshotAccountChannels(ctx.prisma)
  // Approved transactions of RAM-01 (primary of ProviderA-USD) never settled: one per small import.
  ids = (
    await ctx.prisma.$queryRaw<{ sourceTransactionId: string }[]>(Prisma.sql`
      SELECT TOP 8 t.[sourceTransactionId] FROM [Transaction] t
      WHERE t.[providerId] = 101 AND t.[channelId] = 1001 AND t.[statusId] = 2
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId])
      ORDER BY t.[transactionId] DESC`)
  ).map((r) => r.sourceTransactionId)
})

afterAll(async () => {
  if (ctx) {
    await flow.close()
    await restoreAccountChannels(ctx.prisma, channels)
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

/** A validated one-row import of ProviderA-USD. */
async function validatedImport(index: number): Promise<{ importId: string; runId: number }> {
  const bytes = buildXlsx({
    sheets: [
      {
        name: 'APP',
        rows: [
          ['ID', 'Amount', 'Currency'],
          [ids[index]!, { v: '10' }, 'USD'],
        ],
      },
    ],
  })
  const detail = await flow.analyzed(flow.accountIds['ProviderA-USD']!, [{ name: `c${index}.xlsx`, bytes }])
  return { importId: detail.importId, runId: await flow.validateAndReview(detail.importId) }
}

/** A gate: `reached` resolves when the paused side arrives; `open()` lets it go on. */
function gate() {
  let arrive!: () => void
  let release!: () => void
  const reached = new Promise<void>((resolve) => {
    arrive = resolve
  })
  const opened = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    reached,
    open: release,
    beforeClaim: async () => {
      arrive()
      await opened
    },
  }
}

const repository = (beforeClaim?: () => Promise<void>, beforePhase?: (phase: WritePhase) => Promise<void>) =>
  new PrismaSettlementRepository(ctx.prisma, {
    missing: new PrismaMissingResolution(),
    log: ctx.app.log,
    ...(beforeClaim ? { beforeClaim } : {}),
    ...(beforePhase ? { beforePhase } : {}),
  })

const process = (repo: PrismaSettlementRepository, importId: string, request: SettlementRequest) =>
  repo.process({ importId, userId: flow.userIds.analyst, request, prefilledFeeTypeIds: new Set(), now: new Date() })

const batchesOf = (importId: string) => ctx.prisma.settlementBatch.count({ where: { importId } })
const statusOf = async (importId: string) => (await ctx.prisma.import.findUniqueOrThrow({ where: { importId } })).status

describe('two processes of the same import', () => {
  it('the one that waited answers 409 import_not_validated { status: processed }, and one attempt exists', async () => {
    const { importId, runId } = await validatedImport(0)
    const g = gate()
    const waiting = process(repository(g.beforeClaim), importId, { runId, batchNo: 9811 })
    await g.reached

    await process(repository(), importId, { runId, batchNo: 9812 })
    g.open()

    await expect(waiting).rejects.toMatchObject({ code: 'import_not_validated', details: { status: 'processed' } })
    expect(await batchesOf(importId)).toBe(1)
  })
})

describe('the same batchNo in two imports of the account', () => {
  it('the one that waited answers 409 batch_no_taken; its import stays validated with nothing of its own', async () => {
    const first = await validatedImport(1)
    const second = await validatedImport(2)
    const g = gate()
    const waiting = process(repository(g.beforeClaim), first.importId, { runId: first.runId, batchNo: 9813 })
    await g.reached

    await process(repository(), second.importId, { runId: second.runId, batchNo: 9813 })
    g.open()

    await expect(waiting).rejects.toMatchObject({
      code: 'batch_no_taken',
      details: { batchNo: 9813, attemptNo: 1, importId: second.importId },
    })
    expect(await batchesOf(first.importId)).toBe(0)
    expect(await statusOf(first.importId)).toBe('validated')
  })
})

// The last barrier (design D7): the range lock makes the race unreachable from two requests, so the violation the
// database would raise is thrown from beforePhase('batch'), after the number was locked. SQL Server's own messages.
const indexViolation = (index: string) => () =>
  Promise.reject(
    new Error(`Cannot insert duplicate key row in object 'dbo.SettlementBatch' with unique index '${index}'.`),
  )
const keyViolation = (constraint: string) => () =>
  Promise.reject(new Error(`Violation of UNIQUE KEY constraint '${constraint}'. Cannot insert duplicate key.`))

describe('a unique index violation as the last barrier', () => {
  // An active attempt of another account (ProviderB-Main) with the number of the race: never the holder of the 409.
  const foreignImportId = randomUUID()
  const foreignBatchId = randomUUID()

  beforeAll(async () => {
    await ctx.prisma.import.create({
      data: {
        importId: foreignImportId,
        accountId: flow.accountIds['ProviderB-Main']!,
        createdByUserId: flow.userIds.analyst,
        status: 'processed',
      },
    })
    await ctx.prisma.settlementBatch.create({
      data: {
        batchId: foreignBatchId,
        accountId: flow.accountIds['ProviderB-Main']!,
        batchNo: 9816,
        importId: foreignImportId,
        status: 'processed',
        approvedByUserId: flow.userIds.analyst,
      },
    })
  })

  afterAll(async () => {
    await ctx.prisma.settlementBatch.deleteMany({ where: { batchId: fixtureId(foreignBatchId, 'foreignBatchId') } })
    await ctx.prisma.import.deleteMany({ where: { importId: fixtureId(foreignImportId, 'foreignImportId') } })
  })

  it('names the attempted number of its own account, not the attempt of another account', async () => {
    const { importId, runId } = await validatedImport(5)
    const repo = repository(undefined, indexViolation('UX_SettlementBatch_active_accountBatchNo'))

    const error = await process(repo, importId, { runId, batchNo: 9816 }).catch((e: unknown) => e)

    expect(error).toMatchObject({ code: 'batch_no_taken', details: { batchNo: 9816, attemptNo: 1 } })
    expect((error as { details: { importId: string } }).details.importId).not.toBe(foreignImportId)
    expect(await batchesOf(importId)).toBe(0)
  })

  it('without batchNo, the proposed number of the account, never 0', async () => {
    const { importId, runId } = await validatedImport(6)
    const accountId = flow.accountIds['ProviderA-USD']!
    const { _max } = await ctx.prisma.settlementBatch.aggregate({ where: { accountId }, _max: { batchNo: true } })
    const repo = repository(undefined, indexViolation('UX_SettlementBatch_active_accountBatchNo'))

    await expect(process(repo, importId, { runId })).rejects.toMatchObject({
      code: 'batch_no_taken',
      details: { batchNo: (_max.batchNo ?? 0) + 1, attemptNo: 1 },
    })
  })

  it('UNIQUE (accountId, batchNo, attemptNo) answers 409 batch_no_taken too, never a 500', async () => {
    const { importId, runId } = await validatedImport(7)
    const repo = repository(undefined, keyViolation('SettlementBatch_accountId_batchNo_attemptNo_key'))

    await expect(process(repo, importId, { runId, batchNo: 9817 })).rejects.toMatchObject({
      code: 'batch_no_taken',
      details: { batchNo: 9817, attemptNo: 1 },
    })
    expect(await statusOf(importId)).toBe('validated')
  })
})

describe('the review invalidated meanwhile', () => {
  it('a run that commits while the process waits leaves it 409 import_not_validated { status: analyzed }', async () => {
    const { importId, runId } = await validatedImport(3)
    const g = gate()
    const waiting = process(repository(g.beforeClaim), importId, { runId, batchNo: 9814 })
    await g.reached

    const rerun = await flow.call('POST', `/imports/${importId}/validations`)
    expect(rerun.statusCode, rerun.body).toBe(201)
    g.open()

    await expect(waiting).rejects.toMatchObject({ code: 'import_not_validated', details: { status: 'analyzed' } })
    expect(await batchesOf(importId)).toBe(0)
  })
})

describe('another run reviewed meanwhile', () => {
  it('the process with the old runId answers 409 validation_run_superseded { runId, currentRunId }', async () => {
    const { importId, runId } = await validatedImport(4)
    const g = gate()
    const waiting = process(repository(g.beforeClaim), importId, { runId, batchNo: 9815 })
    await g.reached

    const currentRunId = await flow.validateAndReview(importId)
    g.open()

    await expect(waiting).rejects.toMatchObject({
      code: 'validation_run_superseded',
      details: { runId, currentRunId },
    })
    expect(await batchesOf(importId)).toBe(0)
    expect(await statusOf(importId)).toBe('validated')
  })
})
