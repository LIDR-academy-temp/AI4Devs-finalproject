import { AccountFee, FeeUpdateResult } from '@recon/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { PrismaFeeAdminRepository } from '../../src/modules/fees/infrastructure/prisma-fee-admin-repository.js'
import { createTestApp, fixtureIds, SEED_PASSWORD } from './helpers.js'

// Spec fees (admin-fees): "Crear un fee", "Reglas de un fee válido", "Corregir un fee en el sitio", "Campos editables
// de un fee en uso", "Cerrar la vigencia de un fee", "Cambiar un fee desde una fecha", "Límites del cambio desde una
// fecha", "Solapes al administrar fees", "Vigencia con NULL como infinito", "Historial", "Auditoría de los cambios de
// fees", "Permisos y alcance de la administración de fees". Against the seed; every test removes what it wrote.
let ctx: Awaited<ReturnType<typeof createTestApp>>
const tokens: Record<string, string> = {}
const accountIds: Record<string, string> = {}
const feeTypeIds: Record<string, number> = {}

/** Fees created by a test (deleted after it) and seed fees it modified (restored after it). */
let created: string[] = []
let touched: { feeId: string; row: Record<string, unknown> }[] = []
let startedAt: Date

beforeAll(async () => {
  ctx = await createTestApp()
  for (const a of await ctx.prisma.account.findMany({ select: { accountId: true, name: true } }))
    accountIds[a.name] = a.accountId
  for (const t of await ctx.prisma.feeType.findMany({ select: { feeTypeId: true, code: true } }))
    feeTypeIds[t.code] = t.feeTypeId
  for (const userName of ['admin', 'analyst', 'viewer']) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    tokens[userName] = res.json().accessToken
  }
})

afterEach(async () => {
  const ids = fixtureIds([...created, ...touched.map((t) => t.feeId)], 'fee ids')
  const lower = ids.map((id) => id.toLowerCase())
  await ctx.prisma.auditLog.deleteMany({
    where: { entityType: 'Fee', entityId: { in: lower }, createdAt: { gte: startedAt } },
  })
  await ctx.prisma.feeHistory.deleteMany({ where: { feeId: { in: ids }, changedAt: { gte: startedAt } } })
  await ctx.prisma.fee.deleteMany({ where: { feeId: { in: fixtureIds(created, 'created fees') } } })
  for (const { feeId, row } of touched) await ctx.prisma.fee.update({ where: { feeId }, data: row })
  created = []
  touched = []
})

afterAll(async () => {
  if (ctx) {
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
})

const begin = () => {
  startedAt = new Date(Date.now() - 1000)
}

async function call(method: 'GET' | 'POST' | 'PATCH', url: string, as: string, payload?: object) {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: { authorization: `Bearer ${tokens[as]}` },
    ...(payload === undefined ? {} : { payload }),
  })
}

async function createFee(account: string, body: object) {
  const res = await call('POST', `/accounts/${accountIds[account]}/fees`, 'admin', body)
  if (res.statusCode === 201) created.push(res.json().feeId)
  return res
}

/** A seed fee of merchant 1 already applied by processed batches, with its last applied business day. */
async function feeInUse(code: string) {
  const fee = await ctx.prisma.fee.findFirstOrThrow({
    where: {
      feeType: { code },
      account: { provider: { merchantId: 1 } },
      appliedFees: { some: { eventDate: { not: null } } },
    },
  })
  const latest = await ctx.prisma.settlementTransactionFee.aggregate({
    where: { feeId: fee.feeId },
    _max: { eventDate: true },
  })
  const { feeId, fixedAmount, percentage, startDate, endDate, description } = fee
  touched.push({ feeId, row: { fixedAmount, percentage, startDate, endDate, description } })
  return { fee, lastAppliedEventDate: latest._max.eventDate!.toISOString().slice(0, 10) }
}

const historyOf = (feeId: string) =>
  ctx.prisma.feeHistory.findMany({ where: { feeId, changedAt: { gte: startedAt } }, orderBy: { feeHistoryId: 'asc' } })

describe('POST /accounts/{id}/fees', () => {
  it('creates a fee with open validity: active, not in use, created by admin, with history and audit', async () => {
    begin()
    const res = await createFee('ProviderA-USD', { feeTypeId: feeTypeIds['Wire Fee'], fixedAmount: '15.0000' })

    expect(res.statusCode, res.body).toBe(201)
    const fee = AccountFee.parse(res.json())
    expect(fee).toMatchObject({
      fixedAmount: '15.0000',
      percentage: null,
      startDate: null,
      endDate: null,
      status: 'active',
      inUse: false,
      lastAppliedEventDate: null,
      createdBy: { userName: 'admin' },
    })
    const [history] = await historyOf(fee.feeId)
    expect(history).toMatchObject({ action: 'created', beforeJson: null })
    expect(JSON.parse(history!.afterJson)).toMatchObject({ fixedAmount: '15.0000', startDate: null })
    expect(
      await ctx.prisma.auditLog.count({
        where: { action: 'fee.create', entityType: 'Fee', entityId: fee.feeId.toLowerCase() },
      }),
    ).toBe(1)
  })

  it('answers 400 validation_error with details.field and writes nothing', async () => {
    begin()
    const before = await ctx.prisma.fee.count()
    for (const [body, field] of [
      [{ feeTypeId: feeTypeIds['Wire Fee'] }, 'fixedAmount'],
      [
        { feeTypeId: feeTypeIds['Wire Fee'], fixedAmount: '1', startDate: '2027-02-01', endDate: '2027-01-31' },
        'endDate',
      ],
      [{ feeTypeId: 999, fixedAmount: '1' }, 'feeTypeId'],
    ] as const) {
      const res = await createFee('ProviderA-USD', body)
      expect(res.statusCode, JSON.stringify(body)).toBe(400)
      expect(res.json()).toMatchObject({ code: 'validation_error', details: { field } })
    }
    expect(await ctx.prisma.fee.count()).toBe(before)
  })

  it('takes a scheduled fee next to the current one; contiguous ends do not overlap', async () => {
    begin()
    const current = await createFee('ProviderA-USD', {
      feeTypeId: feeTypeIds['Wire Fee'],
      fixedAmount: '15',
      endDate: '2026-12-31',
    })
    const next = await createFee('ProviderA-USD', {
      feeTypeId: feeTypeIds['Wire Fee'],
      fixedAmount: '17',
      startDate: '2027-01-01',
    })

    expect(current.statusCode, current.body).toBe(201)
    expect(next.statusCode, next.body).toBe(201)
    expect(next.json().status).toBe('scheduled')
  })

  it('answers 409 fee_overlap with the conflicting fee and writes nothing', async () => {
    begin()
    const mdr = await ctx.prisma.fee.findFirstOrThrow({
      where: { accountId: accountIds['ProviderA-USD'], feeType: { code: 'MDR' } },
    })

    const res = await createFee('ProviderA-USD', {
      feeTypeId: mdr.feeTypeId,
      percentage: '0.09',
      startDate: '2026-11-01',
    })

    expect(res.statusCode, res.body).toBe(409)
    expect(res.json()).toMatchObject({
      code: 'fee_overlap',
      details: { conflicts: [{ startDate: null, endDate: null }] },
    })
    expect(res.json().details.conflicts[0].feeId.toLowerCase()).toBe(mdr.feeId.toLowerCase())
  })

  it('a fee of another type does not overlap', async () => {
    begin()
    const res = await createFee('ProviderA-USD', { feeTypeId: feeTypeIds['Annual Fee'], fixedAmount: '500' })
    expect(res.statusCode, res.body).toBe(201)
  })

  it('answers 403 to analyst and writes nothing', async () => {
    const before = await ctx.prisma.fee.count()
    const res = await call('POST', `/accounts/${accountIds['ProviderA-USD']}/fees`, 'analyst', {
      feeTypeId: feeTypeIds['Wire Fee'],
      fixedAmount: '15',
    })
    expect(res.statusCode).toBe(403)
    expect(await ctx.prisma.fee.count()).toBe(before)
  })

  // Only admin has fee.manage and its scope is all: the out-of-scope 404 is covered by the service and route tests.
  it('answers 404 not_found for an unknown account', async () => {
    const unknown = await call('POST', '/accounts/00000000-0000-4000-8000-00000000ffff/fees', 'admin', {
      feeTypeId: feeTypeIds['Wire Fee'],
      fixedAmount: '15',
    })
    expect(unknown.statusCode).toBe(404)
    expect(unknown.json().code).toBe('not_found')
  })
})

describe('PATCH /fees/{id}: in-place correction and closing', () => {
  it('corrects every field of a fee without use, as updated, with reason', async () => {
    begin()
    const fee = (await createFee('ProviderA-USD', { feeTypeId: feeTypeIds['Wire Fee'], fixedAmount: '15' })).json()

    const res = await call('PATCH', `/fees/${fee.feeId}`, 'admin', {
      fixedAmount: '16.5',
      startDate: '2026-01-01',
      reason: 'typo',
    })

    expect(res.statusCode, res.body).toBe(200)
    expect(FeeUpdateResult.parse(res.json())).toMatchObject({
      fee: { fixedAmount: '16.5000', startDate: '2026-01-01' },
      successor: null,
    })
    const history = await historyOf(fee.feeId)
    expect(history.map((h) => h.action)).toEqual(['created', 'updated'])
    expect(history[1]).toMatchObject({ reason: 'typo' })
    expect(JSON.parse(history[1]!.beforeJson!)).toMatchObject({ fixedAmount: '15.0000' })
    expect(JSON.parse(history[1]!.afterJson)).toMatchObject({ fixedAmount: '16.5000' })
  })

  it('answers 409 fee_in_use naming the fields when the values of a fee in use change', async () => {
    begin()
    const { fee } = await feeInUse('MDR')

    const res = await call('PATCH', `/fees/${fee.feeId}`, 'admin', { percentage: '0.030000' })

    expect(res.statusCode, res.body).toBe(409)
    expect(res.json()).toMatchObject({ code: 'fee_in_use', details: { fields: ['percentage'] } })
    expect((await ctx.prisma.fee.findUniqueOrThrow({ where: { feeId: fee.feeId } })).percentage?.toFixed(6)).toBe(
      fee.percentage?.toFixed(6),
    )
  })

  it('takes the description of a fee in use, audited as fee.update', async () => {
    begin()
    const { fee } = await feeInUse('MDR')

    const res = await call('PATCH', `/fees/${fee.feeId}`, 'admin', { description: 'Renegotiated in 2027' })

    expect(res.statusCode, res.body).toBe(200)
    expect(res.json().fee).toMatchObject({ description: 'Renegotiated in 2027', inUse: true })
    expect(
      await ctx.prisma.auditLog.findFirst({
        where: { action: 'fee.update', entityId: fee.feeId.toLowerCase(), createdAt: { gte: startedAt } },
        select: { userId: true },
      }),
    ).toBeTruthy()
  })

  it('closes a fee in use on its last applied event, and refuses an earlier day', async () => {
    begin()
    const { fee, lastAppliedEventDate } = await feeInUse('TRX Fee - Deposit')
    const dayBefore = new Date(Date.parse(`${lastAppliedEventDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

    const early = await call('PATCH', `/fees/${fee.feeId}`, 'admin', { endDate: dayBefore })
    const onTime = await call('PATCH', `/fees/${fee.feeId}`, 'admin', { endDate: lastAppliedEventDate })

    expect(early.statusCode, early.body).toBe(409)
    expect(early.json()).toMatchObject({ code: 'fee_in_use', details: { lastAppliedEventDate } })
    expect(onTime.statusCode, onTime.body).toBe(200)
    expect(onTime.json().fee).toMatchObject({ endDate: lastAppliedEventDate, lastAppliedEventDate })
    expect((await historyOf(fee.feeId)).map((h) => h.action)).toEqual(['closed'])
  })

  it('answers 409 fee_overlap when a correction overlaps another fee of the type', async () => {
    begin()
    const first = (
      await createFee('ProviderA-USD', { feeTypeId: feeTypeIds['Wire Fee'], fixedAmount: '5', endDate: '2026-12-31' })
    ).json()
    const second = (
      await createFee('ProviderA-USD', { feeTypeId: feeTypeIds['Wire Fee'], fixedAmount: '6', startDate: '2027-01-01' })
    ).json()

    const res = await call('PATCH', `/fees/${second.feeId}`, 'admin', { startDate: '2026-12-15' })

    expect(res.statusCode, res.body).toBe(409)
    expect(res.json().details.conflicts.map((c: { feeId: string }) => c.feeId.toLowerCase())).toEqual([
      first.feeId.toLowerCase(),
    ])
  })
})

describe('PATCH /fees/{id}: change from a date', () => {
  it('closes the fee the day before and opens the successor; processed movements keep their fee', async () => {
    begin()
    const { fee, lastAppliedEventDate } = await feeInUse('MDR')
    const applied = await ctx.prisma.settlementTransactionFee.findMany({
      where: { feeId: fee.feeId },
      select: { appliedFeeId: true, amountUsd: true, configurationSnapshot: true },
      orderBy: { appliedFeeId: 'asc' },
      take: 20,
    })
    const effectiveFrom = new Date(Date.parse(`${lastAppliedEventDate}T00:00:00Z`) + 86_400_000)
      .toISOString()
      .slice(0, 10)

    const res = await call('PATCH', `/fees/${fee.feeId}`, 'admin', { effectiveFrom, percentage: '0.095' })

    expect(res.statusCode, res.body).toBe(200)
    const result = FeeUpdateResult.parse(res.json())
    created.push(result.successor!.feeId)
    expect(result.fee).toMatchObject({ endDate: lastAppliedEventDate })
    expect(result.successor).toMatchObject({
      startDate: effectiveFrom,
      endDate: null,
      percentage: '0.095000',
      inUse: false,
    })
    expect((await historyOf(fee.feeId)).map((h) => h.action)).toEqual(['closed'])
    expect((await historyOf(result.successor!.feeId)).map((h) => h.action)).toEqual(['created'])
    const audit = await ctx.prisma.auditLog.findFirstOrThrow({
      where: { action: 'fee.change', entityId: fee.feeId.toLowerCase(), createdAt: { gte: startedAt } },
    })
    expect(JSON.parse(audit.detailJson!)).toMatchObject({ successorFeeId: result.successor!.feeId, effectiveFrom })
    expect(
      await ctx.prisma.settlementTransactionFee.findMany({
        where: { appliedFeeId: { in: applied.map((a) => a.appliedFeeId) } },
        select: { appliedFeeId: true, amountUsd: true, configurationSnapshot: true },
        orderBy: { appliedFeeId: 'asc' },
      }),
    ).toEqual(applied)
  })

  it('answers 409 fee_in_use when the day before is earlier than the last applied event', async () => {
    begin()
    const { fee, lastAppliedEventDate } = await feeInUse('MDR')
    const count = await ctx.prisma.fee.count()

    const res = await call('PATCH', `/fees/${fee.feeId}`, 'admin', {
      effectiveFrom: lastAppliedEventDate,
      percentage: '0.095',
    })

    expect(res.statusCode, res.body).toBe(409)
    expect(res.json()).toMatchObject({ code: 'fee_in_use', details: { lastAppliedEventDate } })
    expect(await ctx.prisma.fee.count()).toBe(count)
  })

  it('answers 400 validation_error with details.field = effectiveFrom outside the validity', async () => {
    begin()
    const fee = (
      await createFee('ProviderA-USD', {
        feeTypeId: feeTypeIds['Wire Fee'],
        fixedAmount: '15',
        startDate: '2027-01-01',
      })
    ).json()

    const res = await call('PATCH', `/fees/${fee.feeId}`, 'admin', { effectiveFrom: '2027-01-01', fixedAmount: '1' })

    expect(res.statusCode, res.body).toBe(400)
    expect(res.json()).toMatchObject({ code: 'validation_error', details: { field: 'effectiveFrom' } })
  })
})

describe('atomicity and the trigger backstop', () => {
  it('a failure in the middle of the unit of work leaves no fee, history or audit', async () => {
    begin()
    const repo = new PrismaFeeAdminRepository(ctx.prisma)
    const feeId = '0f0f0f0f-0000-4000-8000-00000000abcd'
    const admin = await ctx.prisma.user.findUniqueOrThrow({ where: { userName: 'admin' } })
    const fee = {
      feeId,
      feeTypeId: feeTypeIds['Wire Fee']!,
      fixedAmount: '15.0000',
      percentage: null,
      conditionalPercentage: null,
      conditionThresholdAmt: null,
      brandFixedAmount: null,
      brandPercentage: null,
      startDate: null,
      endDate: null,
      description: null,
    }

    await expect(
      repo.inAccount({ merchantIds: [1, 2] }, accountIds['ProviderA-USD']!, async (unit) => {
        await unit.insert(accountIds['ProviderA-USD']!, fee, admin.userId)
        await unit.history({ feeId, action: 'created', before: null, after: fee, reason: null, userId: admin.userId })
        throw new Error('failure after the writes')
      }),
    ).rejects.toThrow('failure after the writes')

    expect(await ctx.prisma.fee.count({ where: { feeId } })).toBe(0)
    expect(await ctx.prisma.feeHistory.count({ where: { feeId } })).toBe(0)
  })

  it('the trigger rejects a direct write that overlaps a fee of the same type and account', async () => {
    const mdr = await ctx.prisma.fee.findFirstOrThrow({
      where: { accountId: accountIds['ProviderA-USD'], feeType: { code: 'MDR' } },
    })

    await expect(
      ctx.prisma.fee.create({
        data: {
          feeId: '0f0f0f0f-0000-4000-8000-00000000abce',
          accountId: mdr.accountId,
          feeTypeId: mdr.feeTypeId,
          percentage: '0.05',
          startDate: new Date('2027-01-01T00:00:00Z'),
          createdByUserId: mdr.createdByUserId,
        },
      }),
    ).rejects.toThrow()
  })
})
