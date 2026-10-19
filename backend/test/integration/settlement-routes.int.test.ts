import { randomBytes } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ImportDetail, NextBatchNumber, SettlementPreview, SettlementView } from '@recon/shared'
import argon2 from 'argon2'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, fixtureId } from './helpers.js'
import { type AccountChannelRow, ImportFlow, restoreAccountChannels, snapshotAccountChannels } from './import-flow.js'

// The three settlement routes through the API against SQL Server (settlement-process task 9.2): the composition of
// the module (pre-filled fees from the import service), permission before scope, the identical 404, the number.
const SCOPED_USER = 'zz-settlement-scoped-analyst'
const UNKNOWN = '00000000-0000-4000-8000-00000000ffff'
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let uploadDir: string
let channels: AccountChannelRow[]
let scopedToken: string

async function removeScopedUser(): Promise<void> {
  const user = await ctx.prisma.user.findUnique({ where: { userName: SCOPED_USER }, select: { userId: true } })
  if (!user) return
  const userId = fixtureId(user.userId, 'userId')
  await ctx.prisma.auditLog.deleteMany({ where: { userId } })
  await ctx.prisma.refreshToken.deleteMany({ where: { userId } })
  await ctx.prisma.userMerchant.deleteMany({ where: { userId } })
  await ctx.prisma.user.delete({ where: { userId } })
}

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), 'recon-settlement-routes-int-'))
  ctx = await createTestApp({ UPLOAD_DIR: uploadDir })
  flow = new ImportFlow(ctx)
  await flow.init()
  channels = await snapshotAccountChannels(ctx.prisma)
  await removeScopedUser()
  // A user who may process but only sees merchant 1; its password is random and lives only in this test.
  const password = randomBytes(18).toString('base64url')
  const role = await ctx.prisma.role.findUniqueOrThrow({ where: { name: 'analyst' } })
  await ctx.prisma.user.create({
    data: {
      userName: SCOPED_USER,
      email: 'zz-settlement-scoped-analyst@recon.local',
      displayName: 'Scoped analyst',
      passwordHash: await argon2.hash(password),
      roleId: role.roleId,
      merchantScope: 'assigned',
      merchants: { create: [{ merchantId: 1 }] },
    },
  })
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { userName: SCOPED_USER, password },
  })
  scopedToken = login.json().accessToken
})

afterAll(async () => {
  if (ctx) {
    try {
      await flow.close()
    } finally {
      await restoreAccountChannels(ctx.prisma, channels)
    }
    await removeScopedUser()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true })
})

const asScoped = (url: string, payload: object) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/v1${url}`,
    headers: { authorization: `Bearer ${scopedToken}` },
    payload,
  })

describe('batch-clean through the API', () => {
  it('previews without writing, then processes with the pre-filled fees of GET /imports/{id}', async () => {
    const { importId, runId } = await flow.validatedSample('batch-clean')
    const detail = ImportDetail.parse((await flow.call('GET', `/imports/${importId}`)).json())
    const batchFees = (detail.batchFees ?? []).map((f) => ({
      feeTypeId: f.feeTypeId as number,
      feeId: null,
      amount: f.amount as string,
      description: f.title,
      source: 'file' as const,
    }))
    const body = { runId, confirmChannelAssignment: true, batchFees }

    const preview = await flow.call('POST', `/imports/${importId}/settlements/preview`, body)
    expect(preview.statusCode, preview.body).toBe(200)
    expect(SettlementPreview.parse(preview.json())).toMatchObject({ batchNo: 123, otherFeeAmt: '40.0000' })
    expect(await ctx.prisma.settlementBatch.count({ where: { importId } })).toBe(0)

    const processed = await flow.call('POST', `/imports/${importId}/settlements`, body)
    expect(processed.statusCode, processed.body).toBe(201)
    expect(SettlementView.parse(processed.json())).toMatchObject({
      batchNo: 123,
      status: 'processed',
      otherFeeAmt: '40.0000',
      batchFees: [{ code: 'Wire Fee' }, { code: 'Settlement Fee' }],
    })

    const again = await flow.call('POST', `/imports/${importId}/settlements`, body)
    expect(again.statusCode).toBe(409)
    expect(again.json()).toMatchObject({ code: 'import_not_validated', details: { status: 'processed' } })
    // The number test below expects batch 123 free again, and RAM-07 not assigned yet.
    await flow.removeImports([importId])
    await restoreAccountChannels(ctx.prisma, channels)
  })
})

describe('permission and scope', () => {
  it('viewer gets 403 forbidden on processing and on the preview', async () => {
    for (const url of [`/imports/${UNKNOWN}/settlements`, `/imports/${UNKNOWN}/settlements/preview`]) {
      const res = await flow.call('POST', url, { runId: 1 }, 'viewer')
      expect(res.statusCode, url).toBe(403)
    }
  })

  it('a user of merchant 1 gets for an import of ProviderC-Alt the same 404 as for an unknown one', async () => {
    const { importId, runId } = await flow.validatedSample('legacy-provider')

    for (const suffix of ['settlements', 'settlements/preview']) {
      const outside = await asScoped(`/imports/${importId}/${suffix}`, { runId })
      const unknown = await asScoped(`/imports/${UNKNOWN}/${suffix}`, { runId })
      expect(outside.statusCode, suffix).toBe(404)
      expect(outside.json()).toEqual(unknown.json())
    }
    await flow.removeImports([importId])
  })
})

describe('GET /accounts/{id}/batch-number/next', () => {
  it('proposes 123 for ProviderA-USD (expected.proposedBatchNo)', async () => {
    const res = await flow.call('GET', `/accounts/${flow.accountIds['ProviderA-USD']}/batch-number/next`)

    expect(res.statusCode).toBe(200)
    expect(NextBatchNumber.parse(res.json())).toMatchObject({ batchNo: 123, attemptNo: 1, reason: 'next' })
  })

  it('viewer gets the same 404 for ProviderC-Alt (merchant 2) as for an unknown account', async () => {
    const outside = await flow.call(
      'GET',
      `/accounts/${flow.accountIds['ProviderC-Alt']}/batch-number/next`,
      undefined,
      'viewer',
    )
    const unknown = await flow.call('GET', `/accounts/${UNKNOWN}/batch-number/next`, undefined, 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.json()).toEqual(unknown.json())
  })
})
