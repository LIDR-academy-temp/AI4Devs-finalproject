import { randomUUID } from 'node:crypto'
import type { JWT } from '@fastify/jwt'
import type { Clock, SignedRefreshToken, TokenSigner, TokenType, VerifiedToken } from '../application/ports.js'

export const ACCESS_TTL_SECONDS = 15 * 60
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60

interface Claims {
  sub: string
  typ: TokenType
  jti?: string
  iat: number
  exp: number
}

/**
 * HS256 tokens through @fastify/jwt (design D4). Claims are only `sub`, `typ` and `jti`: role and
 * permissions are resolved from the database on every request.
 */
export class JwtTokenSigner implements TokenSigner {
  constructor(
    private readonly jwt: JWT,
    private readonly clock: Clock,
  ) {}

  async signAccess(userId: number): Promise<string> {
    // The jti only makes each access token unique (two issued in the same second would otherwise be equal);
    // it is not stored or checked.
    return this.sign({ sub: String(userId), typ: 'access', jti: randomUUID() }, ACCESS_TTL_SECONDS)
  }

  async signRefresh(userId: number): Promise<SignedRefreshToken> {
    const jti = randomUUID()
    const token = this.sign({ sub: String(userId), typ: 'refresh', jti }, REFRESH_TTL_SECONDS)
    const issuedAtSeconds = Math.floor(this.clock.now().getTime() / 1000)
    return { token, jti, expiresAt: new Date((issuedAtSeconds + REFRESH_TTL_SECONDS) * 1000) }
  }

  async verify(token: string, typ: TokenType, options: { ignoreExpiration?: boolean } = {}): Promise<VerifiedToken> {
    const claims = this.jwt.verify<Claims>(token, {
      algorithms: ['HS256'],
      clockTimestamp: this.clock.now().getTime(),
      ignoreExpiration: options.ignoreExpiration ?? false,
    })
    if (claims.typ !== typ) throw new Error(`expected a ${typ} token`)
    const sub = Number(claims.sub)
    // Any non-negative integer: whether the user exists is decided by the repository, not here.
    if (!Number.isSafeInteger(sub) || sub < 0) throw new Error('invalid subject')
    if (typ === 'refresh') {
      if (typeof claims.jti !== 'string') throw new Error('refresh token without jti')
      return { sub, jti: claims.jti }
    }
    return { sub }
  }

  private sign(payload: Omit<Claims, 'iat' | 'exp'>, ttlSeconds: number): string {
    return this.jwt.sign(payload, {
      algorithm: 'HS256',
      // @fastify/jwt takes a numeric expiresIn in seconds
      expiresIn: ttlSeconds,
      clockTimestamp: this.clock.now().getTime(),
    })
  }
}
