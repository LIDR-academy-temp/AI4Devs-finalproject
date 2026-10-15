/**
 * In-memory doubles for the auth application ports.
 *
 * They pin down the port contract the service is written against
 * (../ports.ts):
 * - UserRepository: findByUserName, findById, listMerchants
 * - RefreshTokenStore: save, find, revoke (true only when an active row was revoked)
 * - AuditLogger: record
 * - PasswordHasher: verify(password, hash | null); null means "compare against the dummy hash"
 * - TokenSigner: signAccess, signRefresh, verify(token, typ, { ignoreExpiration? }) throwing on any invalid token
 * - Clock: now
 */
import { randomUUID } from 'node:crypto'
import type {
  AuditEntry,
  AuditLogger,
  Clock,
  MerchantRef,
  PasswordHasher,
  RefreshTokenRecord,
  RefreshTokenStore,
  TokenSigner,
  TokenType,
  UserRecord,
  UserRepository,
} from '../ports.js'

export const ACCESS_TTL_SECONDS = 900
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60

export class FakeClock implements Clock {
  constructor(private current = new Date('2026-10-14T08:00:00.000Z')) {}

  now(): Date {
    return new Date(this.current)
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000)
  }
}

export class InMemoryUserRepository implements UserRepository {
  constructor(
    public users: UserRecord[],
    public merchants: MerchantRef[],
  ) {}

  async findByUserName(userName: string): Promise<UserRecord | null> {
    return structuredClone(this.users.find((u) => u.userName === userName) ?? null)
  }

  async findById(userId: number): Promise<UserRecord | null> {
    return structuredClone(this.users.find((u) => u.userId === userId) ?? null)
  }

  async listMerchants(): Promise<MerchantRef[]> {
    return structuredClone(this.merchants)
  }

  setActive(userName: string, isActive: boolean): void {
    const user = this.users.find((u) => u.userName === userName)
    if (!user) throw new Error(`unknown user ${userName}`)
    user.isActive = isActive
  }
}

export class InMemoryRefreshTokenStore implements RefreshTokenStore {
  rows = new Map<string, RefreshTokenRecord>()

  async save(record: { tokenId: string; userId: number; expiresAt: Date }): Promise<void> {
    this.rows.set(record.tokenId, { ...record, revokedAt: null })
  }

  async find(tokenId: string): Promise<RefreshTokenRecord | null> {
    const row = this.rows.get(tokenId)
    return row ? { ...row } : null
  }

  async revoke(tokenId: string, at: Date): Promise<boolean> {
    const row = this.rows.get(tokenId)
    if (!row || row.revokedAt) return false
    row.revokedAt = at
    return true
  }

  activeFor(userId: number): RefreshTokenRecord[] {
    return [...this.rows.values()].filter((r) => r.userId === userId && r.revokedAt === null)
  }
}

export class InMemoryAuditLogger implements AuditLogger {
  entries: AuditEntry[] = []
  failWith: Error | null = null

  async record(entry: AuditEntry): Promise<void> {
    if (this.failWith) throw this.failWith
    this.entries.push(structuredClone(entry))
  }
}

/** Hashes are "hash:<password>"; the dummy hash never matches. */
export class FakePasswordHasher implements PasswordHasher {
  calls: Array<{ password: string; hash: string | null }> = []

  static hash(password: string): string {
    return `hash:${password}`
  }

  async verify(password: string, hash: string | null): Promise<boolean> {
    this.calls.push({ password, hash })
    return hash !== null && hash === FakePasswordHasher.hash(password)
  }
}

interface FakeClaims {
  sub: number
  typ: TokenType
  jti: string
  exp: number
}

/** Tokens are base64url JSON; verification enforces typ and exp against the shared clock. */
export class FakeTokenSigner implements TokenSigner {
  constructor(private clock: Clock) {}

  async signAccess(userId: number): Promise<string> {
    return this.encode({ sub: userId, typ: 'access', jti: randomUUID(), exp: this.expiry(ACCESS_TTL_SECONDS) })
  }

  async signRefresh(userId: number): Promise<{ token: string; jti: string; expiresAt: Date }> {
    const claims: FakeClaims = { sub: userId, typ: 'refresh', jti: randomUUID(), exp: this.expiry(REFRESH_TTL_SECONDS) }
    return { token: this.encode(claims), jti: claims.jti, expiresAt: new Date(claims.exp) }
  }

  async verify(
    token: string,
    typ: TokenType,
    options: { ignoreExpiration?: boolean } = {},
  ): Promise<{ sub: number; jti?: string }> {
    let claims: FakeClaims
    try {
      claims = JSON.parse(Buffer.from(token.replace(/^fake\./, ''), 'base64url').toString('utf8'))
    } catch {
      throw new Error('malformed token')
    }
    if (!token.startsWith('fake.') || typeof claims?.sub !== 'number') throw new Error('malformed token')
    if (claims.typ !== typ) throw new Error('unexpected token type')
    if (!options.ignoreExpiration && this.clock.now().getTime() >= claims.exp) throw new Error('token expired')
    return { sub: claims.sub, jti: claims.typ === 'refresh' ? claims.jti : undefined }
  }

  private expiry(ttlSeconds: number): number {
    return this.clock.now().getTime() + ttlSeconds * 1000
  }

  private encode(claims: FakeClaims): string {
    return `fake.${Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url')}`
  }
}

export const MERCHANTS: MerchantRef[] = [
  { merchantId: 1, name: 'Merchant A' },
  { merchantId: 2, name: 'Merchant B' },
  { merchantId: 3, name: 'Merchant C' },
]

export const PASSWORD = 'Correct-Horse-1'

function user(overrides: Partial<UserRecord> & Pick<UserRecord, 'userId' | 'userName'>): UserRecord {
  return {
    displayName: overrides.userName,
    email: `${overrides.userName}@recon.local`,
    passwordHash: FakePasswordHasher.hash(PASSWORD),
    isActive: true,
    role: 'viewer',
    permissions: ['fee.view', 'reports.view'],
    merchantScope: 'assigned',
    assignedMerchantIds: [],
    ...overrides,
  }
}

export function seedUsers(): UserRecord[] {
  return [
    user({
      userId: 1,
      userName: 'admin',
      role: 'admin',
      permissions: [
        'settlement.process',
        'payment.process',
        'account.manage',
        'fee.manage',
        'fee.view',
        'reports.view',
        'user.manage',
      ],
      merchantScope: 'all',
    }),
    user({
      userId: 2,
      userName: 'analyst',
      role: 'analyst',
      permissions: ['settlement.process', 'fee.view', 'reports.view'],
      assignedMerchantIds: [1, 2],
    }),
    user({ userId: 3, userName: 'viewer', assignedMerchantIds: [1] }),
    user({ userId: 4, userName: 'inactive_user', isActive: false, assignedMerchantIds: [1] }),
    user({ userId: 5, userName: 'unassigned', assignedMerchantIds: [] }),
  ]
}
