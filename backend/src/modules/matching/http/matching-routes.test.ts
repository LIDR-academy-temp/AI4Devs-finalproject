import { GlobalMatchingRules, MatchingRuleSetDetail, MatchingRuleSetSummary } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { InMemoryGlobalRules } from '../application/__fakes__/in-memory-global-rules.js'
import { InMemoryRuleSets } from '../application/__fakes__/in-memory-rule-sets.js'
import { GlobalRulesService } from '../application/global-rules-service.js'
import { RuleSetAdminService } from '../application/rule-set-admin-service.js'
import { RuleSetReadService } from '../application/rule-set-read-service.js'

// Spec matching "Conjuntos de reglas de un proveedor" (admin-accounts design D8), over the in-memory double.
let ctx: Awaited<ReturnType<typeof buildTestApp>>
let ruleSets: InMemoryRuleSets
let globals: InMemoryGlobalRules

beforeEach(async () => {
  ruleSets = new InMemoryRuleSets()
  globals = new InMemoryGlobalRules()
  ctx = await buildTestApp({
    matching: {
      ruleSetService: new RuleSetReadService(ruleSets),
      ruleSetAdminService: new RuleSetAdminService(ruleSets),
      globalRulesService: new GlobalRulesService(globals),
    },
  })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

async function get(url: string, userName?: string) {
  const headers = userName
    ? { authorization: `Bearer ${(await ctx.authService.login({ userName, password: PASSWORD })).accessToken}` }
    : {}
  return ctx.app.inject({ method: 'GET', url: `/api/v1${url}`, headers })
}

describe('GET /providers/{id}/matching-rule-sets', () => {
  it('lists the sets of Provider C by name, active and inactive, with their linked accounts', async () => {
    const res = await get('/providers/201/matching-rule-sets', 'analyst')

    expect(res.statusCode).toBe(200)
    const sets = z.array(MatchingRuleSetSummary).parse(res.json())
    expect(sets.map((s) => [s.name, s.isActive])).toEqual([
      ['Provider C archive', false],
      ['Provider C legacy', true],
    ])
    expect(sets[1]).toEqual({
      ruleSetId: 1,
      providerId: 201,
      name: 'Provider C legacy',
      isActive: true,
      accounts: [{ accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt', isActive: true }],
    })
  })

  it('answers 200 with an empty list for a provider without sets, needing no permission', async () => {
    const res = await get('/providers/101/matching-rule-sets', 'viewer')

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual([])
  })

  it('answers 404 not_found for a provider outside the scope, identical to an unknown one', async () => {
    const outside = await get('/providers/201/matching-rule-sets', 'viewer')
    const unknown = await get('/providers/999/matching-rule-sets', 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.json().code).toBe('not_found')
    expect(outside.body).toBe(unknown.body)
  })

  it('answers 401 unauthorized without a token', async () => {
    const res = await get('/providers/201/matching-rule-sets')

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('answers 400 validation_error to a malformed provider id', async () => {
    const res = await get('/providers/not-a-number/matching-rule-sets', 'viewer')

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })
})

// admin-matching design D5: the rule administration routes with their permission and schema.
async function call(method: 'GET' | 'POST' | 'PUT', url: string, userName?: string, payload?: object) {
  const headers = userName
    ? { authorization: `Bearer ${(await ctx.authService.login({ userName, password: PASSWORD })).accessToken}` }
    : {}
  return ctx.app.inject({ method, url: `/api/v1${url}`, headers, ...(payload === undefined ? {} : { payload }) })
}

const ruleSetBody = { name: 'Provider C v2', isActive: true, sheetRules: [], columnRules: [] }
const globalBody = { sheetRules: [], columnRules: [], statusAliases: [] }
const writes = [
  ['POST', '/providers/201/matching-rule-sets', { name: 'Provider C v2' }],
  ['PUT', '/matching-rule-sets/1', ruleSetBody],
  ['PUT', '/matching-rules/global', globalBody],
] as const

describe('matching rule administration routes (contract)', () => {
  it.each(writes)('%s %s answers 401 unauthorized without a token', async (method, url, body) => {
    const res = await call(method, url, undefined, body)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it.each(writes)(
    '%s %s answers 403 forbidden to analyst (no account.manage), before looking at the resource',
    async (method, url, body) => {
      const res = await call(method, url.replace('201', '999').replace('/1', '/999'), 'analyst', body)

      expect(res.statusCode).toBe(403)
      expect(res.json().code).toBe('forbidden')
    },
  )

  it('answers 403 forbidden to an admin with an assigned scope on PUT /matching-rules/global', async () => {
    const res = await call('PUT', '/matching-rules/global', 'scoped_admin', globalBody)

    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('forbidden')
  })

  it('answers 400 validation_error to rowIgnoreRules in a body: they are read-only', async () => {
    const set = await call('PUT', '/matching-rule-sets/1', 'admin', { ...ruleSetBody, rowIgnoreRules: [] })
    const global = await call('PUT', '/matching-rules/global', 'admin', { ...globalBody, rowIgnoreRules: [] })

    expect([set.statusCode, global.statusCode]).toEqual([400, 400])
    expect(set.json().code).toBe('validation_error')
    expect(global.json().code).toBe('validation_error')
  })

  it('answers 400 validation_error to a malformed rule set id', async () => {
    const res = await call('GET', '/matching-rule-sets/abc', 'viewer')

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })
})

describe('global rule routes (spec matching "Reglas globales editables", admin-matching design D3–D5)', () => {
  it('GET answers 200 to viewer with the row ignores and the statuses', async () => {
    const res = await call('GET', '/matching-rules/global', 'viewer')

    expect(res.statusCode).toBe(200)
    const body = GlobalMatchingRules.parse(res.json())
    expect(body.rowIgnoreRules).toHaveLength(1)
    expect(body.statuses).toHaveLength(6)
  })

  it('PUT answers 200 with the rules sent back and audits as admin only when something changes', async () => {
    const before = GlobalMatchingRules.parse((await call('GET', '/matching-rules/global', 'admin')).json())
    const body = {
      sheetRules: before.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
      columnRules: before.columnRules.map(({ columnRuleId: _, ...r }) => r),
      statusAliases: before.statusAliases,
    }

    const same = await call('PUT', '/matching-rules/global', 'admin', body)
    const added = await call('PUT', '/matching-rules/global', 'admin', {
      ...body,
      statusAliases: [
        ...body.statusAliases,
        { alias: 'Approved OK', statusId: 2, excludeAmount: false, isLegacy: false },
      ],
    })

    expect(same.statusCode, same.body).toBe(200)
    expect(same.json()).toEqual(before)
    expect(added.statusCode, added.body).toBe(200)
    expect(globals.audits.map((a) => a.userId)).toEqual([1])
  })

  it('PUT answers 400 validation_error with details.field to an alias of an unknown status', async () => {
    const res = await call('PUT', '/matching-rules/global', 'admin', {
      ...globalBody,
      statusAliases: [{ alias: 'Lost', statusId: 99, excludeAmount: false, isLegacy: false }],
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ code: 'validation_error', details: { field: 'statusAliases[0].statusId' } })
  })

  it('PUT answers 403 to an admin with an assigned scope without taking the lock', async () => {
    const res = await call('PUT', '/matching-rules/global', 'scoped_admin', globalBody)

    expect(res.statusCode).toBe(403)
    expect(globals.locks).toBe(0)
  })
})

describe('rule set routes (spec matching, admin-matching design D3–D5)', () => {
  it('POST answers 201 with the detail of the new set', async () => {
    const res = await call('POST', '/providers/201/matching-rule-sets', 'admin', { name: ' Provider C v2 ' })

    expect(res.statusCode, res.body).toBe(201)
    expect(MatchingRuleSetDetail.parse(res.json())).toMatchObject({ name: 'Provider C v2', accounts: [] })
    expect(ruleSets.audits.map((a) => [a.action, a.userId])).toEqual([['matching_rule_set.create', 1]])
  })

  it('POST answers 409 rule_set_name_taken and 404 not_found for an unknown provider', async () => {
    const taken = await call('POST', '/providers/201/matching-rule-sets', 'admin', { name: 'provider c legacy' })
    const unknown = await call('POST', '/providers/999/matching-rule-sets', 'admin', { name: 'X' })

    expect([taken.statusCode, taken.json().code]).toEqual([409, 'rule_set_name_taken'])
    expect([unknown.statusCode, unknown.json().code]).toEqual([404, 'not_found'])
  })

  it('POST answers 400 validation_error with details.field to a broken rule', async () => {
    const res = await call('POST', '/providers/201/matching-rule-sets', 'admin', {
      name: 'Bad',
      sheetRules: [{ sheetPattern: 'Other Fees', isRegex: false, kind: 'batch_fees', cycle: 'E', statusId: null }],
    })

    expect(res.statusCode).toBe(400)
    expect(res.json()).toMatchObject({ code: 'validation_error', details: { field: 'sheetRules[0].cycle' } })
  })

  it('GET answers 200 to analyst and the same 404 to viewer (merchant 1 only) as for an unknown set', async () => {
    const analyst = await call('GET', '/matching-rule-sets/1', 'analyst')
    const viewer = await call('GET', '/matching-rule-sets/1', 'viewer')
    const unknown = await call('GET', '/matching-rule-sets/999999', 'analyst')

    expect(analyst.statusCode).toBe(200)
    expect(MatchingRuleSetDetail.parse(analyst.json()).provider.name).toBe('Provider C')
    expect([viewer.statusCode, viewer.json().code]).toEqual([404, 'not_found'])
    expect(viewer.body).toBe(unknown.body)
  })

  it('GET answers 404 to an admin with an assigned scope outside merchant 2', async () => {
    const res = await call('GET', '/matching-rule-sets/1', 'scoped_admin')

    expect([res.statusCode, res.json().code]).toEqual([404, 'not_found'])
  })

  it('PUT answers 200 with the detail and 409 rule_set_in_use with the accounts when deactivating the legacy set', async () => {
    const detail = MatchingRuleSetDetail.parse((await call('GET', '/matching-rule-sets/1', 'admin')).json())
    const body = {
      name: detail.name,
      isActive: true,
      sheetRules: detail.sheetRules.map(({ sheetRuleId: _, ...r }) => r),
      columnRules: detail.columnRules.map(({ columnRuleId: _, ...r }) => r),
    }

    const same = await call('PUT', '/matching-rule-sets/1', 'admin', body)
    const off = await call('PUT', '/matching-rule-sets/1', 'admin', { ...body, isActive: false })

    expect(same.statusCode, same.body).toBe(200)
    expect(same.json()).toEqual(detail)
    expect(off.statusCode).toBe(409)
    expect(off.json()).toMatchObject({
      code: 'rule_set_in_use',
      details: { accounts: [{ name: 'ProviderC-Alt' }] },
    })
  })

  it('PUT answers 400 validation_error to a body without columnRules', async () => {
    const { columnRules: _, ...partial } = ruleSetBody

    const res = await call('PUT', '/matching-rule-sets/1', 'admin', partial)

    expect([res.statusCode, res.json().code]).toEqual([400, 'validation_error'])
  })
})
