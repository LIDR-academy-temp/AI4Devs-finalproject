// The fake fee administration API on its own, without screens (web-admin-fees design D8). It checks queries and
// bodies with the schemas of @recon/shared, applies permission before scope, paginates and filters the fixtures and
// stores what the writes change. It does NOT decide overlaps nor use: those answers are scripted by each test.
import { AccountFee, FeeHistoryEntry, FeePage, FeeUpdateResult } from '@recon/shared'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { feeFixture, feeRequests, respondNextFee, seedAccountFees } from './fees'
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
const MISSING = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

const page = (body: unknown) => FeePage.parse(body)

describe('fake fee API: GET /fees', () => {
  it('answers a FeePage in the order of the API, 50 per page by default', async () => {
    const { status, body } = await call('admin', 'GET', '/fees')
    expect(status).toBe(200)
    const result = page(body)
    expect(result).toMatchObject({ page: 1, pageSize: 50 })
    const keys = result.items.map((f) => [f.merchant.name, f.provider.name, f.account.name, f.title, f.startDate ?? ''])
    const byFields = (a: string[], b: string[]) => {
      for (let i = 0; i < a.length; i++) {
        const order = (a[i] ?? '').localeCompare(b[i] ?? '')
        if (order !== 0) return order
      }
      return 0
    }
    expect(keys).toEqual([...keys].sort(byFields))
  })

  it('paginates without repeating nor losing a fee', async () => {
    const all = page((await call('admin', 'GET', '/fees?pageSize=500')).body)
    const first = page((await call('admin', 'GET', '/fees?pageSize=3&page=1')).body)
    const second = page((await call('admin', 'GET', '/fees?pageSize=3&page=2')).body)
    expect([...first.items, ...second.items].map((f) => f.feeId)).toEqual(all.items.slice(0, 6).map((f) => f.feeId))
    expect(first.total).toBe(all.total)
    expect(second.total).toBe(all.total)
  })

  it('checks the query with FeesQuery: a page size of 0 or an unknown status is a 400', async () => {
    for (const query of ['pageSize=0', 'pageSize=501', 'status=withdrawn', 'kind=other', 'unknown=1']) {
      const { status, body } = await call('admin', 'GET', `/fees?${query}`)
      expect(status, query).toBe(400)
      expect(body.code).toBe('validation_error')
    }
  })

  it('keeps to the scope of the user, and a merchant outside it is a 404', async () => {
    const viewer = page((await call('viewer', 'GET', '/fees?pageSize=500')).body)
    expect(viewer.items.length).toBeGreaterThan(0)
    expect(viewer.items.every((f) => f.merchant.id === 1)).toBe(true)
    expect((await call('viewer', 'GET', '/fees?merchantId=2')).status).toBe(404)
    expect((await call('viewer', 'GET', `/fees?accountId=${ALT}`)).status).toBe(404)
    expect((await call('viewer', 'GET', `/fees?accountId=${MISSING}`)).status).toBe(404)
    expect((await call('viewer', 'GET', '/fees?providerId=201')).status).toBe(404)
  })

  it('filters by account, kind, status and q', async () => {
    const presets = page(
      (await call('analyst', 'GET', `/fees?accountId=${ACCOUNT_IDS['ProviderB-Main']}&kind=preset`)).body,
    )
    expect(presets.items.map((f) => [f.title, f.fixedAmount])).toEqual([['Monthly Fee', '250.0000']])

    const transactional = page((await call('analyst', 'GET', '/fees?kind=transactional&pageSize=500')).body)
    expect(transactional.items.every((f) => f.isTransactional)).toBe(true)

    const free = page((await call('analyst', 'GET', '/fees?kind=free_amount&pageSize=500')).body)
    expect(free.items.map((f) => f.title)).toContain('Chargeback over 1%')

    const closed = page((await call('analyst', 'GET', '/fees?status=closed&pageSize=500')).body)
    expect(closed.items.length).toBeGreaterThan(0)
    expect(closed.items.every((f) => f.status === 'closed')).toBe(true)

    const found = page((await call('analyst', 'GET', '/fees?q=CHARGEBACK&pageSize=500')).body)
    expect(found.items.length).toBeGreaterThan(0)
    for (const f of found.items) {
      expect(`${f.account.name} ${f.code} ${f.title} ${f.description ?? ''}`.toLowerCase()).toContain('chargeback')
    }
  })

  it('records each query and honours a scripted answer', async () => {
    respondNextFee('list', { status: 500, code: 'internal_error' })
    expect((await call('admin', 'GET', '/fees?status=active')).status).toBe(500)
    expect((await call('admin', 'GET', '/fees?status=active')).status).toBe(200)
    expect(feeRequests('list').map((r) => r.url)).toEqual(['/api/v1/fees?status=active', '/api/v1/fees?status=active'])
  })

  it('asks fee.view', async () => {
    const { status } = await call('viewer', 'GET', '/fees')
    expect(status).toBe(200)
  })
})

describe('fake fee API: GET /accounts/{id}/fees', () => {
  it('lists every fee of the account, transactional and not, with the extended fields', async () => {
    const { status, body } = await call('analyst', 'GET', `/accounts/${USD}/fees`)
    expect(status).toBe(200)
    const fees = z.array(AccountFee).parse(body)
    expect(fees.some((f) => f.isTransactional)).toBe(true)
    expect(fees.some((f) => !f.isTransactional)).toBe(true)
  })

  it('filters by transactional, as Settlement Review asks', async () => {
    const presets = z
      .array(AccountFee)
      .parse((await call('analyst', 'GET', `/accounts/${USD}/fees?transactional=false`)).body)
    expect(presets.map((f) => f.title)).toEqual(['Chargeback over 1%'])
    const perMovement = z
      .array(AccountFee)
      .parse((await call('analyst', 'GET', `/accounts/${USD}/fees?transactional=true`)).body)
    expect(perMovement.length).toBeGreaterThan(0)
    expect(perMovement.every((f) => f.isTransactional)).toBe(true)
  })

  it('asOf keeps only the fees in force on that day, both ends included', async () => {
    const inForce = async (asOf: string) =>
      z
        .array(AccountFee)
        .parse((await call('analyst', 'GET', `/accounts/${USD}/fees?transactional=true&asOf=${asOf}`)).body)
        .filter((f) => f.feeTypeId === 1 || f.feeTypeId === 5)
        .map((f) => [f.title, f.startDate, f.endDate])

    expect(await inForce('2025-12-31')).toEqual([['MDR', null, '2025-12-31']])
    expect(await inForce('2026-01-01')).toEqual([['MDR', '2026-01-01', null]])
    expect(await inForce('2027-01-01')).toEqual([
      ['MDR', '2026-01-01', null],
      ['Refund per txn fee', '2027-01-01', null],
    ])
  })

  it('an asOf that is not a day is a 400', async () => {
    const { status, body } = await call('analyst', 'GET', `/accounts/${USD}/fees?asOf=15/10/2026`)
    expect(status).toBe(400)
    expect(body).toMatchObject({ code: 'validation_error' })
  })

  it('answers the fees a test seeds for the account', async () => {
    seedAccountFees('ProviderA-USD', [feeFixture({ feeTypeId: 1, percentage: '0.029000' })])
    const fees = z.array(AccountFee).parse((await call('analyst', 'GET', `/accounts/${USD}/fees`)).body)
    expect(fees.map((f) => [f.title, f.percentage, f.startDate, f.endDate])).toEqual([['MDR', '0.029000', null, null]])
    expect(feeRequests('accountFees').at(-1)!.url).toBe(`/api/v1/accounts/${USD}/fees`)
  })
})

describe('fake fee API: POST /accounts/{id}/fees', () => {
  const wire = { feeTypeId: 121, fixedAmount: '15', startDate: null, endDate: null }

  it('creates the fee with FeeCreate and answers 201 with an AccountFee', async () => {
    const { status, body } = await call('admin', 'POST', `/accounts/${USD}/fees`, wire)
    expect(status).toBe(201)
    const fee = AccountFee.parse(body)
    expect(fee).toMatchObject({
      title: 'Wire Fee',
      fixedAmount: '15.0000',
      percentage: null,
      status: 'active',
      inUse: false,
      lastAppliedEventDate: null,
      createdBy: { userName: 'admin' },
    })
    const listed = z.array(AccountFee).parse((await call('admin', 'GET', `/accounts/${USD}/fees`)).body)
    expect(listed.map((f) => f.feeId)).toContain(fee.feeId)
    expect(feeRequests('create').at(-1)!.body).toEqual(wire)
  })

  it('a fee that starts after today is scheduled', async () => {
    const { body } = await call('admin', 'POST', `/accounts/${USD}/fees`, { ...wire, startDate: '2099-01-01' })
    expect(AccountFee.parse(body).status).toBe('scheduled')
  })

  it('asks fee.manage before the scope, and the account in the scope', async () => {
    expect((await call('analyst', 'POST', `/accounts/${MISSING}/fees`, wire)).status).toBe(403)
    expect((await call('admin', 'POST', `/accounts/${MISSING}/fees`, wire)).status).toBe(404)
  })

  it('checks the body with FeeCreate: a JSON number is a 400', async () => {
    const { status, body } = await call('admin', 'POST', `/accounts/${USD}/fees`, { ...wire, fixedAmount: 15 })
    expect(status).toBe(400)
    expect(body.code).toBe('validation_error')
  })

  it('answers the 409 a test scripts, without creating anything', async () => {
    const before = (await call('admin', 'GET', `/accounts/${USD}/fees`)).body.length
    const conflicts = [{ feeId: MISSING, startDate: '2026-01-01', endDate: null }]
    respondNextFee('create', { status: 409, code: 'fee_overlap', details: { conflicts } })
    const { status, body } = await call('admin', 'POST', `/accounts/${USD}/fees`, wire)
    expect(status).toBe(409)
    expect(body).toMatchObject({ code: 'fee_overlap', details: { conflicts } })
    expect((await call('admin', 'GET', `/accounts/${USD}/fees`)).body.length).toBe(before)
  })
})

describe('fake fee API: PATCH /fees/{id}', () => {
  async function seedOne(overrides: Partial<Parameters<typeof feeFixture>[0]> = {}) {
    const fee = feeFixture({ feeTypeId: 1, percentage: '0.100000', description: 'MDR', ...overrides })
    seedAccountFees('ProviderA-USD', [fee])
    return fee
  }

  it('corrects in place and answers a FeeUpdateResult without successor', async () => {
    const fee = await seedOne({ inUse: false, lastAppliedEventDate: null })
    const { status, body } = await call('admin', 'PATCH', `/fees/${fee.feeId}`, {
      percentage: '0.0275',
      reason: 'typo',
    })
    expect(status).toBe(200)
    const result = FeeUpdateResult.parse(body)
    expect(result.successor).toBeNull()
    expect(result.fee).toMatchObject({ feeId: fee.feeId, percentage: '0.027500' })
  })

  it('closes when only endDate goes from null to a day', async () => {
    const fee = await seedOne()
    const { body } = await call('admin', 'PATCH', `/fees/${fee.feeId}`, { endDate: '2026-10-31' })
    expect(FeeUpdateResult.parse(body).fee).toMatchObject({ endDate: '2026-10-31', status: 'closed' })
    const history = z.array(FeeHistoryEntry).parse((await call('admin', 'GET', `/fees/${fee.feeId}/history`)).body)
    expect(history[0]).toMatchObject({ action: 'closed', changedBy: { userName: 'admin' } })
  })

  it('changes from a date: closes the fee the day before and opens the successor with the rest inherited', async () => {
    const fee = await seedOne()
    const { status, body } = await call('admin', 'PATCH', `/fees/${fee.feeId}`, {
      effectiveFrom: '2026-11-01',
      percentage: '0.095',
    })
    expect(status).toBe(200)
    const { fee: closed, successor } = FeeUpdateResult.parse(body)
    expect(closed).toMatchObject({ endDate: '2026-10-31' })
    expect(successor).toMatchObject({
      startDate: '2026-11-01',
      endDate: null,
      percentage: '0.095000',
      description: 'MDR',
      inUse: false,
    })
    const listed = z.array(AccountFee).parse((await call('admin', 'GET', `/accounts/${USD}/fees`)).body)
    expect(listed.map((f) => f.feeId)).toEqual([fee.feeId, successor!.feeId])
  })

  it('the day before crosses months and leap years on the civil date', async () => {
    const fee = await seedOne()
    const { body } = await call('admin', 'PATCH', `/fees/${fee.feeId}`, {
      effectiveFrom: '2028-03-01',
      fixedAmount: '1',
    })
    expect(FeeUpdateResult.parse(body).fee.endDate).toBe('2028-02-29')
  })

  it('asks fee.manage before the scope', async () => {
    expect((await call('analyst', 'PATCH', `/fees/${MISSING}`, { description: 'x' })).status).toBe(403)
    expect((await call('admin', 'PATCH', `/fees/${MISSING}`, { description: 'x' })).status).toBe(404)
  })

  it('checks the body with FeePatch', async () => {
    const fee = await seedOne()
    for (const bad of [
      {},
      { feeTypeId: 2 },
      { effectiveFrom: '2027-01-01' },
      { effectiveFrom: '2027-01-01', startDate: '2027-01-01', fixedAmount: '1' },
    ]) {
      expect((await call('admin', 'PATCH', `/fees/${fee.feeId}`, bad)).status, JSON.stringify(bad)).toBe(400)
    }
  })

  it('answers a scripted fee_in_use and changes nothing', async () => {
    const fee = await seedOne()
    respondNextFee('patch', { status: 409, code: 'fee_in_use', details: { fields: ['percentage'] } })
    const { status, body } = await call('admin', 'PATCH', `/fees/${fee.feeId}`, { percentage: '0.03' })
    expect(status).toBe(409)
    expect(body.details).toEqual({ fields: ['percentage'] })
    const listed = z.array(AccountFee).parse((await call('admin', 'GET', `/accounts/${USD}/fees`)).body)
    expect(listed[0]!.percentage).toBe('0.100000')
  })
})

describe('fake fee API: GET /fees/{id}/history', () => {
  it('a seeded fee has its created row', async () => {
    const fee = feeFixture({ feeTypeId: 4, fixedAmount: '15.0000' })
    seedAccountFees('ProviderA-USD', [fee])
    const history = z.array(FeeHistoryEntry).parse((await call('viewer', 'GET', `/fees/${fee.feeId}/history`)).body)
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ action: 'created', before: null, after: { fixedAmount: '15.0000' } })
  })

  it('scope=type gives the chain of the type in the account, newest first', async () => {
    const fee = feeFixture({ feeTypeId: 1, percentage: '0.100000' })
    seedAccountFees('ProviderA-USD', [fee])
    const changed = await call('admin', 'PATCH', `/fees/${fee.feeId}`, {
      effectiveFrom: '2026-11-01',
      percentage: '0.095',
    })
    const successor = FeeUpdateResult.parse(changed.body).successor!
    const own = z.array(FeeHistoryEntry).parse((await call('analyst', 'GET', `/fees/${successor.feeId}/history`)).body)
    expect(own.map((h) => h.action)).toEqual(['created'])
    const chain = z
      .array(FeeHistoryEntry)
      .parse((await call('analyst', 'GET', `/fees/${successor.feeId}/history?scope=type`)).body)
    expect(chain.map((h) => [h.feeId, h.action])).toEqual([
      [successor.feeId, 'created'],
      [fee.feeId, 'closed'],
      [fee.feeId, 'created'],
    ])
    expect(feeRequests('history').at(-1)!.url).toContain('scope=type')
  })

  it('keeps to the scope and checks the query', async () => {
    const alt = feeFixture({ feeTypeId: 4, fixedAmount: '10.0000' })
    seedAccountFees('ProviderC-Alt', [alt])
    expect((await call('viewer', 'GET', `/fees/${alt.feeId}/history`)).status).toBe(404)
    expect((await call('viewer', 'GET', `/fees/${MISSING}/history`)).status).toBe(404)
    expect((await call('admin', 'GET', `/fees/${alt.feeId}/history?scope=account`)).status).toBe(400)
  })
})
