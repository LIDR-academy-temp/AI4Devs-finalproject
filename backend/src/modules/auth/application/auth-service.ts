import type { MeResponse, TokenPair } from '@recon/shared'
import {
  InvalidCredentialsError,
  type InvalidCredentialsReason,
  InvalidTokenError,
  UnauthorizedError,
} from '../domain/errors.js'
import type { AuthContext } from '../domain/permissions.js'
import type {
  AuditEntry,
  AuditLogger,
  Clock,
  ErrorLog,
  PasswordHasher,
  RefreshTokenStore,
  TokenSigner,
  UserRecord,
  UserRepository,
} from './ports.js'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

export interface AuthServiceDeps {
  users: UserRepository
  refreshTokens: RefreshTokenStore
  audit: AuditLogger
  hasher: PasswordHasher
  signer: TokenSigner
  clock: Clock
  log: ErrorLog
}

export interface LoginInput {
  userName: string
  password: string
  ip?: string
}

export class AuthService {
  constructor(private readonly deps: AuthServiceDeps) {}

  /**
   * Verifies the credentials and issues a token pair. Every failure throws the same
   * InvalidCredentialsError; the reason only reaches the audit log (design D7).
   */
  async login({ userName, password, ip }: LoginInput): Promise<TokenPair> {
    const { users, hasher } = this.deps
    const user = await users.findByUserName(userName)
    // Always pay the Argon2 cost, also for unknown and inactive users, so timing does not tell them apart.
    const passwordOk = await hasher.verify(password, user?.passwordHash ?? null)

    const reason: InvalidCredentialsReason | null = !user
      ? 'unknown_user'
      : !user.isActive
        ? 'inactive'
        : !passwordOk
          ? 'bad_password'
          : null

    if (!user || reason) {
      await this.audit({
        userId: user?.userId ?? null,
        action: 'auth.login.failure',
        entityType: 'User',
        entityId: user ? String(user.userId) : userName,
        detail: { userName, reason, ...(ip ? { ip } : {}) },
      })
      throw new InvalidCredentialsError(reason ?? 'unknown_user')
    }

    const pair = await this.issuePair(user.userId)
    await this.audit({
      userId: user.userId,
      action: 'auth.login.success',
      entityType: 'User',
      entityId: String(user.userId),
      detail: { userName, ...(ip ? { ip } : {}) },
    })
    return pair
  }

  /** Rotates a refresh token: the one used is revoked and a new pair is issued. */
  async refresh(refreshToken: string): Promise<TokenPair> {
    const { signer, refreshTokens, users, clock } = this.deps
    const claims = await signer.verify(refreshToken, 'refresh').catch(() => {
      throw new InvalidTokenError()
    })
    if (!claims.jti) throw new InvalidTokenError()

    const now = clock.now()
    const stored = await refreshTokens.find(claims.jti)
    if (!stored || stored.revokedAt || stored.expiresAt <= now || stored.userId !== claims.sub) {
      throw new InvalidTokenError()
    }
    const user = await users.findById(stored.userId)
    if (!user?.isActive) throw new InvalidTokenError()

    const accessToken = await signer.signAccess(user.userId)
    const next = await signer.signRefresh(user.userId)
    const rotated = await refreshTokens.rotate(claims.jti, now, {
      tokenId: next.jti,
      userId: user.userId,
      expiresAt: next.expiresAt,
    })
    if (!rotated) throw new InvalidTokenError()

    return { accessToken, refreshToken: next.token, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  }

  /** Revokes a refresh token. Idempotent: never fails, whatever the token. */
  async logout(refreshToken: string): Promise<void> {
    const { signer, refreshTokens, clock, log } = this.deps
    let jti: string | undefined
    try {
      jti = (await signer.verify(refreshToken, 'refresh', { ignoreExpiration: true })).jti
    } catch {
      return
    }
    if (!jti) return
    try {
      await refreshTokens.revoke(jti, clock.now())
    } catch (err) {
      log.error({ err }, 'logout: could not revoke refresh token')
    }
  }

  /** Resolves the caller of an access token from the database (role and scope are never read from the token). */
  async authenticate(accessToken: string): Promise<AuthContext> {
    const { signer, users } = this.deps
    const claims = await signer.verify(accessToken, 'access').catch(() => {
      throw new UnauthorizedError()
    })
    const user = await users.findById(claims.sub)
    if (!user?.isActive) throw new UnauthorizedError()

    // Only scope "all" needs the merchant list; "assigned" already carries its UserMerchant rows.
    const merchantIds =
      user.merchantScope === 'all'
        ? (await users.listMerchants()).map((m) => m.merchantId)
        : [...user.assignedMerchantIds]
    return {
      userId: user.userId,
      userName: user.userName,
      role: user.role,
      permissions: new Set(user.permissions),
      merchantScope: user.merchantScope,
      merchantIds,
    }
  }

  async me(userId: number): Promise<MeResponse> {
    const user = await this.deps.users.findById(userId)
    if (!user?.isActive) throw new UnauthorizedError()

    return {
      userId: user.userId,
      userName: user.userName,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      permissions: [...user.permissions],
      merchantScope: user.merchantScope,
      merchants: await this.visibleMerchants(user),
    }
  }

  /** Scope "all" sees every merchant; "assigned" only its UserMerchant rows (none means none, never all). */
  private async visibleMerchants(user: UserRecord) {
    const merchants = await this.deps.users.listMerchants()
    if (user.merchantScope === 'all') return merchants
    const assigned = new Set(user.assignedMerchantIds)
    return merchants.filter((m) => assigned.has(m.merchantId))
  }

  private async issuePair(userId: number): Promise<TokenPair> {
    const { signer, refreshTokens } = this.deps
    const accessToken = await signer.signAccess(userId)
    const refresh = await signer.signRefresh(userId)
    await refreshTokens.save({ tokenId: refresh.jti, userId, expiresAt: refresh.expiresAt })
    return { accessToken, refreshToken: refresh.token, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  }

  /** A failing audit must not change the outcome of a login (design D6). */
  private async audit(entry: AuditEntry): Promise<void> {
    try {
      await this.deps.audit.record(entry)
    } catch (err) {
      this.deps.log.error({ err, action: entry.action }, 'audit log write failed')
    }
  }
}
