import { AccountDetail } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { ACCOUNT_IDS, InMemoryCatalogRepository } from '../../catalog/application/__fakes__/in-memory.js'
import { CatalogService } from '../../catalog/application/catalog-service.js'
import { InMemoryAccountAdminRepository } from '../application/__fakes__/in-memory.js'
import { AccountAdminService } from '../application/account-admin-service.js'

// Spec accounts "Escrituras de cuentas: permiso y alcance" (admin-accounts design D10) and the HTTP side of the
// writes over in-memory doubles; the rules themselves are in account-admin-service.test.ts.
let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  const catalogRepo = new InMemoryCatalogRepository()
  const catalogService = new CatalogService(catalogRepo)
  const adminService = new AccountAdminService(
    new InMemoryAccountAdminRepository(catalogRepo),
    catalogService,
    () => '2026-11-03',
  )
  ctx = await buildTestApp({ catalogService, accounts: { adminService } })
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

  it('POST answers 201 with the account detail as @recon/shared shapes it', async () => {
    const res = await call('POST', '/providers/201/accounts', 'admin', { ...CREATE, rollingReserveCapAmt: '25000' })

    expect(res.statusCode).toBe(201)
    expect(AccountDetail.safeParse(res.json()).success).toBe(true)
    expect(res.json()).toMatchObject({ name: 'bruno-min', rollingReserveCapAmt: '25000.0000', isActive: true })
  })

  it('PATCH answers 200 with the account detail', async () => {
    const res = await call('PATCH', `/accounts/${ACCOUNT}`, 'admin', { isActive: false, reason: 'closing' })

    expect(res.statusCode).toBe(200)
    expect(AccountDetail.parse(res.json()).isActive).toBe(false)
  })

  it('maps the domain errors: 409 account_name_taken, 400 with details.field, 404 not_found', async () => {
    const taken = await call('POST', '/providers/201/accounts', 'admin', { ...CREATE, name: 'providerc-usd' })
    const cap = await call('POST', '/providers/201/accounts', 'admin', { ...CREATE, rollingReserveCapAmt: '-1' })
    const provider = await call('POST', '/providers/999/accounts', 'admin', CREATE)
    const account = await call('PATCH', '/accounts/00000000-0000-4000-8000-00000000ffff', 'admin', { isActive: false })

    expect([taken.statusCode, taken.json().code]).toEqual([409, 'account_name_taken'])
    expect([cap.statusCode, cap.json().details]).toEqual([400, { field: 'rollingReserveCapAmt' }])
    expect([provider.statusCode, provider.json().code]).toEqual([404, 'not_found'])
    expect([account.statusCode, account.json().code]).toEqual([404, 'not_found'])
  })
})
