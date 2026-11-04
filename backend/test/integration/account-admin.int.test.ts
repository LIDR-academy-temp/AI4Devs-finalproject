import { AccountDetail, FeeHistoryEntry } from '@recon/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTestApp, fixtureIds, SEED_PASSWORD } from './helpers.js'

// Spec accounts (admin-accounts): "Crear una cuenta", "Nombre de cuenta único en todo el sistema", "Conjunto de
// reglas de una cuenta", "Editar una cuenta", "Cerrar y reabrir una cuenta", "Escrituras de cuentas: permiso y
// alcance", "Auditoría de cuentas", "Canales de solo lectura"; spec fees "Copia de fees al crear cuenta". Against the
// seed: every account a test creates is named it-acc-… and removed after it, with its fees, history and audit.
let ctx: Awaited<ReturnType<typeof createTestApp>>
const tokens: Record<string, string> = {}
const accountIds: Record<string, string> = {}
let legacyRuleSetId: number
const UNKNOWN_UUID = '00000000-0000-4000-8000-00000000ffff'
const RUN = Date.now().toString(36)
let serial = 0

beforeAll(async () => {
  ctx = await createTestApp()
  for (const a of await ctx.prisma.account.findMany({ select: { accountId: true, name: true } }))
    accountIds[a.name] = a.accountId
  legacyRuleSetId = (await ctx.prisma.matchingRuleSet.findFirstOrThrow({ where: { name: 'Provider C legacy' } }))
    .ruleSetId
  for (const userName of ['admin', 'analyst', 'viewer']) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    tokens[userName] = res.json().accessToken
  }
})

/** Removes every it-acc account of this run, in foreign key order. */
afterEach(async () => {
  const { prisma } = ctx
  const created = await prisma.account.findMany({
    where: { name: { startsWith: `it-acc-${RUN}` } },
    select: { accountId: true },
  })
  const ids = fixtureIds(
    created.map((a) => a.accountId),
    'it-acc accounts',
  )
  if (ids.length === 0) return
  const feeIds = (await prisma.fee.findMany({ where: { accountId: { in: ids } }, select: { feeId: true } })).map(
    (f) => f.feeId,
  )
  await prisma.auditLog.deleteMany({
    where: { entityType: 'Account', entityId: { in: ids.map((id) => id.toLowerCase()) } },
  })
  await prisma.feeHistory.deleteMany({ where: { feeId: { in: feeIds } } })
  await prisma.fee.deleteMany({ where: { accountId: { in: ids } } })
  await prisma.account.deleteMany({ where: { accountId: { in: ids } } })
})

afterAll(async () => {
  if (ctx) {
    try {
      // Nothing of this file stays behind.
      expect(await ctx.prisma.account.count({ where: { name: { startsWith: 'it-acc-' } } })).toBe(0)
    } finally {
      await ctx.app.close()
      await ctx.prisma.$disconnect()
    }
  }
})

const nextName = () => `it-acc-${RUN}-${++serial}`

async function call(method: 'GET' | 'POST' | 'PATCH', url: string, as: string | null, payload?: object) {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: as === null ? {} : { authorization: `Bearer ${tokens[as]}` },
    ...(payload === undefined ? {} : { payload }),
  })
}

async function create(body: Record<string, unknown>, providerId = 201) {
  const res = await call('POST', `/providers/${providerId}/accounts`, 'admin', {
    chargebackReservePolicy: 'hold_until_term',
    ...body,
  })
  expect(res.statusCode, res.body).toBe(201)
  return AccountDetail.parse(res.json())
}

const audits = (accountId: string) =>
  ctx.prisma.auditLog.findMany({
    where: { entityType: 'Account', entityId: accountId.toLowerCase() },
    orderBy: { auditId: 'asc' },
  })

describe('POST /providers/{id}/accounts', () => {
  it('creates an active account without fees or channels, created by admin ("Cuenta mínima")', async () => {
    const name = nextName()

    const account = await create({ name: `  ${name}  ` })

    expect(account).toMatchObject({
      name,
      providerId: 201,
      isActive: true,
      rollingReserveCapAmt: null,
      matchingRuleSetId: null,
      createdBy: { userName: 'admin' },
      merchant: { merchantId: 2 },
    })
    expect((await call('GET', `/accounts/${account.accountId}/fees`, 'admin')).json()).toEqual([])
    expect((await call('GET', `/accounts/${account.accountId}/channels`, 'admin')).json()).toEqual([])
  })

  it('normalizes the cap and audits the creation ("Tope de reserva normalizado", "Alta auditada")', async () => {
    const account = await create({ name: nextName(), rollingReserveCapAmt: '25000' })

    expect(account.rollingReserveCapAmt).toBe('25000.0000')
    const [entry, ...rest] = await audits(account.accountId)
    expect(rest).toEqual([])
    expect(entry).toMatchObject({ action: 'account.create', userId: expect.any(Number) })
    expect(JSON.parse(entry!.detailJson!)).toEqual({
      name: account.name,
      providerId: 201,
      chargebackReservePolicy: 'hold_until_term',
      rollingReserveCapAmt: '25000.0000',
      matchingRuleSetId: null,
      copyFeesFromAccountId: null,
      copiedFees: [],
    })
  })

  it.each([
    { title: 'a negative cap', body: { rollingReserveCapAmt: '-1' }, field: 'rollingReserveCapAmt' },
    {
      title: 'a rule set of another provider',
      body: () => ({ matchingRuleSetId: legacyRuleSetId }),
      field: 'matchingRuleSetId',
      providerId: 101,
    },
    { title: 'an unknown rule set', body: { matchingRuleSetId: 999999 }, field: 'matchingRuleSetId' },
    {
      title: 'a fee source of another provider',
      body: () => ({ copyFeesFromAccountId: accountIds['ProviderA-USD'] }),
      field: 'copyFeesFromAccountId',
    },
    { title: 'an unknown fee source', body: { copyFeesFromAccountId: UNKNOWN_UUID }, field: 'copyFeesFromAccountId' },
  ])('answers 400 on $field for $title and creates nothing', async ({ body, field, providerId = 201 }) => {
    const name = nextName()

    const res = await call('POST', `/providers/${providerId}/accounts`, 'admin', {
      name,
      chargebackReservePolicy: 'hold_until_term',
      ...(typeof body === 'function' ? body() : body),
    })

    expect(res.statusCode, res.body).toBe(400)
    expect(res.json()).toMatchObject({ code: 'validation_error', details: { field } })
    expect(await ctx.prisma.account.count({ where: { name } })).toBe(0)
  })

  it('links the account to the rule set of its provider', async () => {
    expect((await create({ name: nextName(), matchingRuleSetId: legacyRuleSetId })).matchingRuleSetId).toBe(
      legacyRuleSetId,
    )
  })
})

describe('name unique across the system', () => {
  it.each([
    { title: 'another account of the provider, ignoring case (database collation, D5)', name: 'providerc-usd' },
    { title: 'an account of another provider', name: 'ProviderA-USD' },
  ])('answers 409 account_name_taken for the name of $title', async ({ name }) => {
    const before = await ctx.prisma.account.count()

    const res = await call('POST', '/providers/201/accounts', 'admin', {
      name,
      chargebackReservePolicy: 'hold_until_term',
    })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('account_name_taken')
    expect(await ctx.prisma.account.count()).toBe(before)
  })

  it('answers 409 to a rename to a name in use and keeps the name', async () => {
    const account = await create({ name: nextName() })

    const res = await call('PATCH', `/accounts/${account.accountId}`, 'admin', { name: 'ProviderC-Alt' })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('account_name_taken')
    expect((await call('GET', `/accounts/${account.accountId}`, 'admin')).json().name).toBe(account.name)
  })
})

describe('copy of fees', () => {
  it('copies the five fees of ProviderC-USD with open validity and leaves the source unchanged', async () => {
    const sourceUrl = `/accounts/${accountIds['ProviderC-USD']}/fees`
    const source = (await call('GET', sourceUrl, 'admin')).json()

    const account = await create({ name: nextName(), copyFeesFromAccountId: accountIds['ProviderC-USD'] })
    const copies = (await call('GET', `/accounts/${account.accountId}/fees`, 'admin')).json()

    expect(copies.map((f: { feeTypeId: number }) => f.feeTypeId).sort()).toEqual([1, 2, 3, 4, 5])
    for (const copy of copies) {
      const original = source.find((f: { feeTypeId: number }) => f.feeTypeId === copy.feeTypeId)
      expect(copy).toMatchObject({
        fixedAmount: original.fixedAmount,
        percentage: original.percentage,
        conditionalPercentage: original.conditionalPercentage,
        description: original.description,
        startDate: null,
        endDate: null,
        status: 'active',
        inUse: false,
        createdBy: { userName: 'admin' },
      })
    }
    expect((await call('GET', sourceUrl, 'admin')).json()).toEqual(source)
  })

  it('writes one copied history row per copy and the pairs in account.create ("Historial de la copia")', async () => {
    const account = await create({ name: nextName(), copyFeesFromAccountId: accountIds['ProviderC-USD'] })
    const copies = (await call('GET', `/accounts/${account.accountId}/fees`, 'admin')).json()

    for (const copy of copies) {
      const history = z.array(FeeHistoryEntry).parse((await call('GET', `/fees/${copy.feeId}/history`, 'admin')).json())
      expect(history).toHaveLength(1)
      expect(history[0]).toMatchObject({
        action: 'copied',
        before: null,
        after: { feeTypeId: copy.feeTypeId, startDate: null, endDate: null },
        changedBy: { userName: 'admin' },
        reason: null,
      })
    }
    const detail = JSON.parse((await audits(account.accountId))[0]!.detailJson!)
    expect(detail.copyFeesFromAccountId.toLowerCase()).toBe(accountIds['ProviderC-USD']!.toLowerCase())
    expect(detail.copiedFees.map((p: { feeId: string }) => p.feeId.toLowerCase()).sort()).toEqual(
      copies.map((c: { feeId: string }) => c.feeId.toLowerCase()).sort(),
    )
  })

  it('copies from a closed account of the provider ("Cuenta origen cerrada")', async () => {
    const source = await create({ name: nextName(), copyFeesFromAccountId: accountIds['ProviderC-USD'] })
    expect((await call('PATCH', `/accounts/${source.accountId}`, 'admin', { isActive: false })).statusCode).toBe(200)

    const account = await create({ name: nextName(), copyFeesFromAccountId: source.accountId })

    expect((await call('GET', `/accounts/${account.accountId}/fees`, 'admin')).json()).toHaveLength(5)
  })
})

describe('PATCH /accounts/{id}', () => {
  it('changes policy and cap, moves updatedAt and audits account.update ("Cambiar política y tope")', async () => {
    const account = await create({ name: nextName() })

    const res = await call('PATCH', `/accounts/${account.accountId}`, 'admin', {
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000',
    })

    expect(res.statusCode, res.body).toBe(200)
    const edited = AccountDetail.parse(res.json())
    expect(edited).toMatchObject({
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000.0000',
    })
    expect(edited.updatedAt >= account.updatedAt).toBe(true)
    const entry = (await audits(account.accountId)).at(-1)!
    expect(entry.action).toBe('account.update')
    expect(JSON.parse(entry.detailJson!)).toEqual({
      changes: {
        chargebackReservePolicy: { before: 'hold_until_term', after: 'release_on_chargeback' },
        rollingReserveCapAmt: { before: null, after: '1000.0000' },
      },
    })
  })

  it('answers 200 without audit and without moving updatedAt when nothing changes', async () => {
    const account = await create({ name: nextName() })

    const res = await call('PATCH', `/accounts/${account.accountId}`, 'admin', {
      name: account.name,
      chargebackReservePolicy: 'hold_until_term',
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().updatedAt).toBe(account.updatedAt)
    expect((await audits(account.accountId)).map((a) => a.action)).toEqual(['account.create'])
  })

  it('closes with a reason and reopens, each audited ("Cerrar", "Reabrir", "Cierre auditado con cambios")', async () => {
    const account = await create({ name: nextName(), rollingReserveCapAmt: '1000' })

    const closed = await call('PATCH', `/accounts/${account.accountId}`, 'admin', {
      isActive: false,
      rollingReserveCapAmt: null,
      reason: 'closing',
    })
    const listed = (await call('GET', '/providers/201/accounts', 'admin')).json()
    const reopened = await call('PATCH', `/accounts/${account.accountId}`, 'admin', { isActive: true })

    expect(closed.json()).toMatchObject({ isActive: false, rollingReserveCapAmt: null })
    expect(listed.find((a: { accountId: string }) => a.accountId === account.accountId)?.isActive).toBe(false)
    expect(reopened.json().isActive).toBe(true)
    const entries = await audits(account.accountId)
    expect(entries.map((a) => a.action)).toEqual(['account.create', 'account.close', 'account.reopen'])
    expect(JSON.parse(entries[1]!.detailJson!)).toEqual({
      changes: {
        rollingReserveCapAmt: { before: '1000.0000', after: null },
        isActive: { before: true, after: false },
      },
      reason: 'closing',
    })
  })

  it('unlinks the rule set with null ("Desenlazar")', async () => {
    const account = await create({ name: nextName(), matchingRuleSetId: legacyRuleSetId })

    const res = await call('PATCH', `/accounts/${account.accountId}`, 'admin', { matchingRuleSetId: null })

    expect(res.json().matchingRuleSetId).toBeNull()
  })
})

describe('permission and scope of the writes', () => {
  it('answers 401 without a token', async () => {
    const res = await call('POST', '/providers/201/accounts', null, {
      name: nextName(),
      chargebackReservePolicy: 'hold_until_term',
    })

    expect(res.statusCode).toBe(401)
  })

  it.each(['analyst', 'viewer'])('answers 403 to %s, also for an account outside its scope', async (as) => {
    const post = await call('POST', '/providers/201/accounts', as, {
      name: nextName(),
      chargebackReservePolicy: 'hold_until_term',
    })
    const patch = await call('PATCH', `/accounts/${accountIds['ProviderC-USD']}`, as, { isActive: false })

    expect([post.statusCode, patch.statusCode]).toEqual([403, 403])
    expect((await call('GET', `/accounts/${accountIds['ProviderC-USD']}`, 'admin')).json().isActive).toBe(true)
  })

  it('answers 404 for an unknown provider or account, with the same body', async () => {
    const provider = await call('POST', '/providers/999/accounts', 'admin', {
      name: nextName(),
      chargebackReservePolicy: 'hold_until_term',
    })
    const account = await call('PATCH', `/accounts/${UNKNOWN_UUID}`, 'admin', { isActive: false })

    expect([provider.statusCode, account.statusCode]).toEqual([404, 404])
    expect(provider.json().code).toBe('not_found')
    expect(account.json().code).toBe('not_found')
  })
})

describe('channels stay read-only', () => {
  it('creating, editing, closing and reopening leave AccountChannel as it was ("Canales de solo lectura")', async () => {
    const snapshot = () =>
      ctx.prisma.accountChannel.findMany({
        select: { accountId: true, channelId: true, isPrimary: true },
        orderBy: [{ channelId: 'asc' }, { accountId: 'asc' }],
      })
    const before = await snapshot()

    const account = await create({ name: nextName() }, 101)
    await call('PATCH', `/accounts/${account.accountId}`, 'admin', { name: nextName(), isActive: false })
    await call('PATCH', `/accounts/${account.accountId}`, 'admin', { isActive: true })

    expect(await snapshot()).toEqual(before)
    const unassigned = (await call('GET', '/channels?unassigned=true', 'admin')).json()
    expect(unassigned.map((c: { name: string }) => c.name)).toEqual(['RAM-07', 'RAM-13'])
  })
})
