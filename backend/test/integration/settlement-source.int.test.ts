import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadSettlementInput } from '../../src/modules/settlement/application/load-settlement-input.js'
import type { SettlementInput } from '../../src/modules/settlement/domain/types.js'
import { PrismaSettlementSource } from '../../src/modules/settlement/infrastructure/prisma-settlement-source.js'
import { settlementSampleInput } from '../../src/modules/settlement/test-support/sample-input.js'
import { createTestApp } from './helpers.js'
import { ImportFlow } from './import-flow.js'

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
