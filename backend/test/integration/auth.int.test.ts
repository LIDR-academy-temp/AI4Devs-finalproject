import { PERMISSION_CODES } from '@recon/shared'
import argon2 from 'argon2'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestApp, decodePayload, SEED_PASSWORD, signHs256, TEST_JWT_SECRET } from './helpers.js'

const INACTIVE_USER = 'inactive_test'
const GENERIC_401 = { code: 'invalid_credentials', message: 'Invalid user name or password' }
const ALL_PERMISSIONS = [...PERMISSION_CODES].sort()

let ctx: Awaited<ReturnType<typeof createTestApp>>
let inactiveUserId: number
let auditBaseline: bigint
const protectedHandler = vi.fn(async () => ({ ok: true }))

beforeAll(async () => {
  ctx = await createTestApp()
  const { app, prisma } = ctx

  await app.register(
    async (scope) => {
      scope.get('/__test/protected', { preHandler: scope.requirePermission('settlement.process') }, protectedHandler)
    },
    { prefix: '/api/v1' },
  )
  await app.ready()

  const viewerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'viewer' } })
  const passwordHash = await argon2.hash(SEED_PASSWORD)
  const inactive = await prisma.user.upsert({
    where: { userName: INACTIVE_USER },
    create: {
      userName: INACTIVE_USER,
      email: 'inactive_test@recon.local',
      displayName: 'Inactive Test',
      passwordHash,
      roleId: viewerRole.roleId,
      merchantScope: 'assigned',
      isActive: false,
    },
    update: { passwordHash, isActive: false },
  })
  inactiveUserId = inactive.userId

  const { _max } = await prisma.auditLog.aggregate({ _max: { auditId: true } })
  auditBaseline = _max.auditId ?? 0n
})

afterAll(async () => {
  if (ctx) {
    const { prisma } = ctx
    if (inactiveUserId !== undefined) {
      await prisma.refreshToken.deleteMany({ where: { userId: inactiveUserId } })
      await prisma.auditLog.deleteMany({ where: { userId: inactiveUserId } })
      await prisma.user.delete({ where: { userId: inactiveUserId } })
    }
    await prisma.auditLog.deleteMany({ where: { userId: null, auditId: { gt: auditBaseline } } })
    await ctx.app.close()
    await prisma.$disconnect()
  }
})

beforeEach(() => {
  protectedHandler.mockClear()
})

function login(userName: string, password: string) {
  return ctx.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { userName, password } })
}

async function tokensFor(userName: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await login(userName, SEED_PASSWORD)
  expect(res.statusCode).toBe(200)
  return res.json()
}

function me(accessToken?: string) {
  return ctx.app.inject({
    method: 'GET',
    url: '/api/v1/auth/me',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  })
}

function refresh(refreshToken: string) {
  return ctx.app.inject({ method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken } })
}

function logout(refreshToken: string) {
  return ctx.app.inject({ method: 'POST', url: '/api/v1/auth/logout', payload: { refreshToken } })
}

function callProtected(accessToken?: string) {
  return ctx.app.inject({
    method: 'GET',
    url: '/api/v1/__test/protected',
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  })
}

async function auditRowsSinceStart() {
  return ctx.prisma.auditLog.findMany({ where: { auditId: { gt: auditBaseline } }, orderBy: { auditId: 'asc' } })
}

describe('POST /api/v1/auth/login', () => {
  it('logs analyst in and /me returns role and permissions', async () => {
    const res = await login('analyst', SEED_PASSWORD)

    expect(res.statusCode).toBe(200)
    const pair = res.json()
    expect(pair.accessToken).toEqual(expect.any(String))
    expect(pair.accessToken).not.toBe('')
    expect(pair.refreshToken).toEqual(expect.any(String))
    expect(pair.refreshToken).not.toBe('')
    expect(pair.expiresIn).toBe(900)

    const meRes = await me(pair.accessToken)
    expect(meRes.statusCode).toBe(200)
    const body = meRes.json()
    expect(body.role).toBe('analyst')
    expect([...body.permissions].sort()).toEqual(['fee.view', 'reports.view', 'settlement.process'])
  })

  it('issues an access token that expires in 15 minutes and carries no role or permissions', async () => {
    const { accessToken } = await tokensFor('analyst')

    const claims = decodePayload(accessToken)
    expect(Number(claims.exp) - Number(claims.iat)).toBe(900)
    expect(claims).not.toHaveProperty('role')
    expect(claims).not.toHaveProperty('permissions')
  })

  it.each([
    { title: 'without userName', payload: { password: SEED_PASSWORD } },
    { title: 'without password', payload: { userName: 'analyst' } },
  ])('responds 400 validation_error $title', async ({ payload }) => {
    const res = await ctx.app.inject({ method: 'POST', url: '/api/v1/auth/login', payload })

    expect(res.statusCode).toBe(400)
    expect(res.json().code).toBe('validation_error')
  })

  it('responds 401 with the same body for a wrong password, an inactive user and an unknown user', async () => {
    const badPassword = await login('viewer', 'definitely-not-the-password')
    const inactive = await login(INACTIVE_USER, SEED_PASSWORD)
    const unknown = await login('ghost', 'S3cret!')

    expect(badPassword.statusCode).toBe(401)
    expect(badPassword.json()).toEqual(GENERIC_401)
    expect(inactive.statusCode).toBe(401)
    expect(inactive.body).toBe(badPassword.body)
    expect(unknown.statusCode).toBe(401)
    expect(unknown.body).toBe(badPassword.body)
  })
})

describe('login audit trail', () => {
  it('records auth.login.success with the user id', async () => {
    await tokensFor('analyst')
    const analyst = await ctx.prisma.user.findUniqueOrThrow({ where: { userName: 'analyst' } })

    const rows = await auditRowsSinceStart()
    expect(rows).toContainEqual(
      expect.objectContaining({ action: 'auth.login.success', entityType: 'User', userId: analyst.userId }),
    )
  })

  it('records auth.login.failure for an unknown user with userId NULL and no secrets', async () => {
    await login('ghost', 'S3cret!')

    const rows = await auditRowsSinceStart()
    const ghostRow = rows.filter((r) => r.action === 'auth.login.failure' && r.userId === null).at(-1)
    expect(ghostRow).toBeDefined()
    expect(ghostRow!.entityType).toBe('User')
    expect(JSON.parse(ghostRow!.detailJson ?? '{}')).toMatchObject({ userName: 'ghost', reason: 'unknown_user' })

    const dump = rows.map((r) => r.detailJson ?? '').join('\n')
    expect(dump).not.toContain('S3cret!')
    expect(dump).not.toContain(SEED_PASSWORD)
    expect(dump).not.toContain('$argon2')
  })

  it('records the failure reason for a wrong password and for an inactive user', async () => {
    await login('viewer', 'definitely-not-the-password')
    await login(INACTIVE_USER, SEED_PASSWORD)

    const rows = await auditRowsSinceStart()
    const reasons = rows
      .filter((r) => r.action === 'auth.login.failure')
      .map((r) => JSON.parse(r.detailJson ?? '{}') as { userName: string; reason: string })
    expect(reasons).toContainEqual(expect.objectContaining({ userName: 'viewer', reason: 'bad_password' }))
    expect(reasons).toContainEqual(expect.objectContaining({ userName: INACTIVE_USER, reason: 'inactive' }))
    expect(rows.filter((r) => r.userId === inactiveUserId && r.action === 'auth.login.failure').length).toBeGreaterThan(
      0,
    )
  })
})

describe('refresh and logout', () => {
  it('rotates the pair: the new tokens differ and the previous refresh no longer works', async () => {
    const first = await tokensFor('analyst')

    const rotated = await refresh(first.refreshToken)
    expect(rotated.statusCode).toBe(200)
    const second = rotated.json()
    expect(second.accessToken).not.toBe(first.accessToken)
    expect(second.refreshToken).not.toBe(first.refreshToken)

    const reused = await refresh(first.refreshToken)
    expect(reused.statusCode).toBe(401)
    expect(reused.json().code).toBe('invalid_token')

    expect((await logout(second.refreshToken)).statusCode).toBe(204)
    const afterLogout = await refresh(second.refreshToken)
    expect(afterLogout.statusCode).toBe(401)
    expect(afterLogout.json().code).toBe('invalid_token')
  })

  it('rejects an access token used as a refresh token', async () => {
    const { accessToken } = await tokensFor('analyst')

    const res = await refresh(accessToken)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('invalid_token')
  })

  it('answers 204 to repeated logouts with the same token, and to garbage', async () => {
    const { refreshToken } = await tokensFor('viewer')

    expect((await logout(refreshToken)).statusCode).toBe(204)
    expect((await logout(refreshToken)).statusCode).toBe(204)
    expect((await logout('garbage')).statusCode).toBe(204)
  })
})

describe('GET /api/v1/auth/me', () => {
  it('viewer has scope "assigned" and sees only merchant 1', async () => {
    const { accessToken } = await tokensFor('viewer')

    const res = await me(accessToken)

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body).toMatchObject({ userName: 'viewer', role: 'viewer', merchantScope: 'assigned' })
    expect(body.merchants.map((m: { merchantId: number }) => m.merchantId)).toEqual([1])
  })

  it('admin has scope "all", sees every merchant and has the seven permissions', async () => {
    const { accessToken } = await tokensFor('admin')
    const allMerchants = await ctx.prisma.merchant.findMany({ select: { merchantId: true, name: true } })

    const res = await me(accessToken)

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.merchantScope).toBe('all')
    expect(body.merchants).toEqual(expect.arrayContaining(allMerchants))
    expect(body.merchants).toHaveLength(allMerchants.length)
    expect([...body.permissions].sort()).toEqual(ALL_PERMISSIONS)
  })
})

describe('authentication of protected routes', () => {
  it('responds 401 unauthorized without an Authorization header', async () => {
    const res = await me()

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('responds 401 unauthorized with an expired access token', async () => {
    const { accessToken } = await tokensFor('analyst')
    const claims = decodePayload(accessToken)
    const now = Math.floor(Date.now() / 1000)
    const expired = signHs256({ ...claims, iat: now - 1000, exp: now - 100 }, TEST_JWT_SECRET)

    const res = await me(expired)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('responds 401 unauthorized with a token signed with another secret', async () => {
    const { accessToken } = await tokensFor('analyst')
    const forged = signHs256(decodePayload(accessToken), 'another-secret-that-is-at-least-32-chars')

    const res = await me(forged)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('responds 401 unauthorized with a refresh token used as access token', async () => {
    const { refreshToken } = await tokensFor('analyst')

    const res = await me(refreshToken)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })

  it('responds 401 unauthorized for a user deactivated after login', async () => {
    await ctx.prisma.user.update({ where: { userId: inactiveUserId }, data: { isActive: true } })
    const { accessToken } = await tokensFor(INACTIVE_USER)
    await ctx.prisma.user.update({ where: { userId: inactiveUserId }, data: { isActive: false } })

    const res = await me(accessToken)

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
  })
})

describe('authorization by permission', () => {
  it('runs the handler for analyst (has settlement.process)', async () => {
    const { accessToken } = await tokensFor('analyst')

    const res = await callProtected(accessToken)

    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ ok: true })
    expect(protectedHandler).toHaveBeenCalledTimes(1)
  })

  it('responds 403 forbidden to viewer and does not run the handler', async () => {
    const { accessToken } = await tokensFor('viewer')

    const res = await callProtected(accessToken)

    expect(res.statusCode).toBe(403)
    expect(res.json().code).toBe('forbidden')
    expect(protectedHandler).not.toHaveBeenCalled()
  })

  it('responds 401 unauthorized without a token and does not run the handler', async () => {
    const res = await callProtected()

    expect(res.statusCode).toBe(401)
    expect(res.json().code).toBe('unauthorized')
    expect(protectedHandler).not.toHaveBeenCalled()
  })
})

// Runs last: by now every flow above (logins, failures, refresh, logout, protected routes) has logged.
describe('logger output', () => {
  it('never contains passwords, Argon2 hashes or tokens', () => {
    const log = ctx.logLines.join('\n')

    expect(ctx.logLines.length).toBeGreaterThan(0)
    expect(log).not.toContain(SEED_PASSWORD)
    expect(log).not.toContain('S3cret!')
    expect(log).not.toContain('definitely-not-the-password')
    expect(log).not.toContain('$argon2')
    // Every JWT issued by the app starts with this encoded header
    expect(log).not.toMatch(/eyJhbGciOi/)
  })
})
