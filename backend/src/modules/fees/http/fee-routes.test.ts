import { AccountFee, FeeTypeView } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'
import { ACCOUNT_IDS } from '../../catalog/application/__fakes__/in-memory.js'
import { InMemoryFeeRepository } from '../application/__fakes__/in-memory.js'
import { FeeReadService } from '../application/fee-read-service.js'

// README §4.4: GET /accounts/{id}/fees (fee.view) and GET /fee-types (authenticated), settlement-process D21.
let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  ctx = await buildTestApp({ fees: { service: new FeeReadService(new InMemoryFeeRepository()) } })
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

describe('GET /accounts/{id}/fees', () => {
  const url = `/accounts/${ACCOUNT_IDS['ProviderB-Main']}/fees?transactional=false`

  it('answers the presets of the account to a user with fee.view', async () => {
    const res = await get(url, 'viewer')

    expect(res.statusCode, res.body).toBe(200)
    const fees = z.array(AccountFee).parse(res.json())
    expect(fees.map((f) => [f.code, f.fixedAmount])).toEqual([['Monthly Fee', '250.0000']])
  })

  it('answers 401 without a token', async () => {
    expect((await get(url)).statusCode).toBe(401)
  })

  it('answers the same 404 not_found for an account of another merchant and an unknown one', async () => {
    const outside = await get(`/accounts/${ACCOUNT_IDS['ProviderC-Alt']}/fees`, 'viewer')
    const unknown = await get('/accounts/00000000-0000-4000-8000-00000000ffff/fees', 'viewer')

    expect(outside.statusCode).toBe(404)
    expect(outside.json()).toEqual(unknown.json())
    expect(outside.json().code).toBe('not_found')
  })

  it('answers 400 validation_error for an invalid asOf or transactional, or a malformed id', async () => {
    for (const bad of [
      `/accounts/${ACCOUNT_IDS['ProviderB-Main']}/fees?asOf=15-10-2026`,
      `/accounts/${ACCOUNT_IDS['ProviderB-Main']}/fees?transactional=yes`,
      '/accounts/not-a-uuid/fees',
    ]) {
      const res = await get(bad, 'viewer')
      expect(res.statusCode, bad).toBe(400)
      expect(res.json().code).toBe('validation_error')
    }
  })
})

describe('GET /fee-types', () => {
  it('answers the catalog to any authenticated user', async () => {
    const res = await get('/fee-types', 'viewer')

    expect(res.statusCode).toBe(200)
    expect(z.array(FeeTypeView).parse(res.json())).toHaveLength(27)
  })

  it('answers 401 without a token', async () => {
    expect((await get('/fee-types')).statusCode).toBe(401)
  })
})
