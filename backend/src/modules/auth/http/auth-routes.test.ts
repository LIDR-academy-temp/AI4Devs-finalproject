import { MeResponse, TokenPair } from '@recon/shared'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildTestApp, PASSWORD } from './test-support.js'

let ctx: Awaited<ReturnType<typeof buildTestApp>>
let logLines: string[]

beforeEach(async () => {
  logLines = []
  ctx = await buildTestApp({ logLines })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

function post(url: string, payload: unknown) {
  return ctx.app.inject({ method: 'POST', url: `/api/v1/auth${url}`, payload: payload as object })
}

async function login(userName: string, password = PASSWORD) {
  const res = await post('/login', { userName, password })
  expect(res.statusCode).toBe(200)
  return TokenPair.parse(res.json())
}

describe('POST /api/v1/auth/login', () => {
  it('answers 200 with a TokenPair', async () => {
    const res = await post('/login', { userName: 'analyst', password: PASSWORD })

    expect(res.statusCode).toBe(200)
    const pair = TokenPair.parse(res.json())
    expect(pair.expiresIn).toBe(900)
  })

  it.each([
    { title: 'without password', body: { userName: 'analyst' } },
    { title: 'without userName', body: { password: PASSWORD } },
    { title: 'with an empty body', body: {} },
  ])('answers 400 validation_error $title', async ({ body }) => {
    const res = await post('/login', body)

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })

  it('answers the three credential failures with byte-identical 401 bodies', async () => {
    const badPassword = await post('/login', { userName: 'viewer', password: 'nope' })
    const inactive = await post('/login', { userName: 'inactive_user', password: PASSWORD })
    const unknown = await post('/login', { userName: 'ghost', password: 'S3cret!' })

    expect(badPassword.statusCode).toBe(401)
    expect(inactive.statusCode).toBe(401)
    expect(unknown.statusCode).toBe(401)
    expect(badPassword.json()).toEqual({ code: 'invalid_credentials', message: 'Invalid user name or password' })
    expect(inactive.body).toBe(badPassword.body)
    expect(unknown.body).toBe(badPassword.body)
  })

  it('passes the client ip to the audit trail', async () => {
    await login('analyst')

    expect(ctx.audit.entries[0]!.detail).toHaveProperty('ip')
  })
})

describe('POST /api/v1/auth/refresh', () => {
  it('answers 200 with a new pair, and 401 invalid_token when the old refresh is reused', async () => {
    const first = await login('analyst')

    const res = await post('/refresh', { refreshToken: first.refreshToken })
    expect(res.statusCode).toBe(200)
    const second = TokenPair.parse(res.json())
    expect(second.refreshToken).not.toBe(first.refreshToken)

    const reused = await post('/refresh', { refreshToken: first.refreshToken })
    expect(reused.statusCode).toBe(401)
    expect(reused.json().code).toBe('invalid_token')
  })

  it('answers 401 invalid_token for an access token', async () => {
    const { accessToken } = await login('analyst')

    const res = await post('/refresh', { refreshToken: accessToken })

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('invalid_token')
  })

  it('answers 400 validation_error without a refreshToken', async () => {
    const res = await post('/refresh', {})

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })
})

describe('POST /api/v1/auth/logout', () => {
  it('answers 204 twice with the same token, and the token stops working', async () => {
    const { refreshToken } = await login('analyst')

    const first = await post('/logout', { refreshToken })
    const second = await post('/logout', { refreshToken })

    expect(first.statusCode).toBe(204)
    expect(first.body).toBe('')
    expect(second.statusCode).toBe(204)
    expect((await post('/refresh', { refreshToken })).statusCode).toBe(401)
  })

  it('answers 204 to garbage', async () => {
    expect((await post('/logout', { refreshToken: 'garbage' })).statusCode).toBe(204)
  })
})

describe('GET /api/v1/auth/me', () => {
  it('answers 200 with a MeResponse', async () => {
    const { accessToken } = await login('viewer')

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    expect(res.statusCode).toBe(200)
    const me = MeResponse.parse(res.json())
    expect(me).toMatchObject({ userName: 'viewer', merchantScope: 'assigned' })
    expect(me.merchants).toEqual([{ merchantId: 1, name: 'Merchant A' }])
  })

  it('answers 401 unauthorized without a token', async () => {
    const res = await ctx.app.inject({ method: 'GET', url: '/api/v1/auth/me' })

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })
})

describe('logging', () => {
  it('never writes passwords or tokens to the log', async () => {
    const pair = await login('analyst')
    await post('/login', { userName: 'ghost', password: 'S3cret!' })
    await post('/refresh', { refreshToken: pair.refreshToken })
    await ctx.app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: `Bearer ${pair.accessToken}` },
    })
    await post('/logout', { refreshToken: pair.refreshToken })

    const log = logLines.join('\n')
    expect(logLines.length).toBeGreaterThan(0)
    expect(log).not.toContain(PASSWORD)
    expect(log).not.toContain('S3cret!')
    expect(log).not.toContain(pair.accessToken)
    expect(log).not.toContain(pair.refreshToken)
  })
})

describe('OpenAPI', () => {
  it('lists the four auth routes, with bearerAuth on /auth/me', async () => {
    const doc = (await ctx.app.inject({ method: 'GET', url: '/docs/json' })).json()

    expect(doc.paths['/api/v1/auth/login']).toHaveProperty('post')
    expect(doc.paths['/api/v1/auth/refresh']).toHaveProperty('post')
    expect(doc.paths['/api/v1/auth/logout']).toHaveProperty('post')
    expect(doc.paths['/api/v1/auth/me'].get.security).toEqual([{ bearerAuth: [] }])
  })
})
