import fastifyJwt from '@fastify/jwt'
import Fastify, { type FastifyInstance } from 'fastify'
import { afterAll, describe, expect, it } from 'vitest'
import { FakeClock } from '../application/__fakes__/in-memory.js'
import { JwtTokenSigner } from './jwt-token-signer.js'

const SECRET = 'unit-test-secret-not-a-real-one-00001'
const OTHER_SECRET = 'another-unit-test-secret-not-real-0002'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function payloadOf(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString('utf8'))
}

const apps: FastifyInstance[] = []

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()))
})

async function setup(secret = SECRET) {
  const app = Fastify({ logger: false })
  apps.push(app)
  await app.register(fastifyJwt, { secret })
  await app.ready()
  const clock = new FakeClock()
  return { clock, signer: new JwtTokenSigner(app.jwt, clock) }
}

describe('JwtTokenSigner', () => {
  it('issues an access token that expires after 900 s and carries no role or permissions', async () => {
    const { signer } = await setup()

    const payload = payloadOf(await signer.signAccess(7))

    expect(Number(payload.exp) - Number(payload.iat)).toBe(900)
    expect(payload.typ).toBe('access')
    expect(payload).not.toHaveProperty('role')
    expect(payload).not.toHaveProperty('permissions')
    expect(payload).not.toHaveProperty('merchantIds')
  })

  it('issues a refresh token that expires after 7 days with a UUID jti', async () => {
    const { signer, clock } = await setup()

    const refresh = await signer.signRefresh(7)
    const payload = payloadOf(refresh.token)

    expect(Number(payload.exp) - Number(payload.iat)).toBe(7 * 24 * 60 * 60)
    expect(payload.typ).toBe('refresh')
    expect(refresh.jti).toMatch(UUID)
    expect(payload.jti).toBe(refresh.jti)
    expect(refresh.expiresAt.getTime()).toBe(clock.now().getTime() + 7 * 24 * 60 * 60 * 1000)
  })

  it('round-trips the subject and the jti', async () => {
    const { signer } = await setup()

    expect(await signer.verify(await signer.signAccess(7), 'access')).toEqual({ sub: 7 })
    const refresh = await signer.signRefresh(7)
    expect(await signer.verify(refresh.token, 'refresh')).toEqual({ sub: 7, jti: refresh.jti })
  })

  it('rejects an access token where a refresh token is expected, and vice versa', async () => {
    const { signer } = await setup()

    await expect(signer.verify(await signer.signAccess(7), 'refresh')).rejects.toThrow()
    await expect(signer.verify((await signer.signRefresh(7)).token, 'access')).rejects.toThrow()
  })

  it('rejects a token signed with another secret', async () => {
    const { signer } = await setup()
    const { signer: other } = await setup(OTHER_SECRET)

    await expect(signer.verify(await other.signAccess(7), 'access')).rejects.toThrow()
  })

  it('rejects an expired token', async () => {
    const { signer, clock } = await setup()
    const access = await signer.signAccess(7)
    const refresh = await signer.signRefresh(7)

    clock.advanceSeconds(901)
    await expect(signer.verify(access, 'access')).rejects.toThrow()

    clock.advanceSeconds(7 * 24 * 60 * 60)
    await expect(signer.verify(refresh.token, 'refresh')).rejects.toThrow()
  })

  it('accepts an expired token when ignoreExpiration is set (logout)', async () => {
    const { signer, clock } = await setup()
    const refresh = await signer.signRefresh(7)

    clock.advanceSeconds(8 * 24 * 60 * 60)

    expect(await signer.verify(refresh.token, 'refresh', { ignoreExpiration: true })).toEqual({
      sub: 7,
      jti: refresh.jti,
    })
  })

  it('rejects garbage', async () => {
    const { signer } = await setup()

    await expect(signer.verify('not.a.jwt', 'access')).rejects.toThrow()
  })
})
