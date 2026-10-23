// Ports of the auth application layer. Adapters live in ../infrastructure; in-memory doubles in ./__fakes__.
import type { MerchantRef, MerchantScope, PermissionCode } from '@recon/shared'
import type { AuditEntry as SharedAuditEntry, AuditLogger as SharedAuditLogger } from '../../../shared/audit.js'

export type { MerchantRef }

export interface UserRecord {
  userId: number
  userName: string
  displayName: string
  email: string
  passwordHash: string
  isActive: boolean
  role: string
  permissions: PermissionCode[]
  merchantScope: MerchantScope
  /** UserMerchant rows; ignored when merchantScope is "all". */
  assignedMerchantIds: number[]
}

export interface UserRepository {
  findByUserName(userName: string): Promise<UserRecord | null>
  findById(userId: number): Promise<UserRecord | null>
  /** Every merchant, ordered by merchantId. */
  listMerchants(): Promise<MerchantRef[]>
}

export interface RefreshTokenRecord {
  tokenId: string
  userId: number
  expiresAt: Date
  revokedAt: Date | null
}

export interface NewRefreshToken {
  tokenId: string
  userId: number
  expiresAt: Date
}

export interface RefreshTokenStore {
  save(record: NewRefreshToken): Promise<void>
  find(tokenId: string): Promise<RefreshTokenRecord | null>
  /** Marks the token revoked. Returns true only if an active (not yet revoked) row was revoked. */
  revoke(tokenId: string, at: Date): Promise<boolean>
  /**
   * Atomically revokes `oldTokenId` and stores `next`. Returns false, storing nothing, when the old
   * token was already revoked (e.g. a concurrent refresh won the race).
   */
  rotate(oldTokenId: string, at: Date, next: NewRefreshToken): Promise<boolean>
}

export type AuditAction = 'auth.login.success' | 'auth.login.failure'

/** The shared audit entry (shared/audit.ts) narrowed to what auth records. */
export interface AuditEntry extends SharedAuditEntry {
  action: AuditAction
  entityType: 'User'
}

export type AuditLogger = SharedAuditLogger

export interface PasswordHasher {
  /** `hash = null` verifies against a precomputed dummy hash (same cost) and always returns false. */
  verify(password: string, hash: string | null): Promise<boolean>
}

export type TokenType = 'access' | 'refresh'

export interface SignedRefreshToken {
  token: string
  jti: string
  expiresAt: Date
}

export interface VerifiedToken {
  sub: number
  jti?: string
}

export interface TokenSigner {
  signAccess(userId: number): Promise<string>
  signRefresh(userId: number): Promise<SignedRefreshToken>
  /** Throws on a bad signature, a malformed token, the wrong `typ` or (unless ignored) an expired token. */
  verify(token: string, typ: TokenType, options?: { ignoreExpiration?: boolean }): Promise<VerifiedToken>
}

export interface Clock {
  now(): Date
}

export interface ErrorLog {
  error(obj: unknown, msg?: string): void
}
