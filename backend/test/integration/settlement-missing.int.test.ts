import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PrismaClient } from '../../src/generated/prisma/client.js'
import { PrismaMissingResolution } from '../../src/modules/validation/infrastructure/prisma-missing-resolution.js'
import { createPrismaClient, fixtureIds } from './helpers.js'

// MissingResolution (settlement-process design D11; spec validation "Los hallazgos persisten", spec settlement
// "Faltantes resueltos al procesar"): inside the transaction that processes or undoes a batch, the persistent missing
// findings of current runs of the provider whose (transactionId, cycle) is in the batch pass to resolved, and back.
// Fixture of its own: imports, runs and findings created straight in the base, batches 9711 and 9712; removed after.
let prisma: PrismaClient
const resolution = new PrismaMissingResolution()
const created = { imports: [] as string[], batches: [] as string[] }
let analystId: number
let accounts: Record<string, string>
let x: bigint // Provider A transaction, the one the batch settles in E
let y: bigint // Provider A transaction not in the batch
let foreign: bigint // Provider B transaction
const AT = new Date('2026-10-19T15:40:03.120Z')

beforeAll(async () => {
  prisma = createPrismaClient()
  analystId = (await prisma.user.findUniqueOrThrow({ where: { userName: 'analyst' } })).userId
  accounts = Object.fromEntries((await prisma.account.findMany()).map((a) => [a.name, a.accountId]))
  const ofProvider = async (providerId: number, take: number) =>
    (
      await prisma.transaction.findMany({
        where: { providerId },
        orderBy: { transactionId: 'desc' },
        take,
        select: { transactionId: true },
      })
    ).map((t) => t.transactionId)
  ;[x, y] = (await ofProvider(101, 2)) as [bigint, bigint]
  ;[foreign] = (await ofProvider(102, 1)) as [bigint]
})

afterAll(async () => {
  const imports = fixtureIds(created.imports, 'created.imports')
  const batches = fixtureIds(created.batches, 'created.batches')
  const runs = await prisma.validationRun.findMany({ where: { importId: { in: imports } }, select: { runId: true } })
  const runIds = fixtureIds(
    runs.map((r) => r.runId),
    'runIds',
  )
  await prisma.validationIssue.deleteMany({ where: { result: { runId: { in: runIds } } } })
  await prisma.validationResult.deleteMany({ where: { runId: { in: runIds } } })
  await prisma.validationRun.deleteMany({ where: { runId: { in: runIds } } })
  await prisma.settlementTransaction.deleteMany({ where: { batchId: { in: batches } } })
  await prisma.settlementBatch.deleteMany({ where: { batchId: { in: batches } } })
  await prisma.import.deleteMany({ where: { importId: { in: imports } } })
  await prisma.$disconnect()
})

async function importOf(account: string): Promise<string> {
  const importId = randomUUID()
  await prisma.import.create({
    data: { importId, accountId: accounts[account]!, createdByUserId: analystId, status: 'processed' },
  })
  created.imports.push(importId)
  return importId
}

/** A run of the import with one missing_previous_to_batch result and its findings. */
async function runWithFindings(
  importId: string,
  findings: { transactionId: bigint; cycle: 'E' | 'I'; issueType?: string; resolvedByUserId?: number }[],
  isSuperseded = false,
): Promise<number[]> {
  const run = await prisma.validationRun.create({ data: { importId, runByUserId: analystId, isSuperseded } })
  const result = await prisma.validationResult.create({
    data: { runId: run.runId, validationCode: 'missing_previous_to_batch', outcome: 'warning' },
  })
  const ids: number[] = []
  for (const f of findings) {
    const issueType = f.issueType ?? 'missing'
    const issue = await prisma.validationIssue.create({
      data: {
        resultId: result.resultId,
        issueType,
        scope: issueType === 'missing' ? 'previous_to_batch' : null,
        transactionId: f.transactionId,
        cycle: f.cycle,
        missingType: issueType === 'missing' ? 'previous_to_batch' : null,
        resolutionStatus: f.resolvedByUserId ? 'resolved' : 'persistent',
        resolvedByUserId: f.resolvedByUserId ?? null,
        resolvedAt: f.resolvedByUserId ? AT : null,
      },
    })
    ids.push(issue.issueId)
  }
  return ids
}

/** A processed batch of the account settling `transactionId` in `cycle`. */
async function batchWith(account: string, batchNo: number, transactionId: bigint, cycle: 'E' | 'I'): Promise<string> {
  const batchId = randomUUID()
  await prisma.settlementBatch.create({
    data: {
      batchId,
      accountId: accounts[account]!,
      batchNo,
      importId: await importOf(account),
      status: 'processed',
      approvedByUserId: analystId,
    },
  })
  created.batches.push(batchId)
  await prisma.settlementTransaction.create({
    data: {
      batchId,
      transactionId,
      cycle,
      statusId: cycle === 'E' ? 2 : 4,
      settlementStatusId: 0,
      amount: '10.0000',
      eventDate: new Date('2026-10-01T00:00:00.000Z'),
      appliedReservePct: '0.100000',
      reserveDaysUsed: 180,
    },
  })
  return batchId
}

const issue = (issueId: number) =>
  prisma.validationIssue.findUniqueOrThrow({
    where: { issueId },
    select: { resolutionStatus: true, resolvedInBatchId: true, resolvedAt: true, resolvedByUserId: true },
  })

describe('resolveForBatch and reopenForBatch', () => {
  let batchB: string
  let batchC: string
  let resolvedByB: number
  let otherCycle: number
  let otherTransaction: number
  let superseded: number
  let otherProvider: number
  let resolvedByC: number
  let byHand: number

  beforeAll(async () => {
    // Findings of an import of ProviderA-USD (current run), of a superseded run, and of Provider B.
    const importA = await importOf('ProviderA-USD')
    ;[superseded] = await runWithFindings(importA, [{ transactionId: x, cycle: 'E' }], true)
    ;[resolvedByB, otherCycle, otherTransaction, byHand] = await runWithFindings(importA, [
      { transactionId: x, cycle: 'E' },
      { transactionId: x, cycle: 'I' },
      { transactionId: y, cycle: 'E' },
      { transactionId: x, cycle: 'E', issueType: 'non_recorded_adjustment', resolvedByUserId: analystId },
    ])
    ;[otherProvider] = await runWithFindings(await importOf('ProviderB-Main'), [{ transactionId: foreign, cycle: 'E' }])
    ;[resolvedByC] = await runWithFindings(await importOf('ProviderA-USD'), [{ transactionId: y, cycle: 'I' }])
    // B settles X in E on another account of the same provider; C settles Y in I.
    batchB = await batchWith('ProviderA-EUR', 9711, x, 'E')
    batchC = await batchWith('ProviderA-USD', 9712, y, 'I')
  })

  it('resolves the persistent missing finding of X in E of a current run, with the batch and the instant', async () => {
    const count = await prisma.$transaction((tx) => resolution.resolveForBatch(tx, batchB, AT))

    expect(count).toBe(1)
    expect(await issue(resolvedByB)).toEqual({
      resolutionStatus: 'resolved',
      resolvedInBatchId: batchB,
      resolvedAt: AT,
      resolvedByUserId: null,
    })
  })

  it('leaves another cycle, another transaction, a superseded run, another provider and other types alone', async () => {
    for (const id of [otherCycle, otherTransaction, superseded, otherProvider])
      expect((await issue(id)).resolutionStatus).toBe('persistent')
    expect(await issue(byHand)).toMatchObject({ resolutionStatus: 'resolved', resolvedInBatchId: null })
  })

  it('rolls back with the transaction that called it', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await resolution.resolveForBatch(tx, batchC, AT)
        throw new Error('processing failed after resolving')
      }),
    ).rejects.toThrow('processing failed after resolving')

    expect((await issue(resolvedByC)).resolutionStatus).toBe('persistent')
  })

  it('reopens only the findings resolved by that batch', async () => {
    await prisma.$transaction((tx) => resolution.resolveForBatch(tx, batchC, AT))

    const reopened = await prisma.$transaction((tx) => resolution.reopenForBatch(tx, batchB))

    expect(reopened).toBe(1)
    expect(await issue(resolvedByB)).toEqual({
      resolutionStatus: 'persistent',
      resolvedInBatchId: null,
      resolvedAt: null,
      resolvedByUserId: null,
    })
    expect(await issue(resolvedByC)).toMatchObject({ resolutionStatus: 'resolved', resolvedInBatchId: batchC })
    expect(await issue(byHand)).toMatchObject({ resolutionStatus: 'resolved' })
  })
})
