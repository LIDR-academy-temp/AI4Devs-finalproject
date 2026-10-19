import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney, toPercentage } from '../../../infrastructure/decimal.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeReadRepository, StoredFee, StoredFeeType } from '../application/ports.js'
import { businessDay } from '../domain/fee-selection.js'

const feeSelect = {
  feeId: true,
  feeTypeId: true,
  fixedAmount: true,
  percentage: true,
  startDate: true,
  endDate: true,
  description: true,
  feeType: { select: { code: true, title: true, isTransactional: true } },
} satisfies Prisma.FeeSelect

type FeeRow = Prisma.FeeGetPayload<{ select: typeof feeSelect }>

/** A DATE column comes back as midnight UTC: its day is the ISO date part. */
const day = (value: Date | null) => (value === null ? null : businessDay(value))

export function toStoredFee(row: FeeRow): StoredFee {
  return {
    feeId: row.feeId,
    feeTypeId: row.feeTypeId,
    code: row.feeType.code,
    title: row.feeType.title,
    isTransactional: row.feeType.isTransactional,
    fixedAmount: toMoney(row.fixedAmount),
    percentage: toPercentage(row.percentage),
    startDate: day(row.startDate),
    endDate: day(row.endDate),
    description: row.description,
  }
}

export class PrismaFeeRepository implements FeeReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async accountFees(scope: Scope, accountId: string): Promise<StoredFee[] | null> {
    const account = await this.prisma.account.findFirst({
      where: { accountId, provider: { merchantId: { in: [...scope.merchantIds] } } },
      select: { fees: { select: feeSelect } },
    })
    return account === null ? null : account.fees.map(toStoredFee)
  }

  async feeTypesList(): Promise<StoredFeeType[]> {
    return this.prisma.feeType.findMany({
      where: { isActive: true },
      select: {
        feeTypeId: true,
        code: true,
        title: true,
        isTransactional: true,
        appliesToStatusId: true,
        allowsFreeAmount: true,
      },
      orderBy: { feeTypeId: 'asc' },
    })
  }
}
