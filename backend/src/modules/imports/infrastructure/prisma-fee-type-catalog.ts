// Prisma adapter of FeeTypeCatalog (design D10): the fee types the batch fees sheet is resolved against.
import type { PrismaClient } from '../../../generated/prisma/client.js'
import type { FeeTypeCatalog } from '../application/ports.js'
import type { FeeTypeRef } from '../domain/batch-fees.js'

export class PrismaFeeTypeCatalog implements FeeTypeCatalog {
  constructor(private readonly prisma: PrismaClient) {}

  async listAll(): Promise<FeeTypeRef[]> {
    return this.prisma.feeType.findMany({
      select: { feeTypeId: true, code: true, title: true },
      orderBy: { feeTypeId: 'asc' },
    })
  }
}
