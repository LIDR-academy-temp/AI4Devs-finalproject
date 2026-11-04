// The fake account administration API on its own, without screens (web-admin-accounts design D9). It checks bodies
// with the schemas of @recon/shared, applies permission before scope and stores what the writes change. It does NOT
// decide business rules: name uniqueness, the rule set and the fee source are scripted by each test.
import { AccountDetail, MatchingRuleSetSummary, ProviderDetail } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { accountRequests, RULE_SET_IDS, respondNextAccount } from './accounts'
import { ACCOUNT_IDS, type UserName } from './fixtures'
import { issueTokens } from './handlers'

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

const USD = ACCOUNT_IDS['ProviderA-USD']
const ALT = ACCOUNT_IDS['ProviderC-Alt']
const MINIMAL = { name: 'ProviderC-New', chargebackReservePolicy: 'hold_until_term' }

describe('fake account API: POST /providers/{id}/accounts', () => {
  it('creates the account and answers 201 with an AccountDetail, read back by the catalog', async () => {
    const { status, body } = await call('admin', 'POST', '/providers/201/accounts', {
      ...MINIMAL,
      rollingReserveCapAmt: '25000',
      matchingRuleSetId: RULE_SET_IDS.legacy,
      copyFeesFromAccountId: ACCOUNT_IDS['ProviderC-USD'],
    })

    expect(status).toBe(201)
    const created = AccountDetail.parse(body)
    expect(created).toMatchObject({
      name: 'ProviderC-New',
      providerId: 201,
      isActive: true,
      rollingReserveCapAmt: '25000',
      matchingRuleSetId: RULE_SET_IDS.legacy,
      createdBy: { userName: 'admin' },
      merchant: { merchantId: 2 },
    })
    expect(AccountDetail.parse((await call('admin', 'GET', `/accounts/${created.accountId}`)).body)).toEqual(created)
    const provider = ProviderDetail.parse((await call('admin', 'GET', '/providers/201')).body)
    expect(provider.accounts.map((a) => a.name)).toEqual(['ProviderC-Alt', 'ProviderC-New', 'ProviderC-USD'])
    expect(accountRequests('create').at(-1)).toMatchObject({ url: '/api/v1/providers/201/accounts', status: 201 })
  })

  it('checks the permission before the scope: analyst and viewer get 403', async () => {
    expect((await call('analyst', 'POST', '/providers/201/accounts', MINIMAL)).status).toBe(403)
    expect((await call('viewer', 'POST', '/providers/201/accounts', MINIMAL)).body.code).toBe('forbidden')
  })

  it('a provider that does not exist is 404', async () => {
    expect((await call('admin', 'POST', '/providers/999/accounts', MINIMAL)).body.code).toBe('not_found')
  })

  it.each([
    ['a numeric cap', { ...MINIMAL, rollingReserveCapAmt: 25000 }],
    ['an unknown field', { ...MINIMAL, color: 'red' }],
    ['an empty name', { ...MINIMAL, name: '   ' }],
  ])('validates the body with AccountCreate: %s is 400', async (_case, body) => {
    const { status, body: answer } = await call('admin', 'POST', '/providers/201/accounts', body)
    expect(status).toBe(400)
    expect(answer.code).toBe('validation_error')
  })

  it('does not decide that a name is taken: a repeated name is created unless a test scripts the 409', async () => {
    expect((await call('admin', 'POST', '/providers/201/accounts', { ...MINIMAL, name: 'ProviderA-USD' })).status).toBe(
      201,
    )
    respondNextAccount('create', { status: 409, code: 'account_name_taken' })
    expect((await call('admin', 'POST', '/providers/201/accounts', MINIMAL)).body.code).toBe('account_name_taken')
  })
})

describe('fake account API: PATCH /accounts/{id}', () => {
  it('applies the fields and answers 200 with a later updatedAt', async () => {
    const before = AccountDetail.parse((await call('admin', 'GET', `/accounts/${USD}`)).body)
    const { status, body } = await call('admin', 'PATCH', `/accounts/${USD}`, {
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000',
      isActive: false,
      reason: 'provider stopped',
    })

    expect(status).toBe(200)
    const after = AccountDetail.parse(body)
    expect(after).toMatchObject({
      chargebackReservePolicy: 'release_on_chargeback',
      rollingReserveCapAmt: '1000',
      isActive: false,
    })
    expect(after.updatedAt > before.updatedAt).toBe(true)
    expect(AccountDetail.parse((await call('viewer', 'GET', `/accounts/${USD}`)).body).isActive).toBe(false)
  })

  it('403 for analyst before 404 for viewer out of scope; 404 for a missing account', async () => {
    expect((await call('analyst', 'PATCH', `/accounts/${USD}`, { isActive: false })).status).toBe(403)
    expect((await call('viewer', 'PATCH', `/accounts/${ALT}`, { isActive: false })).status).toBe(403)
    const missing = await call('admin', 'PATCH', '/accounts/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { isActive: false })
    expect(missing.body.code).toBe('not_found')
  })

  it.each([
    ['an empty body', {}],
    ['a reason alone', { reason: 'x' }],
    ['providerId', { providerId: 101 }],
  ])('validates the body with AccountPatch: %s is 400', async (_case, body) => {
    expect((await call('admin', 'PATCH', `/accounts/${USD}`, body)).status).toBe(400)
  })
})

describe('fake account API: GET /providers/{id}/matching-rule-sets', () => {
  const ruleSets = (body: unknown) => z.array(MatchingRuleSetSummary).parse(body)

  it('lists the rule sets of Provider C by name, active and not, with the accounts that use them', async () => {
    const { status, body } = await call('analyst', 'GET', '/providers/201/matching-rule-sets')
    expect(status).toBe(200)
    expect(ruleSets(body)).toEqual([
      {
        ruleSetId: RULE_SET_IDS.legacy,
        providerId: 201,
        name: 'Provider C legacy',
        isActive: true,
        accounts: [{ accountId: ALT, name: 'ProviderC-Alt', isActive: true }],
      },
      { ruleSetId: RULE_SET_IDS.retired, providerId: 201, name: 'Provider C retired', isActive: false, accounts: [] },
    ])
  })

  it('a provider without rule sets answers an empty list', async () => {
    expect(ruleSets((await call('viewer', 'GET', '/providers/101/matching-rule-sets')).body)).toEqual([])
  })

  it('a provider out of the scope is 404', async () => {
    expect((await call('viewer', 'GET', '/providers/201/matching-rule-sets')).body.code).toBe('not_found')
  })

  it('a linked account appears in its rule set after a write', async () => {
    await call('admin', 'PATCH', `/accounts/${ACCOUNT_IDS['ProviderC-USD']}`, {
      matchingRuleSetId: RULE_SET_IDS.legacy,
    })
    const [legacy] = ruleSets((await call('admin', 'GET', '/providers/201/matching-rule-sets')).body)
    expect(legacy?.accounts.map((a) => a.name)).toEqual(['ProviderC-Alt', 'ProviderC-USD'])
  })
})
