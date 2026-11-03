// Reads of the fee administration (admin-fees design D8, D10): the global view, paginated in the database in the
// order of the screen, and the history of a fee or of its type, in API form.
import type { FeeHistoryEntry, FeeHistoryQuery, FeesQuery } from '@recon/shared'
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import type { Scope } from '../../catalog/domain/scope.js'
import type { FeeQueryRepository, StoredFeeListItem } from '../application/ports.js'
import { readSnapshot } from '../domain/fee-snapshot.js'
import { usageFor, usageOf } from './fee-usage.js'
import { feeSelect, toStoredFee } from './prisma-fee-repository.js'

const listSelect = {
  ...feeSelect,
  account: {
    select: {
      accountId: true,
      name: true,
      provider: { select: { providerId: true, name: true, merchant: { select: { merchantId: true, name: true } } } },
    },
  },
} satisfies Prisma.FeeSelect

/** Order of the view: merchant › provider › account › type title › startDate (NULL first in SQL Server) › feeId. */
const listOrder: Prisma.FeeOrderByWithRelationInput[] = [
  { account: { provider: { merchant: { name: 'asc' } } } },
  { account: { provider: { name: 'asc' } } },
  { account: { name: 'asc' } },
  { feeType: { title: 'asc' } },
  { startDate: 'asc' },
  { feeId: 'asc' },
]

const dateOf = (day: string) => new Date(`${day}T00:00:00.000Z`)

/** The status predicates of design D7 on DATE columns; `today` is the New York day. */
function statusWhere(status: FeesQuery['status'], today: string): Prisma.FeeWhereInput {
  const day = dateOf(today)
  switch (status) {
    case 'scheduled':
      return { startDate: { gt: day } }
    case 'closed':
      return { endDate: { lt: day } }
    case 'active':
      return {
        AND: [
          { OR: [{ startDate: null }, { startDate: { lte: day } }] },
          { OR: [{ endDate: null }, { endDate: { gte: day } }] },
        ],
      }
    default:
      return {}
  }
}

function kindWhere(kind: FeesQuery['kind']): Prisma.FeeWhereInput {
  switch (kind) {
    case 'transactional':
      return { feeType: { isTransactional: true } }
    case 'preset':
      return { feeType: { isTransactional: false, allowsFreeAmount: false } }
    case 'free_amount':
      return { feeType: { isTransactional: false, allowsFreeAmount: true } }
    default:
      return {}
  }
}

export class PrismaFeeQueryRepository implements FeeQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async missingFilter(
    scope: Scope,
    filter: Pick<FeesQuery, 'merchantId' | 'providerId' | 'accountId'>,
  ): Promise<'Merchant' | 'Provider' | 'Account' | null> {
    const merchantIds = [...scope.merchantIds]
    if (
      filter.merchantId !== undefined &&
      (!merchantIds.includes(filter.merchantId) ||
        (await this.prisma.merchant.count({ where: { merchantId: filter.merchantId } })) === 0)
    )
      return 'Merchant'
    if (
      filter.providerId !== undefined &&
      (await this.prisma.provider.count({
        where: { providerId: filter.providerId, merchantId: { in: merchantIds } },
      })) === 0
    )
      return 'Provider'
    if (
      filter.accountId !== undefined &&
      (await this.prisma.account.count({
        where: { accountId: filter.accountId, provider: { merchantId: { in: merchantIds } } },
      })) === 0
    )
      return 'Account'
    return null
  }

  async list(scope: Scope, query: FeesQuery, today: string): Promise<{ items: StoredFeeListItem[]; total: number }> {
    const where: Prisma.FeeWhereInput = {
      AND: [
        { account: { provider: { merchantId: { in: [...scope.merchantIds] } } } },
        query.merchantId === undefined ? {} : { account: { provider: { merchantId: query.merchantId } } },
        query.providerId === undefined ? {} : { account: { providerId: query.providerId } },
        query.accountId === undefined ? {} : { accountId: query.accountId },
        kindWhere(query.kind),
        statusWhere(query.status, today),
        query.q === undefined
          ? {}
          : {
              OR: [
                { account: { name: { contains: query.q } } },
                { feeType: { code: { contains: query.q } } },
                { feeType: { title: { contains: query.q } } },
                { description: { contains: query.q } },
              ],
            },
      ],
    }
    const [rows, total] = await Promise.all([
      this.prisma.fee.findMany({
        where,
        select: listSelect,
        orderBy: listOrder,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.fee.count({ where }),
    ])
    // Usage only for the fees of the page (design D5).
    const usage = await usageOf(
      this.prisma,
      rows.map((r) => r.feeId),
    )
    const items = rows.map((row) => {
      const { provider } = row.account
      return {
        ...toStoredFee(row, usageFor(usage, row.feeId)),
        merchant: { id: provider.merchant.merchantId, name: provider.merchant.name },
        provider: { id: provider.providerId, name: provider.name },
        account: { id: row.account.accountId, name: row.account.name },
      }
    })
    return { items, total }
  }

  async history(scope: Scope, feeId: string, of: FeeHistoryQuery['scope']): Promise<FeeHistoryEntry[] | null> {
    const fee = await this.prisma.fee.findFirst({
      where: { feeId, account: { provider: { merchantId: { in: [...scope.merchantIds] } } } },
      select: { feeId: true, accountId: true, feeTypeId: true },
    })
    if (fee === null) return null
    const rows = await this.prisma.feeHistory.findMany({
      where: of === 'type' ? { fee: { accountId: fee.accountId, feeTypeId: fee.feeTypeId } } : { feeId: fee.feeId },
      select: {
        feeHistoryId: true,
        feeId: true,
        action: true,
        changedAt: true,
        reason: true,
        beforeJson: true,
        afterJson: true,
        changedBy: { select: { userId: true, userName: true } },
      },
      orderBy: [{ changedAt: 'desc' }, { feeHistoryId: 'desc' }],
    })
    return rows.map((row) => ({
      feeHistoryId: row.feeHistoryId,
      feeId: row.feeId,
      action: row.action as FeeHistoryEntry['action'],
      changedAt: row.changedAt.toISOString(),
      changedBy: row.changedBy,
      reason: row.reason,
      before: row.beforeJson === null ? null : readSnapshot(row.beforeJson),
      after: readSnapshot(row.afterJson),
    }))
  }
}
