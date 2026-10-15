import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidCredentialsError, InvalidTokenError } from '../domain/errors.js'
import {
  ACCESS_TTL_SECONDS,
  FakeClock,
  FakePasswordHasher,
  FakeTokenSigner,
  InMemoryAuditLogger,
  InMemoryRefreshTokenStore,
  InMemoryUserRepository,
  MERCHANTS,
  PASSWORD,
  REFRESH_TTL_SECONDS,
  seedUsers,
} from './__fakes__/in-memory.js'
import { AuthService } from './auth-service.js'

let clock: FakeClock
let users: InMemoryUserRepository
let refreshTokens: InMemoryRefreshTokenStore
let audit: InMemoryAuditLogger
let hasher: FakePasswordHasher
let signer: FakeTokenSigner
let log: { error: ReturnType<typeof vi.fn> }
let service: AuthService

beforeEach(() => {
  clock = new FakeClock()
  users = new InMemoryUserRepository(seedUsers(), MERCHANTS)
  refreshTokens = new InMemoryRefreshTokenStore()
  audit = new InMemoryAuditLogger()
  hasher = new FakePasswordHasher()
  signer = new FakeTokenSigner(clock)
  log = { error: vi.fn() }
  service = new AuthService({ users, refreshTokens, audit, hasher, signer, clock, log })
})

async function loginFailure(userName: string, password: string): Promise<InvalidCredentialsError> {
  const error = await service.login({ userName, password }).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(InvalidCredentialsError)
  return error as InvalidCredentialsError
}

describe('AuthService.login', () => {
  it('returns a token pair for an active user with the right password', async () => {
    const pair = await service.login({ userName: 'analyst', password: PASSWORD })

    expect(pair.accessToken).toEqual(expect.any(String))
    expect(pair.accessToken).not.toBe('')
    expect(pair.refreshToken).toEqual(expect.any(String))
    expect(pair.refreshToken).not.toBe('')
    expect(pair.expiresIn).toBe(ACCESS_TTL_SECONDS)
  })

  it('persists the issued refresh token (by jti) for the user', async () => {
    const pair = await service.login({ userName: 'analyst', password: PASSWORD })

    const { jti } = await signer.verify(pair.refreshToken, 'refresh')
    const row = await refreshTokens.find(jti!)
    expect(row).toMatchObject({ userId: 2, revokedAt: null })
    expect(row!.expiresAt.getTime()).toBe(clock.now().getTime() + REFRESH_TTL_SECONDS * 1000)
  })

  it('audits auth.login.success with the user id', async () => {
    await service.login({ userName: 'analyst', password: PASSWORD, ip: '10.0.0.1' })

    expect(audit.entries).toHaveLength(1)
    expect(audit.entries[0]).toMatchObject({
      userId: 2,
      action: 'auth.login.success',
      entityType: 'User',
      entityId: '2',
      detail: { userName: 'analyst' },
    })
  })

  it.each([
    { title: 'wrong password', userName: 'viewer', password: 'not-the-password', reason: 'bad_password', userId: 3 },
    { title: 'inactive user', userName: 'inactive_user', password: PASSWORD, reason: 'inactive', userId: 4 },
    { title: 'unknown user', userName: 'ghost', password: 'S3cret!', reason: 'unknown_user', userId: null },
  ])(
    'rejects $title with InvalidCredentialsError and audits the reason',
    async ({ userName, password, reason, userId }) => {
      const error = await loginFailure(userName, password)

      expect(error.reason).toBe(reason)
      expect(audit.entries).toHaveLength(1)
      expect(audit.entries[0]).toMatchObject({
        userId,
        action: 'auth.login.failure',
        entityType: 'User',
        entityId: userId === null ? userName : String(userId),
        detail: { userName, reason },
      })
      expect(refreshTokens.rows.size).toBe(0)
    },
  )

  it('uses the same public message for every credential failure', async () => {
    const messages = [
      (await loginFailure('viewer', 'not-the-password')).message,
      (await loginFailure('inactive_user', PASSWORD)).message,
      (await loginFailure('ghost', 'S3cret!')).message,
    ]

    expect(new Set(messages).size).toBe(1)
    expect(messages[0]).toBe('Invalid user name or password')
  })

  it('still runs the password hasher for an unknown user (against the dummy hash)', async () => {
    await loginFailure('ghost', 'S3cret!')

    expect(hasher.calls).toEqual([{ password: 'S3cret!', hash: null }])
  })

  it('still runs the password hasher for an inactive user', async () => {
    await loginFailure('inactive_user', PASSWORD)

    expect(hasher.calls).toHaveLength(1)
    expect(hasher.calls[0]!.hash).toBe(FakePasswordHasher.hash(PASSWORD))
  })

  it('never writes the password or the hash into the audit log', async () => {
    await service.login({ userName: 'analyst', password: PASSWORD })
    await loginFailure('viewer', 'not-the-password')
    await loginFailure('inactive_user', PASSWORD)
    await loginFailure('ghost', 'S3cret!')

    const dump = JSON.stringify(audit.entries)
    expect(audit.entries).toHaveLength(4)
    expect(dump).not.toContain(PASSWORD)
    expect(dump).not.toContain('not-the-password')
    expect(dump).not.toContain('S3cret!')
    expect(dump).not.toContain(FakePasswordHasher.hash(PASSWORD))
  })

  it('returns the token pair even if the audit logger fails, and logs the failure', async () => {
    audit.failWith = new Error('audit table unavailable')

    const pair = await service.login({ userName: 'analyst', password: PASSWORD })

    expect(pair.expiresIn).toBe(ACCESS_TTL_SECONDS)
    expect(log.error).toHaveBeenCalledTimes(1)
  })

  it('still rejects with InvalidCredentialsError if the audit logger fails', async () => {
    audit.failWith = new Error('audit table unavailable')

    const error = await loginFailure('viewer', 'not-the-password')

    expect(error.reason).toBe('bad_password')
  })
})

describe('AuthService.refresh', () => {
  async function loginAnalyst() {
    return service.login({ userName: 'analyst', password: PASSWORD })
  }

  async function expectInvalidToken(refreshToken: string) {
    await expect(service.refresh(refreshToken)).rejects.toBeInstanceOf(InvalidTokenError)
  }

  it('rotates a valid refresh token: returns a new pair, revokes the used jti and stores the new one', async () => {
    const first = await loginAnalyst()
    const oldJti = (await signer.verify(first.refreshToken, 'refresh')).jti!

    const second = await service.refresh(first.refreshToken)

    expect(second.accessToken).not.toBe(first.accessToken)
    expect(second.refreshToken).not.toBe(first.refreshToken)
    expect(second.expiresIn).toBe(ACCESS_TTL_SECONDS)
    expect((await refreshTokens.find(oldJti))!.revokedAt).toEqual(clock.now())
    const newJti = (await signer.verify(second.refreshToken, 'refresh')).jti!
    expect(await refreshTokens.find(newJti)).toMatchObject({ userId: 2, revokedAt: null })
    expect(refreshTokens.activeFor(2).map((r) => r.tokenId)).toEqual([newJti])
  })

  it('rejects a refresh token that was already rotated', async () => {
    const first = await loginAnalyst()
    await service.refresh(first.refreshToken)

    await expectInvalidToken(first.refreshToken)
  })

  it('rejects a revoked refresh token', async () => {
    const first = await loginAnalyst()
    await service.logout(first.refreshToken)

    await expectInvalidToken(first.refreshToken)
  })

  it('rejects an expired refresh token', async () => {
    const first = await loginAnalyst()
    clock.advanceSeconds(REFRESH_TTL_SECONDS + 1)

    await expectInvalidToken(first.refreshToken)
  })

  it('rejects a refresh token whose jti is not stored', async () => {
    const orphan = await signer.signRefresh(2)

    await expectInvalidToken(orphan.token)
  })

  it('rejects a refresh token of a user deactivated after login', async () => {
    const first = await loginAnalyst()
    users.setActive('analyst', false)

    await expectInvalidToken(first.refreshToken)
  })

  it('rejects an access token used as a refresh token', async () => {
    const first = await loginAnalyst()

    await expectInvalidToken(first.accessToken)
  })

  it('rejects a malformed token', async () => {
    await expectInvalidToken('not-a-token')
  })
})

describe('AuthService.logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const pair = await service.login({ userName: 'analyst', password: PASSWORD })

    await service.logout(pair.refreshToken)

    expect(refreshTokens.activeFor(2)).toHaveLength(0)
    await expect(service.refresh(pair.refreshToken)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('is idempotent with an already revoked token', async () => {
    const pair = await service.login({ userName: 'analyst', password: PASSWORD })
    await service.logout(pair.refreshToken)

    await expect(service.logout(pair.refreshToken)).resolves.toBeUndefined()
  })

  it('does not fail with an expired token', async () => {
    const pair = await service.login({ userName: 'analyst', password: PASSWORD })
    clock.advanceSeconds(REFRESH_TTL_SECONDS + 1)

    await expect(service.logout(pair.refreshToken)).resolves.toBeUndefined()
  })

  it('does not fail with garbage', async () => {
    await expect(service.logout('garbage')).resolves.toBeUndefined()
  })
})

describe('AuthService.me', () => {
  it('returns the identity, role and permission codes of the user', async () => {
    const me = await service.me(2)

    expect(me).toMatchObject({
      userId: 2,
      userName: 'analyst',
      displayName: 'analyst',
      email: 'analyst@recon.local',
      role: 'analyst',
      merchantScope: 'assigned',
    })
    expect([...me.permissions].sort()).toEqual(['fee.view', 'reports.view', 'settlement.process'])
  })

  it('with scope "assigned" returns only the assigned merchants', async () => {
    const me = await service.me(3)

    expect(me.merchantScope).toBe('assigned')
    expect(me.merchants).toEqual([{ merchantId: 1, name: 'Merchant A' }])
  })

  it('with scope "assigned" and no assignments returns an empty list, never every merchant', async () => {
    const me = await service.me(5)

    expect(me.merchantScope).toBe('assigned')
    expect(me.merchants).toEqual([])
  })

  it('with scope "all" returns every merchant', async () => {
    const me = await service.me(1)

    expect(me.merchantScope).toBe('all')
    expect(me.merchants).toEqual(MERCHANTS)
    expect(me.permissions).toHaveLength(7)
  })
})
