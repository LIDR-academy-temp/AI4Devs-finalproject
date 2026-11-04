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
