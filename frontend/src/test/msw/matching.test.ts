// The fake matching rules API on its own, without screens (web-admin-matching design D10). It checks bodies with the
// schemas of @recon/shared, parses every answer with its schema, applies permission before scope and gives new rule
// ids on every write, like the API. It does NOT decide business rules: no regex, repeated pattern, Pending, name in
// use nor rule set in use answers on its own; each test scripts them.
import { GlobalMatchingRules, MatchingRuleSetDetail, MatchingRuleSetSummary } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { ACCOUNT_IDS, type UserName } from './fixtures'
import { issueTokens } from './handlers'
import { matchingRequests, RULE_SET_IDS, respondNextMatching, withScopedAdmin } from './matching'

async function call(as: UserName, method: string, path: string, body?: object) {
  const { accessToken } = issueTokens(as)
  const headers: Record<string, string> = { authorization: `Bearer ${accessToken}` }
  if (body !== undefined) headers['content-type'] = 'application/json'
  const response = await fetch(`${window.location.origin}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

const LEGACY = `/matching-rule-sets/${RULE_SET_IDS.legacy}`

/** The detail as a PUT body: no ids, no rows to ignore, no provider nor accounts. */
async function legacyBody() {
  const detail = MatchingRuleSetDetail.parse((await call('admin', 'GET', LEGACY)).body)
  return {
    name: detail.name,
    isActive: detail.isActive,
    sheetRules: detail.sheetRules.map(({ sheetRuleId: _id, ...r }) => r),
    columnRules: detail.columnRules.map(({ columnRuleId: _id, ...r }) => r),
  }
}

async function globalsBody() {
  const globals = GlobalMatchingRules.parse((await call('admin', 'GET', '/matching-rules/global')).body)
  return {
    sheetRules: globals.sheetRules.map(({ sheetRuleId: _id, ...r }) => r),
    columnRules: globals.columnRules.map(({ columnRuleId: _id, ...r }) => r),
    statusAliases: globals.statusAliases,
  }
}

describe('fake matching API: reads', () => {
  it('GET /matching-rule-sets/{id} answers the legacy set of the seed as a MatchingRuleSetDetail', async () => {
    const { status, body } = await call('analyst', 'GET', LEGACY)
    expect(status).toBe(200)
    const detail = MatchingRuleSetDetail.parse(body)
    expect(detail).toMatchObject({ name: 'Provider C legacy', isActive: true, provider: { name: 'Provider C' } })
    expect(detail.accounts.map((a) => a.name)).toEqual(['ProviderC-Alt'])
    expect(detail.sheetRules.map((r) => [r.sheetPattern, r.kind, r.cycle, r.statusId])).toEqual([
      ['TRX', 'transactions', 'E', null],
      ['CB', 'transactions', 'I', null],
      ['Fail', 'transactions', 'E', 3],
      ['Summary', 'ignore', null, null],
    ])
    expect(detail.columnRules.map((r) => [r.sheetPattern, r.columnPattern])).toEqual([
      [null, 'Merchant Order No#'],
      [null, 'Order Status'],
      [null, 'Amount USD'],
    ])
  })

  it.each([
    ['viewer', LEGACY, 404],
    ['admin', '/matching-rule-sets/999999', 404],
    ['admin', '/matching-rule-sets/abc', 400],
  ] as const)('%s on %s is %i', async (as, path, status) => {
    expect((await call(as, 'GET', path)).status).toBe(status)
  })

  it('GET /matching-rules/global answers the template rules, the aliases and the six statuses', async () => {
    const globals = GlobalMatchingRules.parse((await call('viewer', 'GET', '/matching-rules/global')).body)
    expect(globals.sheetRules.map((r) => r.sheetPattern)).toEqual([
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
    ])
    expect(globals.columnRules[0]).toMatchObject({
      sheetPattern: null,
      columnPattern: 'ID',
      targetField: 'transactionId',
    })
    expect(globals.statusAliases.find((a) => a.alias === 'CHB 2')).toMatchObject({ statusId: 4, excludeAmount: true })
    expect(globals.rowIgnoreRules).toEqual([
      expect.objectContaining({ pattern: 'transactionId:empty', isRegex: false }),
    ])
    expect(globals.statuses.map((s) => s.name)).toEqual([
      'Pending',
      'Successful',
      'Declined',
      'Chargeback',
      'Refund',
      'RDR',
    ])
  })

  it('401 without a token', async () => {
    const response = await fetch(`${window.location.origin}/api/v1/matching-rules/global`)
    expect(response.status).toBe(401)
  })
})

describe('fake matching API: POST /providers/{id}/matching-rule-sets', () => {
  it('creates the set and answers 201 with its detail; the list of the provider and the account forms see it', async () => {
    const { status, body } = await call('admin', 'POST', '/providers/201/matching-rule-sets', {
      name: ' Provider C v2 ',
      sheetRules: [{ sheetPattern: 'Transactions', isRegex: false, kind: 'transactions', cycle: 'E', statusId: null }],
    })

    expect(status).toBe(201)
    const created = MatchingRuleSetDetail.parse(body)
    expect(created).toMatchObject({ name: 'Provider C v2', isActive: true, accounts: [], columnRules: [] })
    expect(created.sheetRules[0]).toMatchObject({ priority: 100, isActive: true })
    const list = z
      .array(MatchingRuleSetSummary)
      .parse((await call('admin', 'GET', '/providers/201/matching-rule-sets')).body)
    expect(list.map((r) => r.name)).toEqual(['Provider C legacy', 'Provider C retired', 'Provider C v2'])
    expect(matchingRequests('create').at(-1)).toMatchObject({
      url: '/api/v1/providers/201/matching-rule-sets',
      status: 201,
    })
  })

  it('checks the permission before the scope: analyst and viewer get 403', async () => {
    expect((await call('analyst', 'POST', '/providers/201/matching-rule-sets', { name: 'X' })).status).toBe(403)
    expect((await call('viewer', 'POST', '/providers/201/matching-rule-sets', { name: 'X' })).body.code).toBe(
      'forbidden',
    )
  })

  it('a provider that does not exist is 404', async () => {
    expect((await call('admin', 'POST', '/providers/999/matching-rule-sets', { name: 'X' })).body.code).toBe(
      'not_found',
    )
  })

  it.each([
    ['rowIgnoreRules', { name: 'X', rowIgnoreRules: [] }],
    ['providerId', { name: 'X', providerId: 201 }],
    ['an empty name', { name: '   ' }],
  ])('validates the body with MatchingRuleSetCreate: %s is 400', async (_case, body) => {
    const { status, body: answer } = await call('admin', 'POST', '/providers/201/matching-rule-sets', body)
    expect(status).toBe(400)
    expect(answer.code).toBe('validation_error')
  })
})

describe('fake matching API: PUT /matching-rule-sets/{id}', () => {
  it('replaces the rules with new ids and answers the detail', async () => {
    const before = MatchingRuleSetDetail.parse((await call('admin', 'GET', LEGACY)).body)
    const body = await legacyBody()
    body.sheetRules[2] = { ...body.sheetRules[2]!, statusId: null }

    const { status, body: answer } = await call('admin', 'PUT', LEGACY, { ...body, reason: 'Fail has no status' })

    expect(status).toBe(200)
    const after = MatchingRuleSetDetail.parse(answer)
    expect(after.sheetRules[2]).toMatchObject({ sheetPattern: 'Fail', statusId: null })
    const ids = (d: typeof after) => d.sheetRules.map((r) => r.sheetRuleId)
    expect(ids(after).some((id) => ids(before).includes(id))).toBe(false)
  })

  it('answers the rules in the order of the API: priority, then the order they were saved', async () => {
    const body = await legacyBody()
    const [trx, cb, ...rest] = body.sheetRules
    const answer = await call('admin', 'PUT', LEGACY, { ...body, sheetRules: [{ ...cb!, priority: 50 }, trx, ...rest] })
    expect(MatchingRuleSetDetail.parse(answer.body).sheetRules.map((r) => r.sheetPattern)).toEqual([
      'TRX',
      'Fail',
      'Summary',
      'CB',
    ])
  })

  it('403 without account.manage and 404 out of the scope', async () => {
    const body = await legacyBody()
    expect((await call('analyst', 'PUT', LEGACY, body)).status).toBe(403)
    expect((await call('admin', 'PUT', '/matching-rule-sets/999999', body)).status).toBe(404)
  })

  it.each([
    [
      'a rule id',
      async () => ({
        ...(await legacyBody()),
        sheetRules: [
          { sheetRuleId: 1, sheetPattern: 'A', isRegex: false, kind: 'ignore', cycle: null, statusId: null },
        ],
      }),
    ],
    [
      'no columnRules',
      async () => {
        const { columnRules: _c, ...rest } = await legacyBody()
        return rest
      },
    ],
  ])('validates the body with MatchingRuleSetPut: %s is 400', async (_case, build) => {
    const { status, body } = await call('admin', 'PUT', LEGACY, await build())
    expect(status).toBe(400)
    expect(body.code).toBe('validation_error')
  })
})

describe('fake matching API: PUT /matching-rules/global', () => {
  it('replaces the rules and the aliases', async () => {
    const body = await globalsBody()
    body.statusAliases.push({ alias: 'Approved OK', statusId: 2, excludeAmount: false, isLegacy: false })
    const { status, body: answer } = await call('admin', 'PUT', '/matching-rules/global', body)
    expect(status).toBe(200)
    expect(GlobalMatchingRules.parse(answer).statusAliases.map((a) => a.alias)).toContain('Approved OK')
  })

  it('403 without account.manage, and for an admin whose scope is not all', async () => {
    const body = await globalsBody()
    expect((await call('analyst', 'PUT', '/matching-rules/global', body)).status).toBe(403)
    withScopedAdmin()
    expect((await call('admin', 'PUT', '/matching-rules/global', body)).body.code).toBe('forbidden')
  })

  it('rowIgnoreRules in the body is 400', async () => {
    const body = { ...(await globalsBody()), rowIgnoreRules: [] }
    expect((await call('admin', 'PUT', '/matching-rules/global', body)).status).toBe(400)
  })
})

describe('fake matching API: business rules are scripted, never decided', () => {
  it('a repeated name, a regex that does not compile and a rule set in use are accepted unless a test scripts them', async () => {
    expect(
      (await call('admin', 'POST', '/providers/201/matching-rule-sets', { name: 'PROVIDER C LEGACY' })).status,
    ).toBe(201)
    const body = await legacyBody()
    body.columnRules[0] = { ...body.columnRules[0]!, columnPattern: '^amount(', isRegex: true }
    expect((await call('admin', 'PUT', LEGACY, { ...body, isActive: false })).status).toBe(200)
  })

  it('answers what a test scripts, once', async () => {
    respondNextMatching('put', {
      status: 409,
      code: 'rule_set_in_use',
      details: { accounts: [{ accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt' }] },
    })
    const body = await legacyBody()
    const first = await call('admin', 'PUT', LEGACY, { ...body, isActive: false })
    expect(first).toMatchObject({
      status: 409,
      body: { code: 'rule_set_in_use', details: { accounts: [{ name: 'ProviderC-Alt' }] } },
    })
    expect((await call('admin', 'PUT', LEGACY, body)).status).toBe(200)
  })
})
