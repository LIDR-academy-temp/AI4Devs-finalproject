// Prisma adapter of TransactionLookup (design D4): one `gatewayId IN (…) AND sourceTransactionId IN (…)` per batch.
// The IN × IN may return crossed pairs; the domain keeps the exact ones.
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { TransactionLookup } from '../application/ports.js'
import type { TransactionRef } from '../domain/match-rows.js'
import type { IdCandidate } from '../domain/normalize-source-id.js'
import { toTransactionRef, transactionRefSelect } from './transaction-ref.js'

export class PrismaTransactionLookup implements TransactionLookup {
  constructor(private readonly prisma: PrismaClient) {}

  async findByExternalIds(pairs: IdCandidate[]): Promise<TransactionRef[]> {
    if (pairs.length === 0) return []
    const rows = await this.prisma.transaction.findMany({
      where: {
        gatewayId: { in: [...new Set(pairs.map((p) => p.gatewayId))] },
        sourceTransactionId: { in: [...new Set(pairs.map((p) => p.sourceTransactionId))] },
      },
      select: transactionRefSelect,
    })
    return rows.map(toTransactionRef)
  }
}
