import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { InMemoryFeeRepository } from '../application/__fakes__/in-memory.js'
import { FeeReadService } from '../application/fee-read-service.js'

// Spec fees "Permisos y alcance de la administración de fees" (admin-fees design D11): the routes, their schemas and
// their permissions exist before the use cases. Behaviour behind the permission arrives with groups 3 and 4.
let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  ctx = await buildTestApp({ fees: { service: new FeeReadService(new InMemoryFeeRepository()) } })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

const FEE_ID = '00000000-0000-4000-8000-00000000ffff'
const ACCOUNT = ACCOUNT_IDS['ProviderA-USD']

async function call(method: 'GET' | 'POST' | 'PATCH', url: string, userName?: string, payload?: object) {
  const headers = userName
    ? { authorization: `Bearer ${(await ctx.authService.login({ userName, password: PASSWORD })).accessToken}` }
    : {}
  return ctx.app.inject({ method, url: `/api/v1${url}`, headers, ...(payload === undefined ? {} : { payload }) })
}

const writes = [
  ['POST', `/accounts/${ACCOUNT}/fees`, { feeTypeId: 121, fixedAmount: '15.0000' }],
  ['PATCH', `/fees/${FEE_ID}`, { description: 'x' }],
] as const
const reads = [
  ['GET', '/fees'],
  ['GET', `/fees/${FEE_ID}/history`],
] as const

describe('fee administration routes', () => {
  it('answer 401 without a token', async () => {
    for (const [method, url, body] of writes) expect((await call(method, url, undefined, body)).statusCode).toBe(401)
    for (const [method, url] of reads) expect((await call(method, url)).statusCode).toBe(401)
  })

  it('answer 403 forbidden to a user without fee.manage, before looking at the fee or the account', async () => {
    for (const [method, url, body] of writes) {
      const res = await call(method, url, 'analyst', body)
      expect(res.statusCode, url).toBe(403)
      expect(res.json().code).toBe('forbidden')
    }
  })

  it('answer 400 validation_error to a malformed body, query or id', async () => {
    for (const [method, url, body] of [
      ['POST', `/accounts/${ACCOUNT}/fees`, { feeTypeId: 121, fixedAmount: 15 }],
      ['POST', '/accounts/not-a-uuid/fees', { feeTypeId: 121, fixedAmount: '15.0000' }],
      ['PATCH', `/fees/${FEE_ID}`, {}],
      ['PATCH', `/fees/${FEE_ID}`, { feeTypeId: 2 }],
      ['PATCH', `/fees/${FEE_ID}`, { effectiveFrom: '2026-11-01', startDate: '2026-11-01', fixedAmount: '1' }],
    ] as const) {
      const res = await call(method, url, 'admin', body)
      expect(res.statusCode, `${method} ${url} ${JSON.stringify(body)}`).toBe(400)
      expect(res.json().code).toBe('validation_error')
    }
    for (const url of [
      '/fees?pageSize=0',
      '/fees?status=withdrawn',
      '/fees?sort=title',
      `/fees/${FEE_ID}/history?scope=x`,
    ]) {
      const res = await call('GET', url, 'viewer')
      expect(res.statusCode, url).toBe(400)
      expect(res.json().code).toBe('validation_error')
    }
  })

  it('answer 501 not_implemented behind a valid request until the use cases land', async () => {
    for (const [method, url, body] of writes) expect((await call(method, url, 'admin', body)).statusCode).toBe(501)
    for (const [method, url] of reads) {
      const res = await call(method, url, 'viewer')
      expect(res.statusCode, url).toBe(501)
      expect(res.json().code).toBe('not_implemented')
    }
  })
})
