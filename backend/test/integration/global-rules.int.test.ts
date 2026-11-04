import { GlobalMatchingRules } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { resolveStatusAlias } from '../../src/modules/matching/domain/status-alias.js'
import { PrismaMatchingRulesRepository } from '../../src/modules/matching/infrastructure/prisma-matching-rules-repository.js'
import { createTestApp, SEED_PASSWORD } from './helpers.js'
import { ImportFlow, SAMPLE_FILES, samplePart } from './import-flow.js'

// Spec matching (admin-matching): "Reglas globales editables", "Filas a ignorar de solo lectura" and "Auditoría de
// las reglas de pareo" (globals), by HTTP against the seed (design D3, D8). The global rules found in beforeAll are
// written back in afterAll, and the batch-clean proposal is checked to be the seed's again: all from the global rules.
let ctx: Awaited<ReturnType<typeof createTestApp>>
let flow: ImportFlow
const tokens: Record<string, string> = {}
let original: GlobalMatchingRules
/** The last audit id before this file wrote anything: cleanup only removes the global entries above it. */
let lastAuditId: bigint

beforeAll(async () => {
  ctx = await createTestApp()
  flow = new ImportFlow(ctx)
  await flow.init()
  for (const userName of ['admin', 'analyst', 'viewer']) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    tokens[userName] = res.json().accessToken
  }
  original = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())
  lastAuditId = (await ctx.prisma.auditLog.aggregate({ _max: { auditId: true } }))._max.auditId ?? 0n
})

afterAll(async () => {
  if (!ctx) return
  try {
    if (original) {
      const res = await call('PUT', '/matching-rules/global', 'admin', bodyOf(original))
      expect(res.statusCode, res.body).toBe(200)
      await ctx.prisma.auditLog.deleteMany({
        where: { entityType: 'MatchingRules', entityId: 'global', auditId: { gt: lastAuditId } },
      })
      const after = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())
      expect(bodyOf(after)).toEqual(bodyOf(original))
      // The seed's proposal again: batch-clean of ProviderA-USD (no rule set) proposes only from the global rules.
      const { account, files } = SAMPLE_FILES['batch-clean']
      const detail = await flow.upload(flow.accountIds[account] as string, files.map(samplePart))
      const sources = detail.files.flatMap((f) =>
        f.sheets.flatMap((s) => [s.proposed.source, ...s.columns.filter((c) => c.targetField).map((c) => c.source)]),
      )
      expect(new Set(sources)).toEqual(new Set(['global']))
    }
  } finally {
    await flow.close()
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
})

async function call(method: 'GET' | 'PUT', url: string, as: string | null, payload?: object) {
  return ctx.app.inject({
    method,
    url: `/api/v1${url}`,
    headers: as === null ? {} : { authorization: `Bearer ${tokens[as]}` },
    ...(payload === undefined ? {} : { payload }),
  })
}

/** The GET as a PUT body: without rule ids, row ignores nor statuses. */
function bodyOf(g: GlobalMatchingRules, overrides: Record<string, unknown> = {}) {
  return {
    sheetRules: g.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
    columnRules: g.columnRules.map(({ columnRuleId: _, ...r }) => r),
    statusAliases: g.statusAliases,
    ...overrides,
  }
}

const globalAudits = () =>
  ctx.prisma.auditLog.findMany({
    where: { entityType: 'MatchingRules', entityId: 'global', auditId: { gt: lastAuditId } },
    orderBy: { auditId: 'asc' },
  })

const approvedOk = { alias: 'Approved OK', statusId: 2, excludeAmount: false, isLegacy: false }

describe('GET /matching-rules/global', () => {
  it('answers the template rules, CHB 2, the six statuses and the read-only row ignore to viewer', async () => {
    const res = await call('GET', '/matching-rules/global', 'viewer')

    expect(res.statusCode).toBe(200)
    const globals = GlobalMatchingRules.parse(res.json())
    expect(globals.sheetRules.map((r) => r.sheetPattern)).toEqual(
      expect.arrayContaining([
        'APP',
        'DEC',
        'CHB',
        'REF',
        'RDR',
        'RR',
        'Other Fees',
        'Duplicate Corrections',
        'CHB Alerts',
        'Settings',
      ]),
    )
    expect(globals.columnRules.find((r) => r.columnPattern === 'ID')?.targetField).toBe('transactionId')
    expect(globals.statusAliases.find((a) => a.alias === 'CHB 2')?.excludeAmount).toBe(true)
    expect(globals.statuses).toHaveLength(6)
    expect(globals.rowIgnoreRules).toEqual([
      expect.objectContaining({ pattern: 'transactionId:empty', isRegex: false }),
    ])
  })

  it('answers 401 without a token', async () => {
    const res = await call('GET', '/matching-rules/global', null)

    expect([res.statusCode, res.json().code]).toEqual([401, 'unauthorized'])
  })
})

describe('PUT /matching-rules/global', () => {
  it('answers what the GET gave, sent back, without writing ("Reenviar las globales sin cambios")', async () => {
    const before = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())

    const res = await call('PUT', '/matching-rules/global', 'admin', bodyOf(before))

    expect(res.statusCode, res.body).toBe(200)
    expect(GlobalMatchingRules.parse(res.json())).toEqual(before)
    expect(await globalAudits()).toEqual([])
  })

  it('adds an alias that the next analysis resolves, auditing only the aliases ("Alias nuevo")', async () => {
    const before = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())

    const res = await call(
      'PUT',
      '/matching-rules/global',
      'admin',
      bodyOf(before, { statusAliases: [...before.statusAliases, approvedOk] }),
    )

    expect(res.statusCode, res.body).toBe(200)
    const rules = await new PrismaMatchingRulesRepository(ctx.prisma).rulesFor(null)
    expect(resolveStatusAlias('approved ok', rules).statusId).toBe(2)
    const [entry, ...rest] = await globalAudits()
    expect(rest).toEqual([])
    expect(entry?.action).toBe('matching_rules.update')
    expect(Object.keys(JSON.parse(entry!.detailJson!).changes)).toEqual(['statusAliases'])
  })

  it('answers 400 at the second repeated alias, and at an unknown status, writing nothing', async () => {
    const before = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())
    const audits = (await globalAudits()).length

    const repeated = await call(
      'PUT',
      '/matching-rules/global',
      'admin',
      bodyOf(before, {
        statusAliases: [
          { ...approvedOk, alias: 'Zeta' },
          { ...approvedOk, alias: ' zeta ' },
        ],
      }),
    )
    const unknown = await call(
      'PUT',
      '/matching-rules/global',
      'admin',
      bodyOf(before, { statusAliases: [{ ...approvedOk, statusId: 99 }] }),
    )

    expect(repeated.json()).toMatchObject({ code: 'validation_error', details: { field: 'statusAliases[1].alias' } })
    expect(unknown.json()).toMatchObject({ code: 'validation_error', details: { field: 'statusAliases[0].statusId' } })
    expect((await globalAudits()).length).toBe(audits)
    expect(GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())).toEqual(before)
  })

  it('answers 400 to rowIgnoreRules in the body, before writing ("Intento de escribir filas a ignorar")', async () => {
    const before = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())

    const res = await call('PUT', '/matching-rules/global', 'admin', {
      ...bodyOf(before),
      rowIgnoreRules: before.rowIgnoreRules,
    })

    // The schema refuses the body; that a real write leaves the row ignores alone is the next test.
    expect([res.statusCode, res.json().code]).toEqual([400, 'validation_error'])
  })

  it('replaces the changed sheet list with new ids, keeps the other lists and the row ignores, and is restored', async () => {
    const before = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())
    const rowIgnores = () =>
      ctx.prisma.matchingRowIgnoreRule.findMany({ where: { ruleSetId: null }, orderBy: { rowIgnoreId: 'asc' } })
    const rowIgnoresBefore = await rowIgnores()
    expect(rowIgnoresBefore.length).toBeGreaterThan(0)
    const settings = before.sheetRules.find((r) => r.sheetPattern === 'Settings')
    expect(settings).toBeDefined()
    // Earlier tests of the file may have left their entries: only those written from here on count.
    const startAuditId = (await ctx.prisma.auditLog.aggregate({ _max: { auditId: true } }))._max.auditId ?? 0n
    const sheetRules = bodyOf(before).sheetRules.map((r) =>
      r.sheetPattern === 'Settings' ? { ...r, priority: r.priority + 5 } : r,
    )
    try {
      const res = await call('PUT', '/matching-rules/global', 'admin', bodyOf(before, { sheetRules }))

      expect(res.statusCode, res.body).toBe(200)
      const after = GlobalMatchingRules.parse(res.json())
      expect(after.sheetRules.find((r) => r.sheetPattern === 'Settings')?.priority).toBe(settings!.priority + 5)
      const oldSheetIds = new Set(before.sheetRules.map((r) => r.sheetRuleId))
      expect(after.sheetRules.some((r) => oldSheetIds.has(r.sheetRuleId))).toBe(false)
      expect(after.columnRules.map((r) => r.columnRuleId)).toEqual(before.columnRules.map((r) => r.columnRuleId))
      expect(after.statusAliases).toEqual(before.statusAliases)
      expect(await rowIgnores()).toEqual(rowIgnoresBefore)
      const entries = (await globalAudits()).filter((a) => a.auditId > startAuditId)
      expect(entries).toHaveLength(1)
      expect(Object.keys(JSON.parse(entries[0]!.detailJson!).changes)).toEqual(['sheetRules'])
    } finally {
      const restore = await call('PUT', '/matching-rules/global', 'admin', bodyOf(before))
      expect(restore.statusCode, restore.body).toBe(200)
      await ctx.prisma.auditLog.deleteMany({
        where: { entityType: 'MatchingRules', entityId: 'global', auditId: { gt: startAuditId } },
      })
    }
    const restored = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'viewer')).json())
    expect(bodyOf(restored)).toEqual(bodyOf(before))
    expect(await rowIgnores()).toEqual(rowIgnoresBefore)
  })

  it('answers 403 to analyst', async () => {
    const res = await call('PUT', '/matching-rules/global', 'analyst', bodyOf(original))

    expect([res.statusCode, res.json().code]).toEqual([403, 'forbidden'])
  })
})
