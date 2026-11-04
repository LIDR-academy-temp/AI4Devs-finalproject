import { randomUUID } from 'node:crypto'
import { MatchingRuleSetDetail } from '@recon/shared'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestApp, fixtureIds, SEED_PASSWORD } from './helpers.js'

// Spec matching (admin-matching): "Crear un conjunto de reglas", "Detalle de un conjunto de reglas", "Editar un
// conjunto de reglas", "Nombre de conjunto único por proveedor", "Desactivar un conjunto en uso", "Permiso y alcance
// de las escrituras de reglas" and "Auditoría de las reglas de pareo", by HTTP against the seed (design D3, D8).
// Every set a test creates is named it-rs-… (or tracked by id) and removed after it, with its rules and audit; the
// seed's "Provider C legacy" is only read or sent unchanged.
let ctx: Awaited<ReturnType<typeof createTestApp>>
const tokens: Record<string, string> = {}
let legacyId: number
let adminId: number
const RUN = Date.now().toString(36)
let serial = 0
/** Sets created under a name without the it-rs prefix ("Mismo nombre en otro proveedor"). */
const tracked: number[] = []

beforeAll(async () => {
  ctx = await createTestApp()
  legacyId = (await ctx.prisma.matchingRuleSet.findFirstOrThrow({ where: { name: 'Provider C legacy' } })).ruleSetId
  adminId = (await ctx.prisma.user.findUniqueOrThrow({ where: { userName: 'admin' } })).userId
  for (const userName of ['admin', 'analyst', 'viewer']) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    tokens[userName] = res.json().accessToken
  }
})

/** Removes every set of this run and the it-acc accounts linked to them, in foreign key order. */
afterEach(async () => {
  const { prisma } = ctx
  const sets = await prisma.matchingRuleSet.findMany({
    where: { OR: [{ name: { startsWith: `it-rs-${RUN}` } }, { ruleSetId: { in: [...tracked] } }] },
    select: { ruleSetId: true },
  })
  tracked.length = 0
  const ids = fixtureIds(
    sets.map((s) => s.ruleSetId),
    'it-rs sets',
  )
  await prisma.account.deleteMany({ where: { name: { startsWith: `it-acc-${RUN}` } } })
  if (ids.length === 0) return
  await prisma.auditLog.deleteMany({ where: { entityType: 'MatchingRuleSet', entityId: { in: ids.map(String) } } })
  await prisma.matchingSheetRule.deleteMany({ where: { ruleSetId: { in: ids } } })
  await prisma.matchingColumnRule.deleteMany({ where: { ruleSetId: { in: ids } } })
  await prisma.matchingRuleSet.deleteMany({ where: { ruleSetId: { in: ids } } })
})

afterAll(async () => {
  if (ctx) {
    try {
      expect(await ctx.prisma.matchingRuleSet.count({ where: { name: { startsWith: 'it-rs-' } } })).toBe(0)
    } finally {
      await ctx.app.close()
      await ctx.prisma.$disconnect()
    }
  }
})

const nextName = () => `it-rs-${RUN}-${++serial}`

async function call(method: 'GET' | 'POST' | 'PUT', url: string, as: string | null, payload?: object) {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: as === null ? {} : { authorization: `Bearer ${tokens[as]}` },
    ...(payload === undefined ? {} : { payload }),
  })
}

const sheet = (sheetPattern: string, overrides: object = {}) => ({
  sheetPattern,
  isRegex: false,
  kind: 'transactions',
  cycle: 'E',
  statusId: null,
  priority: 10,
  ...overrides,
})
const column = (columnPattern: string, targetField: string, overrides: object = {}) => ({
  sheetPattern: null,
  columnPattern,
  isRegex: false,
  targetField,
  priority: 5,
  ...overrides,
})

async function create(body: Record<string, unknown>, providerId = 201) {
  const res = await call('POST', `/providers/${providerId}/matching-rule-sets`, 'admin', body)
  expect(res.statusCode, res.body).toBe(201)
  return MatchingRuleSetDetail.parse(res.json())
}

async function detail(ruleSetId: number) {
  const res = await call('GET', `/matching-rule-sets/${ruleSetId}`, 'analyst')
  expect(res.statusCode, res.body).toBe(200)
  return MatchingRuleSetDetail.parse(res.json())
}

/** The detail as a PUT body: without rule ids nor the read-only lists. */
function bodyOf(d: MatchingRuleSetDetail, overrides: Record<string, unknown> = {}) {
  return {
    name: d.name,
    isActive: d.isActive,
    sheetRules: d.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
    columnRules: d.columnRules.map(({ columnRuleId: _, ...r }) => r),
    ...overrides,
  }
}

/** A copy of the legacy set under an it-rs name, to edit freely. */
async function legacyCopy() {
  return create({ ...bodyOf(await detail(legacyId)), name: nextName() })
}

const audits = (ruleSetId: number) =>
  ctx.prisma.auditLog.findMany({
    where: { entityType: 'MatchingRuleSet', entityId: String(ruleSetId) },
    orderBy: { auditId: 'asc' },
  })

const writeCounts = async () => ({
  sets: await ctx.prisma.matchingRuleSet.count(),
  sheetRules: await ctx.prisma.matchingSheetRule.count(),
  columnRules: await ctx.prisma.matchingColumnRule.count(),
  auditLog: await ctx.prisma.auditLog.count(),
})

describe('POST /providers/{id}/matching-rule-sets', () => {
  it('creates the set without accounts, lists it and audits it ("Conjunto nuevo en Provider C")', async () => {
    const name = nextName()

    const set = await create({
      name: ` ${name} `,
      sheetRules: [sheet('Transactions')],
      columnRules: [column('Txn Ref', 'transactionId')],
    })

    expect(set).toMatchObject({ name, isActive: true, provider: { providerId: 201 }, accounts: [], rowIgnoreRules: [] })
    expect(set.sheetRules).toMatchObject([{ sheetPattern: 'Transactions', isActive: true }])
    expect(set.columnRules).toMatchObject([{ columnPattern: 'Txn Ref', isActive: true }])
    const list = (await call('GET', '/providers/201/matching-rule-sets', 'analyst')).json() as { name: string }[]
    expect(list.map((s) => s.name)).toContain(name)
    const [entry, ...rest] = await audits(set.ruleSetId)
    expect(rest).toEqual([])
    expect(entry).toMatchObject({ action: 'matching_rule_set.create', userId: adminId })
    expect(JSON.parse(entry!.detailJson!)).toMatchObject({ providerId: 201, name, isActive: true })
  })

  it('creates an empty set from a name only ("Conjunto vacío")', async () => {
    const set = await create({ name: nextName() })

    expect([set.sheetRules, set.columnRules]).toEqual([[], []])
  })

  it('answers 409 rule_set_name_taken to the legacy name in capitals, creating nothing', async () => {
    const before = await writeCounts()

    const res = await call('POST', '/providers/201/matching-rule-sets', 'admin', { name: 'PROVIDER C LEGACY' })

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('rule_set_name_taken')
    expect(await writeCounts()).toEqual(before)
  })

  it('accepts the legacy name in another provider ("Mismo nombre en otro proveedor")', async () => {
    const res = await call('POST', '/providers/101/matching-rule-sets', 'admin', { name: 'Provider C legacy' })
    if (res.statusCode === 201) tracked.push(res.json().ruleSetId)

    expect(res.statusCode, res.body).toBe(201)
  })

  it('answers 400 with details.field to a batch_fees sheet with a cycle, writing nothing', async () => {
    const before = await writeCounts()

    const res = await call('POST', '/providers/201/matching-rule-sets', 'admin', {
      name: nextName(),
      sheetRules: [sheet('Other Fees', { kind: 'batch_fees', cycle: 'E' })],
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ code: 'validation_error', details: { field: 'sheetRules[0].cycle' } })
    expect(await writeCounts()).toEqual(before)
  })

  it('answers 400 validation_error to providerId in the body ("Campo desconocido")', async () => {
    const res = await call('POST', '/providers/201/matching-rule-sets', 'admin', { name: nextName(), providerId: 201 })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })

  it('answers 404 not_found for an unknown provider and 403 to analyst', async () => {
    const unknown = await call('POST', '/providers/999/matching-rule-sets', 'admin', { name: nextName() })
    const analyst = await call('POST', '/providers/201/matching-rule-sets', 'analyst', { name: nextName() })

    expect([unknown.statusCode, unknown.json().code]).toEqual([404, 'not_found'])
    expect([analyst.statusCode, analyst.json().code]).toEqual([403, 'forbidden'])
  })
})

describe('GET /matching-rule-sets/{id}', () => {
  it('answers the legacy set with its provider, account and rules ("Detalle del conjunto legacy")', async () => {
    const set = await detail(legacyId)

    expect(set.provider.name).toBe('Provider C')
    expect(set.accounts.map((a) => a.name)).toContain('ProviderC-Alt')
    expect(set.sheetRules.map((r) => [r.sheetPattern, r.statusId])).toEqual([
      ['TRX', null],
      ['CB', null],
      ['Fail', 3],
      ['Summary', null],
    ])
    expect(set.columnRules.map((r) => [r.columnPattern, r.sheetPattern])).toEqual([
      ['Merchant Order No#', null],
      ['Order Status', null],
      ['Amount USD', null],
    ])
  })

  it('answers 404 with the same body to viewer (merchant 1 only) and for an unknown set', async () => {
    const outside = await call('GET', `/matching-rule-sets/${legacyId}`, 'viewer')
    const unknown = await call('GET', '/matching-rule-sets/999999', 'admin')

    expect(outside.statusCode).toBe(404)
    expect(outside.json().code).toBe('not_found')
    expect(outside.body).toBe(unknown.body)
  })
})

describe('PUT /matching-rule-sets/{id}', () => {
  it('replaces a sheet rule with new rule ids ("Cambiar una regla de hoja")', async () => {
    const copy = await legacyCopy()
    const sheetRules = bodyOf(copy).sheetRules.map((r) => (r.sheetPattern === 'TRX' ? { ...r, statusId: 2 } : r))

    const res = await call('PUT', `/matching-rule-sets/${copy.ruleSetId}`, 'admin', bodyOf(copy, { sheetRules }))

    expect(res.statusCode, res.body).toBe(200)
    const after = MatchingRuleSetDetail.parse(res.json())
    expect(after.sheetRules.find((r) => r.sheetPattern === 'TRX')?.statusId).toBe(2)
    const oldIds = new Set(copy.sheetRules.map((r) => r.sheetRuleId))
    expect(after.sheetRules.some((r) => oldIds.has(r.sheetRuleId))).toBe(false)
  })

  it('renames and audits the name only ("Renombrar")', async () => {
    const copy = await legacyCopy()
    const name = nextName()

    const res = await call('PUT', `/matching-rule-sets/${copy.ruleSetId}`, 'admin', bodyOf(copy, { name }))

    expect(res.statusCode, res.body).toBe(200)
    const [, edit] = await audits(copy.ruleSetId)
    expect(edit).toMatchObject({ action: 'matching_rule_set.update', userId: adminId })
    expect(JSON.parse(edit!.detailJson!)).toEqual({ changes: { name: { before: copy.name, after: name } } })
  })

  it('answers the legacy detail sent back unchanged without writing ("Documento sin cambios")', async () => {
    const before = await detail(legacyId)
    const counts = await writeCounts()

    const res = await call('PUT', `/matching-rule-sets/${legacyId}`, 'admin', bodyOf(before))

    expect(res.statusCode, res.body).toBe(200)
    expect(MatchingRuleSetDetail.parse(res.json())).toEqual(before)
    expect(await writeCounts()).toEqual(counts)
  })

  it('answers 400 to a body without columnRules, leaving the set as it was ("Cuerpo parcial")', async () => {
    const copy = await legacyCopy()
    const { columnRules: _, ...partial } = bodyOf(copy)

    const res = await call('PUT', `/matching-rule-sets/${copy.ruleSetId}`, 'admin', partial)

    expect(res.statusCode).toBe(400)
    expect(await detail(copy.ruleSetId)).toEqual(copy)
  })

  it('answers 409 rule_set_name_taken when renaming to another set of the provider', async () => {
    const first = await create({ name: nextName() })
    const second = await create({ name: nextName(), sheetRules: [sheet('TRX')] })

    const res = await call(
      'PUT',
      `/matching-rule-sets/${second.ruleSetId}`,
      'admin',
      bodyOf(second, { name: first.name.toUpperCase(), sheetRules: [] }),
    )

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('rule_set_name_taken')
    expect(await detail(second.ruleSetId)).toEqual(second)
  })

  it('answers 409 rule_set_in_use with ProviderC-Alt when deactivating the legacy set ("Conjunto legacy en uso")', async () => {
    const before = await detail(legacyId)

    const res = await call('PUT', `/matching-rule-sets/${legacyId}`, 'admin', bodyOf(before, { isActive: false }))

    expect(res.statusCode).toBe(409)
    expect(res.json().code).toBe('rule_set_in_use')
    expect(res.json().details.accounts.map((a: { name: string }) => a.name)).toContain('ProviderC-Alt')
    expect((await detail(legacyId)).isActive).toBe(true)
  })

  it('counts a closed linked account as in use ("Cuenta cerrada enlazada")', async () => {
    const set = await create({ name: nextName() })
    const name = `it-acc-${RUN}-${++serial}`
    await ctx.prisma.account.create({
      data: {
        accountId: randomUUID(),
        providerId: 201,
        name,
        chargebackReservePolicy: 'hold_until_term',
        matchingRuleSetId: set.ruleSetId,
        isActive: false,
        createdByUserId: adminId,
      },
    })

    const res = await call('PUT', `/matching-rule-sets/${set.ruleSetId}`, 'admin', bodyOf(set, { isActive: false }))

    expect(res.statusCode).toBe(409)
    expect(res.json()).toMatchObject({ code: 'rule_set_in_use', details: { accounts: [{ name }] } })
  })

  it('deactivates and reactivates a free set, auditing both ("Desactivar y reactivar un conjunto libre")', async () => {
    const set = await create({ name: nextName() })

    const off = await call('PUT', `/matching-rule-sets/${set.ruleSetId}`, 'admin', bodyOf(set, { isActive: false }))
    const on = await call('PUT', `/matching-rule-sets/${set.ruleSetId}`, 'admin', bodyOf(set, { isActive: true }))

    expect([off.statusCode, on.statusCode]).toEqual([200, 200])
    expect((await audits(set.ruleSetId)).map((a) => a.action)).toEqual([
      'matching_rule_set.create',
      'matching_rule_set.deactivate',
      'matching_rule_set.activate',
    ])
  })

  it('answers 403 to analyst and 404 to an unknown set', async () => {
    const before = await detail(legacyId)

    const analyst = await call('PUT', `/matching-rule-sets/${legacyId}`, 'analyst', bodyOf(before))
    const unknown = await call('PUT', '/matching-rule-sets/999999', 'admin', bodyOf(before))

    expect([analyst.statusCode, analyst.json().code]).toEqual([403, 'forbidden'])
    expect([unknown.statusCode, unknown.json().code]).toEqual([404, 'not_found'])
  })
})

describe('rule order in the database (design D3: createMany keeps the body order, the tie-break)', () => {
  // Not alphabetical, equal priorities: only the insertion order can explain the ids.
  const sheets = ['Zeta', 'Alpha', 'Mid', 'Beta', 'Omega'].map((p) => sheet(p))
  const columns = ['Zed', 'Amount', 'Ref', 'Currency'].map((p, i) =>
    column(p, ['transactionId', 'amount', 'providerRef', 'currency'][i]!),
  )

  const stored = async (ruleSetId: number) => ({
    sheets: (
      await ctx.prisma.matchingSheetRule.findMany({ where: { ruleSetId }, orderBy: { sheetRuleId: 'asc' } })
    ).map((r) => r.sheetPattern),
    columns: (
      await ctx.prisma.matchingColumnRule.findMany({ where: { ruleSetId }, orderBy: { columnRuleId: 'asc' } })
    ).map((r) => r.columnPattern),
  })

  it('stores the rules of a POST with ids growing in the body order', async () => {
    const set = await create({ name: nextName(), sheetRules: sheets, columnRules: columns })

    expect(await stored(set.ruleSetId)).toEqual({
      sheets: ['Zeta', 'Alpha', 'Mid', 'Beta', 'Omega'],
      columns: ['Zed', 'Amount', 'Ref', 'Currency'],
    })
  })

  it('stores the rules of a PUT in the reversed order when the body reverses them', async () => {
    const set = await create({ name: nextName(), sheetRules: sheets, columnRules: columns })

    const res = await call(
      'PUT',
      `/matching-rule-sets/${set.ruleSetId}`,
      'admin',
      bodyOf(set, { sheetRules: [...sheets].reverse(), columnRules: [...columns].reverse() }),
    )

    expect(res.statusCode, res.body).toBe(200)
    expect(await stored(set.ruleSetId)).toEqual({
      sheets: ['Omega', 'Beta', 'Mid', 'Alpha', 'Zeta'],
      columns: ['Currency', 'Ref', 'Amount', 'Zed'],
    })
  })
})
