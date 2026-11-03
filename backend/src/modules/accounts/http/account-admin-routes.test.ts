import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { ACCOUNT_IDS, InMemoryCatalogRepository } from '../../catalog/application/__fakes__/in-memory.js'
import { CatalogService } from '../../catalog/application/catalog-service.js'

// Spec accounts "Escrituras de cuentas: permiso y alcance" (admin-accounts design D10): the routes, their schemas and
// their permission exist before the use cases. Behaviour behind the permission arrives with group 3.
let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  ctx = await buildTestApp({ catalogService: new CatalogService(new InMemoryCatalogRepository()) })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

const ACCOUNT = ACCOUNT_IDS['ProviderC-USD']
const CREATE = { name: 'bruno-min', chargebackReservePolicy: 'hold_until_term' }

async function call(method: 'POST' | 'PATCH', url: string, userName?: string, payload?: object) {
  const headers = userName
    ? { authorization: `Bearer ${(await ctx.authService.login({ userName, password: PASSWORD })).accessToken}` }
    : {}
  return ctx.app.inject({ method, url: `/api/v1${url}`, headers, ...(payload === undefined ? {} : { payload }) })
}

const writes = [
  ['POST', '/providers/201/accounts', CREATE],
  ['PATCH', `/accounts/${ACCOUNT}`, { isActive: false }],
] as const

describe('account administration routes', () => {
  it('answer 401 unauthorized without a token', async () => {
    for (const [method, url, body] of writes) {
      const res = await call(method, url, undefined, body)
      expect(res.statusCode, url).toBe(401)
      expect(res.json().code).toBe('unauthorized')
    }
  })

  it.each(['analyst', 'viewer'])(
    'answer 403 forbidden to %s (no account.manage), before looking at the provider or the account',
    async (userName) => {
      // viewer does not see merchant 2: still 403, never 404 (scenario "Viewer fuera del alcance recibe 403 antes que 404").
      for (const [method, url, body] of writes) {
        const res = await call(method, url, userName, body)
        expect(res.statusCode, `${userName} ${url}`).toBe(403)
        expect(res.json().code).toBe('forbidden')
      }
    },
  )

  it('answer 400 validation_error to a malformed body or id', async () => {
    for (const [method, url, body] of [
      ['POST', '/providers/201/accounts', { ...CREATE, name: '   ' }],
      ['POST', '/providers/201/accounts', { ...CREATE, name: 'x'.repeat(51) }],
      ['POST', '/providers/201/accounts', { ...CREATE, chargebackReservePolicy: 'keep' }],
      ['POST', '/providers/201/accounts', { ...CREATE, rollingReserveCapAmt: 25000 }],
      ['POST', '/providers/201/accounts', { ...CREATE, color: 'red' }],
      ['POST', '/providers/not-a-number/accounts', CREATE],
      ['PATCH', `/accounts/${ACCOUNT}`, {}],
      ['PATCH', `/accounts/${ACCOUNT}`, { reason: 'x' }],
      ['PATCH', `/accounts/${ACCOUNT}`, { providerId: 101 }],
      ['PATCH', `/accounts/${ACCOUNT}`, { color: 'red' }],
      ['PATCH', '/accounts/not-a-uuid', { isActive: false }],
    ] as const) {
      const res = await call(method, url, 'admin', body)
      expect(res.statusCode, `${method} ${url} ${JSON.stringify(body)}`).toBe(400)
      expect(res.json().code).toBe('validation_error')
    }
  })

  it('answer 501 not_implemented behind a valid request until the use cases land', async () => {
    for (const [method, url, body] of writes) {
      const res = await call(method, url, 'admin', body)
      expect(res.statusCode, url).toBe(501)
      expect(res.json().code).toBe('not_implemented')
    }
  })
})
