import { MatchingRuleSetSummary } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { InMemoryRuleSetReadRepository } from '../application/__fakes__/in-memory-rule-sets.js'
import { RuleSetReadService } from '../application/rule-set-read-service.js'

// Spec matching "Conjuntos de reglas de un proveedor" (admin-accounts design D8), over the in-memory double.
let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  ctx = await buildTestApp({
    matching: { ruleSetService: new RuleSetReadService(new InMemoryRuleSetReadRepository()) },
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

// admin-matching group 1 (design D5): the rule administration routes are declared with their permission and
// schema; the handlers answer 501 not_implemented until groups 3 and 4 wire them.
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

  it.each([
    ['POST', '/providers/201/matching-rule-sets', 'admin', { name: 'Provider C v2' }],
    ['GET', '/matching-rule-sets/1', 'viewer', undefined],
    ['PUT', '/matching-rule-sets/1', 'admin', ruleSetBody],
    ['GET', '/matching-rules/global', 'viewer', undefined],
    ['PUT', '/matching-rules/global', 'admin', globalBody],
  ] as const)('%s %s answers 501 not_implemented for now', async (method, url, userName, body) => {
    const res = await call(method, url, userName, body)

    expect(res.statusCode).toBe(501)
    expect(res.json().code).toBe('not_implemented')
  })
})
