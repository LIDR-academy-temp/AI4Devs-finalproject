import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ACCESS_TTL_SECONDS } from '../application/__fakes__/in-memory.js'
import { buildTestApp, PASSWORD } from './test-support.js'

let ctx: Awaited<ReturnType<typeof buildTestApp>>
const handler = vi.fn(async () => ({ ok: true }))

beforeEach(async () => {
  handler.mockClear()
  ctx = await buildTestApp()
  await ctx.app.register(async (scope) => {
    scope.get('/__test/protected', { preHandler: scope.requirePermission('settlement.process') }, handler)
  })
  await ctx.app.ready()
})

afterEach(async () => {
  await ctx.app.close()
})

async function tokensOf(userName: string) {
  return ctx.authService.login({ userName, password: PASSWORD })
}

function call(authorization?: string) {
  return ctx.app.inject({
    method: 'GET',
    url: '/__test/protected',
    headers: authorization ? { authorization } : {},
  })
}

async function expectUnauthorized(authorization?: string) {
  const res = await call(authorization)
  expect(res.statusCode).toBe(401)
  expect(res.json().code).toBe('unauthorized')
  expect(handler).not.toHaveBeenCalled()
}

describe('requirePermission', () => {
  it('answers 401 without an Authorization header and does not run the handler', async () => {
    await expectUnauthorized()
  })

  it('answers 401 with a non-bearer Authorization header', async () => {
    const { accessToken } = await tokensOf('analyst')
    await expectUnauthorized(`Basic ${accessToken}`)
  })

  it('answers 401 with a badly signed token', async () => {
    await expectUnauthorized('Bearer fake.not-a-token')
  })

  it('answers 401 with an expired access token', async () => {
    const { accessToken } = await tokensOf('analyst')
    ctx.clock.advanceSeconds(ACCESS_TTL_SECONDS + 1)

    await expectUnauthorized(`Bearer ${accessToken}`)
  })

  it('answers 401 with a refresh token', async () => {
    const { refreshToken } = await tokensOf('analyst')

    await expectUnauthorized(`Bearer ${refreshToken}`)
  })

  it('answers 401 for a user deactivated after login', async () => {
    const { accessToken } = await tokensOf('analyst')
    ctx.users.setActive('analyst', false)

    await expectUnauthorized(`Bearer ${accessToken}`)
  })

  it('answers 403 forbidden to viewer and does not run the handler', async () => {
    const { accessToken } = await tokensOf('viewer')

    const res = await call(`Bearer ${accessToken}`)

    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('forbidden')
    expect(handler).not.toHaveBeenCalled()
  })

  it('runs the handler once for analyst, with request.auth set', async () => {
    const { accessToken } = await tokensOf('analyst')

    const res = await call(`Bearer ${accessToken}`)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(handler).toHaveBeenCalledTimes(1)
    const request = (handler.mock.calls[0] as unknown as [{ auth: { userName: string; merchantIds: number[] } }])[0]
    expect(request.auth).toMatchObject({ userName: 'analyst', merchantIds: [1, 2] })
  })
})
