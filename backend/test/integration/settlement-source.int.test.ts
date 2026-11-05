import { randomUUID } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadSettlementInput } from '../../src/modules/settlement/application/load-settlement-input.js'
import type { SettlementInput } from '../../src/modules/settlement/domain/types.js'
import { PrismaSettlementSource } from '../../src/modules/settlement/infrastructure/prisma-settlement-source.js'
import { settlementSampleInput } from '../../src/modules/settlement/test-support/sample-input.js'
import { createTestApp, fixtureIds } from './helpers.js'
import { ImportFlow, removeImportsFrom } from './import-flow.js'

// The Prisma adapter of the settlement reads (settlement-process design D2, task 6.1): batch-clean analyzed,
// validated and reviewed through the API, loaded from SQL Server, equals the input the domain tests build in memory
// (ids aside: the base has its own transaction, file, sheet and account ids).
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-settlement-source-int-'))
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

/** The input without ids that differ between the base and the in-memory world. */
function normalized(input: SettlementInput) {
  const sheetOrderOf = new Map(input.rows.map((r) => [r.sheetId, `${r.fileOrder}:${r.sheetOrder}`]))
  const sourceOf = new Map(input.rows.flatMap((r) => (r.transaction ? [[r.transaction.transactionId, r]] : [])))
  return {
    account: { ...input.account, accountId: undefined },
    ranges: input.ranges,
    rows: input.rows
      .map(({ fileId: _f, sheetId: _s, transaction, ...r }) => ({
        ...r,
        transaction: transaction === null ? null : { ...transaction, transactionId: undefined },
      }))
      .sort((a, b) => a.fileOrder - b.fileOrder || a.sheetOrder - b.sheetOrder || a.rowNo - b.rowNo),
    inclusions: input.inclusions.map((i) => ({ ...i, sheetId: sheetOrderOf.get(i.sheetId) })),
    channels: [...input.channels]
      .map((c) => ({ ...c, channelId: undefined, otherAccount: c.otherAccount?.name ?? null }))
      .sort((a, b) => (a.name < b.name ? -1 : 1)),
    previousE: [...input.previousE].map((id) => sourceOf.get(id)?.transaction?.sourceTransactionId).sort(),
    // The batch ids of the base are its own (batch:<account>:<batchNo>:1 in memory).
    reserveStates: [...input.reserveStates]
      .map(([id, s]) => ({
        source: sourceOf.get(id)?.transaction?.sourceTransactionId,
        ...s,
        held: s.held === null ? null : { amount: s.held.amount },
      }))
      .sort((x, y) => ((x.source ?? '') < (y.source ?? '') ? -1 : 1)),
    fees: input.fees.map(({ feeId: _, ...f }) => f).sort((a, b) => a.feeTypeId - b.feeTypeId),
    feeTypes: [...input.feeTypes].sort((a, b) => a.feeTypeId - b.feeTypeId),
    attempts: input.attempts
      .map(({ importId: _, ...a }) => a)
      .sort((a, b) => a.batchNo - b.batchNo || a.attemptNo - b.attemptNo),
  }
}

describe('PrismaSettlementSource with batch-clean', () => {
  it('loads the same input as the in-memory world', async () => {
    const { importId, runId } = await flow.validatedSample('batch-clean')
    const expected = await settlementSampleInput('batch-clean')
    const source = new PrismaSettlementSource(ctx.prisma)
    const context = await source.importContext({ merchantIds: [1, 2] }, importId)
    const run = await source.currentRun(importId)
    expect(context?.status).toBe('validated')
    expect(run?.runId).toBe(runId)
    expect(run?.blocked).toBeNull()

    const loaded = await loadSettlementInput(source, {
      importId,
      account: context!.account,
      run: run!,
      prefilledFeeTypeIds: expected.prefilledFeeTypeIds,
      request: expected.request,
      options: expected.options,
    })

    expect(loaded.account.accountId).toBe(flow.accountIds['ProviderA-USD'])
    expect(normalized(loaded)).toEqual(normalized(expected))
  })

  it('answers null for an import outside the scope, as for an unknown one', async () => {
    const source = new PrismaSettlementSource(ctx.prisma)
    const { importId } = await flow.validatedSample('legacy-provider')

    expect(await source.importContext({ merchantIds: [1] }, importId)).toBeNull()
    expect(await source.importContext({ merchantIds: [1, 2] }, '00000000-0000-4000-8000-00000000ffff')).toBeNull()
  })

  it('chunks the transaction ids of previousE (more than 2 000 parameters)', async () => {
    const source = new PrismaSettlementSource(ctx.prisma)
    // 4 500 transactions of Provider A settled in E by the seeded history, plus 10 never settled in E.
    const settled = await ctx.prisma.$queryRaw<{ transactionId: bigint }[]>`
      SELECT DISTINCT TOP 4500 st.[transactionId] FROM [SettlementTransaction] st
      JOIN [Transaction] t ON t.[transactionId] = st.[transactionId]
      WHERE st.[cycle] = 'E' AND t.[providerId] = 101 ORDER BY st.[transactionId]`
    const unsettled = await ctx.prisma.$queryRaw<{ transactionId: bigint }[]>`
      SELECT TOP 10 t.[transactionId] FROM [Transaction] t
      WHERE t.[providerId] = 101
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId])
      ORDER BY t.[transactionId]`
    const settledIds = settled.map((r) => BigInt(r.transactionId))
    expect(settledIds).toHaveLength(4_500)

    const found = await source.previousE(
      101,
      [...settledIds, ...unsettled.map((r) => BigInt(r.transactionId))],
      '00000000-0000-4000-8000-00000000ffff',
    )

    expect(found).toEqual(new Set(settledIds))
  })
})

// reserveStates (settlement-reserve-chargeback D2). Fixture of its own on four Provider A transactions never settled
// by the seed: batches 9731 to 9734 of ProviderA-USD and ProviderA-EUR with their imports, removed after.
describe('PrismaSettlementSource.reserveStates', () => {
  const created: string[] = []
  const NONE = '00000000-0000-4000-8000-00000000ffff'
  let source: PrismaSettlementSource
  let a: bigint // held in P, held again in Q, released by a Refund in Q
  let b: bigint // held in P, an R and a Chargeback without release in Q
  let c: bigint // only in an undone attempt
  let d: bigint // only in the excluded import
  let p: string
  let q: string
  let excluded: string

  beforeAll(async () => {
    source = new PrismaSettlementSource(ctx.prisma)
    const prisma = ctx.prisma
    const analystId = (await prisma.user.findUniqueOrThrow({ where: { userName: 'analyst' } })).userId
    const accounts = Object.fromEntries((await prisma.account.findMany()).map((x) => [x.name, x.accountId]))
    const fixtureAccounts = fixtureIds([accounts['ProviderA-USD'], accounts['ProviderA-EUR']], 'accounts')
    // What an interrupted run left behind.
    const leftovers = await prisma.settlementBatch.findMany({
      where: { batchNo: { gte: 9731, lte: 9734 }, accountId: { in: fixtureAccounts } },
      select: { importId: true },
    })
    await removeImportsFrom(prisma, [...new Set(leftovers.map((x) => x.importId))])

    const unsettled = await prisma.$queryRaw<{ transactionId: bigint }[]>`
      SELECT TOP 4 t.[transactionId] FROM [Transaction] t
      WHERE t.[providerId] = 101
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] st WHERE st.[transactionId] = t.[transactionId])
      ORDER BY t.[transactionId] DESC`
    ;[a, b, c, d] = unsettled.map((r) => BigInt(r.transactionId)) as [bigint, bigint, bigint, bigint]

    const batch = async (account: string, batchNo: number, status: string, processedAt: Date) => {
      const importId = randomUUID()
      await prisma.import.create({
        data: { importId, accountId: accounts[account]!, createdByUserId: analystId, status: 'processed' },
      })
      created.push(importId)
      const batchId = randomUUID()
      await prisma.settlementBatch.create({
        data: {
          batchId,
          accountId: accounts[account]!,
          batchNo,
          importId,
          status,
          approvedByUserId: analystId,
          processedAt,
          ...(status === 'paid' ? { paidAt: processedAt, paidByUserId: analystId } : {}),
          ...(status === 'undone' ? { undoneAt: processedAt, undoneByUserId: analystId } : {}),
        },
      })
      return { batchId, importId }
    }
    ;({ batchId: p } = await batch('ProviderA-USD', 9731, 'paid', new Date('2026-09-01T10:00:00.000Z')))
    ;({ batchId: q } = await batch('ProviderA-EUR', 9732, 'processed', new Date('2026-09-15T10:00:00.000Z')))
    const { batchId: u } = await batch('ProviderA-USD', 9733, 'undone', new Date('2026-09-20T10:00:00.000Z'))
    const x = await batch('ProviderA-USD', 9734, 'processed', new Date('2026-09-25T10:00:00.000Z'))
    excluded = x.importId

    const movement = (
      batchId: string,
      transactionId: bigint,
      cycle: 'E' | 'I' | 'R',
      statusId: number,
      amounts: { held?: string; released?: string; early?: string } = {},
    ) => ({
      batchId,
      transactionId,
      cycle,
      statusId,
      settlementStatusId: 0,
      amount: '100.0000',
      eventDate: new Date('2026-09-01T00:00:00.000Z'),
      appliedReservePct: '0.100000',
      reserveDaysUsed: 180,
      reserveHeldAmt: amounts.held ?? '0.0000',
      reserveReleasedAmt: amounts.released ?? '0.0000',
      reserveEarlyReleasedAmt: amounts.early ?? '0.0000',
    })
    // Q is written before P: the first E is chosen by processedAt, not by insertion.
    await prisma.settlementTransaction.createMany({
      data: [
        movement(q, a, 'E', 2, { held: '20.0000' }),
        movement(q, a, 'I', 5, { early: '10.0000' }),
        movement(q, b, 'R', 2, { released: '7.5000' }),
        movement(q, b, 'I', 4),
      ],
    })
    await prisma.settlementTransaction.createMany({
      data: [
        movement(p, a, 'E', 2, { held: '10.0000' }),
        movement(p, b, 'E', 3),
        movement(p, b, 'E', 2, { held: '7.5000' }),
        movement(u, c, 'E', 2, { held: '3.0000' }),
        movement(u, c, 'I', 4, { early: '3.0000' }),
        movement(x.batchId, d, 'E', 2, { held: '4.0000' }),
      ],
    })
  })

  afterAll(async () => {
    await removeImportsFrom(ctx.prisma, fixtureIds(created, 'created'))
  })

  it('reads the first Successful E that held, an R and an I that released; not an undone attempt nor the import', async () => {
    const states = await source.reserveStates(101, [a, b, c, d], excluded)

    expect(states).toEqual(
      new Map([
        [a, { held: { amount: '10.0000', batchId: p }, releasedInR: false, releasedByAdjustment: true }],
        [b, { held: { amount: '7.5000', batchId: p }, releasedInR: true, releasedByAdjustment: false }],
      ]),
    )
  })

  it('reads only the attempts of the provider', async () => {
    expect(await source.reserveStates(102, [a, b], NONE)).toEqual(new Map())
  })

  it('reads a seeded paid E that held and a seeded R', async () => {
    const [held] = await ctx.prisma.$queryRaw<{ transactionId: bigint; batchId: string; amount: string }[]>`
      SELECT TOP 1 st.[transactionId], LOWER(CONVERT(VARCHAR(36), st.[batchId])) AS batchId,
        CONVERT(VARCHAR(40), st.[reserveHeldAmt]) AS amount
      FROM [SettlementTransaction] st
      JOIN [SettlementBatch] sb ON sb.[batchId] = st.[batchId]
      JOIN [Account] ac ON ac.[accountId] = sb.[accountId]
      WHERE sb.[status] = 'paid' AND ac.[providerId] = 101 AND st.[cycle] = 'E' AND st.[statusId] = 2
        AND st.[reserveHeldAmt] > 0
        AND NOT EXISTS (SELECT 1 FROM [SettlementTransaction] o
          WHERE o.[transactionId] = st.[transactionId] AND o.[settlementTxnId] <> st.[settlementTxnId])
      ORDER BY st.[transactionId]`
    const [released] = await ctx.prisma.$queryRaw<{ transactionId: bigint }[]>`
      SELECT TOP 1 st.[transactionId] FROM [SettlementTransaction] st
      JOIN [SettlementBatch] sb ON sb.[batchId] = st.[batchId]
      JOIN [Account] ac ON ac.[accountId] = sb.[accountId]
      WHERE sb.[status] <> 'undone' AND ac.[providerId] = 101 AND st.[cycle] = 'R'
      ORDER BY st.[transactionId]`
    expect(held).toBeDefined()
    expect(released).toBeDefined()
    const heldId = BigInt(held!.transactionId)
    const releasedId = BigInt(released!.transactionId)

    const states = await source.reserveStates(101, [heldId, releasedId], NONE)

    expect(states.get(heldId)).toEqual({
      held: { amount: held!.amount, batchId: held!.batchId },
      releasedInR: false,
      releasedByAdjustment: false,
    })
    expect(states.get(releasedId)?.releasedInR).toBe(true)
  })

  it('chunks the transaction ids (more than 2 000 parameters)', async () => {
    // 4 500 transactions of Provider A with a Successful E that held in the seeded history, plus a and c.
    const heldRows = await ctx.prisma.$queryRaw<{ transactionId: bigint }[]>`
      SELECT DISTINCT TOP 4500 st.[transactionId] FROM [SettlementTransaction] st
      JOIN [SettlementBatch] sb ON sb.[batchId] = st.[batchId]
      JOIN [Account] ac ON ac.[accountId] = sb.[accountId]
      WHERE sb.[status] <> 'undone' AND ac.[providerId] = 101 AND st.[cycle] = 'E' AND st.[statusId] = 2
        AND st.[reserveHeldAmt] > 0
      ORDER BY st.[transactionId]`
    const heldIds = heldRows.map((r) => BigInt(r.transactionId))
    expect(heldIds).toHaveLength(4_500)

    const states = await source.reserveStates(101, [...heldIds, a, c], excluded)

    expect(new Set(states.keys())).toEqual(new Set([...heldIds, a]))
    expect([...states.values()].every((s) => s.held !== null)).toBe(true)
  })
})
