import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { NewRefreshToken, RefreshTokenRecord, RefreshTokenStore } from '../application/ports.js'

/** RefreshToken rows keyed by jti (design D5). Only the id is stored, never the token. */
export class PrismaRefreshTokenStore implements RefreshTokenStore {
  constructor(private readonly prisma: PrismaClient) {}

  async save(record: NewRefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({ data: record })
  }

  async find(tokenId: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { tokenId },
      select: { tokenId: true, userId: true, expiresAt: true, revokedAt: true },
    })
  }

  async revoke(tokenId: string, at: Date): Promise<boolean> {
    // UPDATE … WHERE revokedAt IS NULL: only the first concurrent caller affects a row.
    const { count } = await this.prisma.refreshToken.updateMany({
      where: { tokenId, revokedAt: null },
      data: { revokedAt: at },
    })
    return count === 1
  }

  async rotate(oldTokenId: string, at: Date, next: NewRefreshToken): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.refreshToken.updateMany({
        where: { tokenId: oldTokenId, revokedAt: null },
        data: { revokedAt: at },
      })
      if (count !== 1) return false
      await tx.refreshToken.create({ data: next })
      return true
    })
  }
}
