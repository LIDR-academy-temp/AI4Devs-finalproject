import { randomUUID } from 'node:crypto'
import { GlobalMatchingRules, ImportDetail, MatchingRuleSetDetail } from '@recon/shared'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestApp, fixtureIds, SEED_PASSWORD } from './helpers.js'
import { confirmProposal, ImportFlow, SAMPLE_FILES, samplePart } from './import-flow.js'

// Spec matching (admin-matching) "Efecto de un cambio de reglas", design D7: imports reads the current rules of the
// account on every proposal and resolves the aliases when it analyzes, so a change applies from the next proposal and
// the next analysis, and nothing confirmed or analyzed moves. Each test links an it-acc account of Provider C to an
// it-rs copy of "Provider C legacy" and uploads legacy-provider; the global aliases are restored in a finally.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
let adminToken: string
let adminId: number
let legacy: MatchingRuleSetDetail
/** The global aliases as the file found them: the diverted alias must be back to its value at the end. */
let aliasesBefore: GlobalMatchingRules['statusAliases']
const RUN = Date.now().toString(36)
let serial = 0
let set: MatchingRuleSetDetail
let accountId: string

beforeAll(async () => {
  ctx = await createTestApp()
  flow = new ImportFlow(ctx)
  await flow.init()
  adminId = (await ctx.prisma.user.findUniqueOrThrow({ where: { userName: 'admin' } })).userId
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { userName: 'admin', password: SEED_PASSWORD },
  })
  adminToken = login.json().accessToken
  const legacyId = (await ctx.prisma.matchingRuleSet.findFirstOrThrow({ where: { name: 'Provider C legacy' } }))
    .ruleSetId
  legacy = MatchingRuleSetDetail.parse((await admin('GET', `/matching-rule-sets/${legacyId}`)).json())
  aliasesBefore = GlobalMatchingRules.parse((await admin('GET', '/matching-rules/global')).json()).statusAliases
})

beforeEach(async () => {
  const res = await admin('POST', '/providers/201/matching-rule-sets', {
    ...bodyOf(legacy),
    name: `it-rs-${RUN}-${++serial}`,
  })
  expect(res.statusCode, res.body).toBe(201)
  set = MatchingRuleSetDetail.parse(res.json())
  accountId = randomUUID()
  await ctx.prisma.account.create({
    data: {
      accountId,
      providerId: 201,
      name: `it-acc-${RUN}-${serial}`,
      chargebackReservePolicy: 'hold_until_term',
      matchingRuleSetId: set.ruleSetId,
      createdByUserId: adminId,
    },
  })
})

/** The imports, then the accounts, then the sets of this run, in foreign key order. */
afterEach(async () => {
  const { prisma } = ctx
  await flow.close()
  await prisma.account.deleteMany({ where: { name: { startsWith: `it-acc-${RUN}` } } })
  const ids = fixtureIds(
    (await prisma.matchingRuleSet.findMany({ where: { name: { startsWith: `it-rs-${RUN}` } } })).map(
      (s) => s.ruleSetId,
    ),
    'it-rs sets',
  )
  if (ids.length === 0) return
  await prisma.auditLog.deleteMany({ where: { entityType: 'MatchingRuleSet', entityId: { in: ids.map(String) } } })
  await prisma.matchingSheetRule.deleteMany({ where: { ruleSetId: { in: ids } } })
  await prisma.matchingColumnRule.deleteMany({ where: { ruleSetId: { in: ids } } })
  await prisma.matchingRuleSet.deleteMany({ where: { ruleSetId: { in: ids } } })
})

afterAll(async () => {
  if (!ctx) return
  try {
    expect(await ctx.prisma.account.count({ where: { name: { startsWith: 'it-acc-' } } })).toBe(0)
    expect(await ctx.prisma.matchingRuleSet.count({ where: { name: { startsWith: 'it-rs-' } } })).toBe(0)
    const aliasesAfter = GlobalMatchingRules.parse((await admin('GET', '/matching-rules/global')).json()).statusAliases
    expect(aliasesAfter).toEqual(aliasesBefore)
  } finally {
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
})

function admin(method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: { authorization: `Bearer ${adminToken}` },
    ...(payload === undefined ? {} : { payload }),
  })
}

function bodyOf(d: MatchingRuleSetDetail) {
  return {
    name: d.name,
    isActive: d.isActive,
    sheetRules: d.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
    columnRules: d.columnRules.map(({ columnRuleId: _, ...r }) => r),
  }
}

/** The copy's sheet Fail goes from E/Declined to E without a fixed status. */
async function relaxFail() {
  const body = bodyOf(set)
  body.sheetRules = body.sheetRules.map((r) => (r.sheetPattern === 'Fail' ? { ...r, statusId: null } : r))
  const res = await admin('PUT', `/matching-rule-sets/${set.ruleSetId}`, body)
  expect(res.statusCode, res.body).toBe(200)
}

/** Runs `work` with the global alias `alias` pointing at `statusId`, and puts the aliases back whatever happens. */
async function withAlias(alias: string, statusId: number, work: () => Promise<void>) {
  const original = GlobalMatchingRules.parse((await admin('GET', '/matching-rules/global')).json())
  const lastAuditId = (await ctx.prisma.auditLog.aggregate({ _max: { auditId: true } }))._max.auditId ?? 0n
  const body = (aliases: GlobalMatchingRules['statusAliases']) => ({
    sheetRules: original.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
    columnRules: original.columnRules.map(({ columnRuleId: _, ...r }) => r),
    statusAliases: aliases,
  })
  try {
    const changed = original.statusAliases.map((a) => (a.alias === alias ? { ...a, statusId } : a))
    expect(changed).not.toEqual(original.statusAliases)
    const res = await admin('PUT', '/matching-rules/global', body(changed))
    expect(res.statusCode, res.body).toBe(200)
    await work()
  } finally {
    const res = await admin('PUT', '/matching-rules/global', body(original.statusAliases))
    expect(res.statusCode, res.body).toBe(200)
    await ctx.prisma.auditLog.deleteMany({
      where: { entityType: 'MatchingRules', entityId: 'global', auditId: { gt: lastAuditId } },
    })
  }
}

const upload = () => flow.upload(accountId, SAMPLE_FILES['legacy-provider'].files.map(samplePart))

async function detailOf(importId: string) {
  const res = await flow.call('GET', `/imports/${importId}`)
  expect(res.statusCode, res.body).toBe(200)
  return ImportDetail.parse(res.json())
}

function sheetOf(detail: ImportDetail, name: string) {
  const sheet = detail.files.flatMap((f) => f.sheets).find((s) => s.sheetName === name)
  if (!sheet) throw new Error(`sheet ${name} not in the import`)
  return sheet
}

async function confirm(detail: ImportDetail) {
  const res = await flow.call('PUT', `/imports/${detail.importId}/mapping`, confirmProposal(detail))
  expect(res.statusCode, res.body).toBe(200)
}

async function analyze(importId: string) {
  const res = await flow.call('POST', `/imports/${importId}/analyze`)
  expect(res.statusCode, res.body).toBe(200)
}

/** The analysed rows of a sheet, in row order. */
const rowsOf = (sheetId: string) =>
  ctx.prisma.importRow.findMany({
    where: { sheetId },
    select: { rowNo: true, statusId: true, cycle: true, matchResult: true },
    orderBy: { rowNo: 'asc' },
  })

describe('effect of a rule change on the imports', () => {
  it('an uploaded import without confirmation sees the new proposal ("Import subido sin confirmar")', async () => {
    const detail = await upload()
    expect(sheetOf(detail, 'Fail').proposed).toMatchObject({ cycle: 'E', statusId: 3, source: 'account' })

    await relaxFail()

    expect(sheetOf(await detailOf(detail.importId), 'Fail').proposed).toMatchObject({
      cycle: 'E',
      statusId: null,
      source: 'account',
    })
  })

  it('a mapped import keeps its mapping and analyzes with it ("Import con el pareo confirmado")', async () => {
    const detail = await upload()
    await confirm(detail)

    await relaxFail()

    const fail = sheetOf(await detailOf(detail.importId), 'Fail')
    expect(fail.mapping).toMatchObject({ cycle: 'E', statusId: 3 })
    expect(fail.proposed).toMatchObject({ statusId: null, source: 'account' })
    await analyze(detail.importId)
    const rows = await rowsOf(fail.sheetId)
    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map((r) => r.statusId))).toEqual(new Set([3]))
  })

  it('resolves the status column with the alias in force when it analyzes ("Alias cambiado antes del análisis")', async () => {
    const detail = await upload()
    const statusColumn = sheetOf(detail, 'TRX').columns.find((c) => c.targetField === 'status')
    const successful = statusColumn?.statusValues?.find((v) => v.statusId === 2)
    expect(successful, 'TRX has a status value resolved to Successful').toBeDefined()
    const alias = GlobalMatchingRules.parse((await admin('GET', '/matching-rules/global')).json()).statusAliases.find(
      (a) => a.alias.trim().toLowerCase() === successful!.value.trim().toLowerCase(),
    )
    expect(alias).toBeDefined()
    await confirm(detail)

    await withAlias(alias!.alias, 3, async () => {
      await analyze(detail.importId)
    })

    const trxSheetId = sheetOf(detail, 'TRX').sheetId
    const rows = await ctx.prisma.importRow.findMany({
      where: { sheetId: trxSheetId, statusRaw: successful!.value },
      select: { statusId: true },
    })
    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map((r) => r.statusId))).toEqual(new Set([3]))
  })

  it('leaves the rows of an analyzed import as they were ("Import ya analizado")', async () => {
    const detail = await upload()
    await confirm(detail)
    await analyze(detail.importId)
    const sheetIds = detail.files.flatMap((f) => f.sheets).map((s) => s.sheetId)
    const before = await Promise.all(sheetIds.map(rowsOf))

    await relaxFail()
    await withAlias('Successful', 3, async () => {
      expect(await Promise.all(sheetIds.map(rowsOf))).toEqual(before)
    })

    expect(await Promise.all(sheetIds.map(rowsOf))).toEqual(before)
  })
})
