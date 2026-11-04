import { MatchingRuleSetSummary } from '@recon/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTestApp, fixtureId, SEED_PASSWORD, seedRuleSets } from './helpers.js'

// Spec matching "Conjuntos de reglas de un proveedor" (admin-accounts design D8) against the seed: "Provider C legacy"
// on provider 201 (merchant 2) linked to ProviderC-Alt; providers 101 and 102 have none; viewer sees merchant 1 only.
// The file adds an inactive set to provider 201 to check the order and the inactive ones, and an inactive bruno- set
// as the Bruno collection leaves them (admin-matching design D8), and removes both.
const RUN = Date.now().toString(36)
const INACTIVE_SET = `it-rs-${RUN}`
const BRUNO_SET = `bruno-it-${RUN}`
const UNKNOWN_PROVIDER = 999

let ctx: Awaited<ReturnType<typeof createTestApp>>
const tokens: Record<string, string> = {}
let inactiveSetId: number | undefined
let brunoSetId: number | undefined

beforeAll(async () => {
  ctx = await createTestApp()
  for (const userName of ['analyst', 'viewer'] as const) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { userName, password: SEED_PASSWORD },
    })
    expect(res.statusCode).toBe(200)
    tokens[userName] = res.json().accessToken
  }
  inactiveSetId = (
    await ctx.prisma.matchingRuleSet.create({ data: { providerId: 201, name: INACTIVE_SET, isActive: false } })
  ).ruleSetId
  brunoSetId = (
    await ctx.prisma.matchingRuleSet.create({ data: { providerId: 201, name: BRUNO_SET, isActive: false } })
  ).ruleSetId
})

afterAll(async () => {
  if (!ctx) return
  try {
    if (inactiveSetId !== undefined)
      await ctx.prisma.matchingRuleSet.delete({ where: { ruleSetId: fixtureId(inactiveSetId, 'inactive set') } })
    if (brunoSetId !== undefined)
      await ctx.prisma.matchingRuleSet.delete({ where: { ruleSetId: fixtureId(brunoSetId, 'bruno set') } })
    expect(await ctx.prisma.matchingRuleSet.count({ where: { name: { startsWith: 'it-rs-' } } })).toBe(0)
  } finally {
    await ctx.app.close()
    await ctx.prisma.$disconnect()
  }
})

function get(url: string, user?: 'analyst' | 'viewer') {
  return ctx.app.inject({
    method: 'GET',
    url: `/api/v1${url}`,
    headers: user ? { authorization: `Bearer ${tokens[user]}` } : {},
  })
}

const withoutBruno = (set: MatchingRuleSetSummary) => ({
  ...set,
  accounts: set.accounts.filter((a) => !a.name.startsWith('bruno-')),
})

describe('GET /api/v1/providers/{id}/matching-rule-sets', () => {
  it('lists the sets of Provider C by name, the inactive one too, with ProviderC-Alt in "Provider C legacy"', async () => {
    const res = await get('/providers/201/matching-rule-sets', 'analyst')

    expect(res.statusCode).toBe(200)
    const sets = seedRuleSets(z.array(MatchingRuleSetSummary).parse(res.json())).map(withoutBruno)
    expect(sets.map((s) => [s.name, s.isActive])).toEqual([
      [INACTIVE_SET, false],
      ['Provider C legacy', true],
    ])
    const alt = await ctx.prisma.account.findFirstOrThrow({ where: { name: 'ProviderC-Alt' } })
    expect(sets[1]).toMatchObject({
      providerId: 201,
      accounts: [{ accountId: alt.accountId, name: 'ProviderC-Alt', isActive: true }],
    })
    expect(sets[0]?.accounts).toEqual([])
  })

  it('lists a bruno- set in its name order, inactive, and the seed tests leave it out ("Conjuntos de la colección presentes")', async () => {
    const sets = z
      .array(MatchingRuleSetSummary)
      .parse((await get('/providers/201/matching-rule-sets', 'analyst')).json())

    const names = sets.map((s) => s.name)
    expect(sets.find((s) => s.name === BRUNO_SET)?.isActive).toBe(false)
    // By name: bruno-… before Provider C legacy.
    expect(names.indexOf(BRUNO_SET)).toBeLessThan(names.indexOf('Provider C legacy'))
    expect(seedRuleSets(sets).map((s) => s.name)).not.toContain(BRUNO_SET)
  })

  it('answers 200 with an empty list to viewer for Provider A, which has no sets besides the bruno- ones', async () => {
    const res = await get('/providers/101/matching-rule-sets', 'viewer')

    expect(res.statusCode).toBe(200)
    expect(seedRuleSets(z.array(MatchingRuleSetSummary).parse(res.json()))).toEqual([])
  })

  it('answers 404 not_found to viewer for Provider C, with the same body as an unknown provider', async () => {
    const outside = await get('/providers/201/matching-rule-sets', 'viewer')
    const unknown = await get(`/providers/${UNKNOWN_PROVIDER}/matching-rule-sets`, 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.json().code).toBe('not_found')
    expect(outside.body).toBe(unknown.body)
  })

  it('answers 401 unauthorized without a token', async () => {
    const res = await get('/providers/201/matching-rule-sets')

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })
})
