import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from '../../../test-support/build-test-app.js'

// Spec matching "Conjuntos de reglas de un proveedor" (admin-accounts design D8): the route and its schema exist
// before the read. Behaviour behind authentication arrives with group 4.
let ctx: Awaited<ReturnType<typeof buildTestApp>>

beforeEach(async () => {
  ctx = await buildTestApp()
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

  it('needs no permission: viewer gets 501 not_implemented until the read lands, never 403', async () => {
    const res = await get('/providers/101/matching-rule-sets', 'viewer')

    expect(res.statusCode).toBe(501)
    expect(res.json().code).toBe('not_implemented')
  })
})
