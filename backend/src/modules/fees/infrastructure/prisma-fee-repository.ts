import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney, toPercentage } from '../../../infrastructure/decimal.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeReadRepository, StoredFee, StoredFeeType } from '../application/ports.js'
import { businessDay } from '../domain/fee-selection.js'
import { type FeeUsage, usageFor, usageOf } from './fee-usage.js'

export const feeSelect = {
  feeId: true,
  feeTypeId: true,
  fixedAmount: true,
  percentage: true,
  conditionalPercentage: true,
  conditionThresholdAmt: true,
  brandFixedAmount: true,
  brandPercentage: true,
  startDate: true,
  endDate: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  feeType: { select: { code: true, title: true, isTransactional: true } },
  createdBy: { select: { userId: true, userName: true } },
} satisfies Prisma.FeeSelect

export type FeeRow = Prisma.FeeGetPayload<{ select: typeof feeSelect }>

/** A DATE column comes back as midnight UTC: its day is the ISO date part. */
const day = (value: Date | null) => (value === null ? null : businessDay(value))

export function toStoredFee(row: FeeRow, usage: FeeUsage): StoredFee {
  return {
    feeId: row.feeId,
    feeTypeId: row.feeTypeId,
    code: row.feeType.code,
    title: row.feeType.title,
    isTransactional: row.feeType.isTransactional,
    fixedAmount: toMoney(row.fixedAmount),
    percentage: toPercentage(row.percentage),
    conditionalPercentage: toPercentage(row.conditionalPercentage),
    conditionThresholdAmt: toMoney(row.conditionThresholdAmt),
    brandFixedAmount: toMoney(row.brandFixedAmount),
    brandPercentage: toPercentage(row.brandPercentage),
    startDate: day(row.startDate),
    endDate: day(row.endDate),
    description: row.description,
    inUse: usage.inUse,
    lastAppliedEventDate: usage.lastAppliedEventDate,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export class PrismaFeeRepository implements FeeReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async accountFees(scope: Scope, accountId: string): Promise<StoredFee[] | null> {
    const account = await this.prisma.account.findFirst({
      where: { accountId, provider: { merchantId: { in: [...scope.merchantIds] } } },
      select: { fees: { select: feeSelect } },
    })
    if (account === null) return null
    const usage = await usageOf(
      this.prisma,
      account.fees.map((f) => f.feeId),
    )
    return account.fees.map((f) => toStoredFee(f, usageFor(usage, f.feeId)))
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
