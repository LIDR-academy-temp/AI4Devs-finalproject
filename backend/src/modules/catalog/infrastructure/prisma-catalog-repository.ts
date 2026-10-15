import { ChargebackReservePolicy } from '@recon/shared'
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import { toMoney, toPercentage } from '../../../infrastructure/decimal.js'
import type {
  AccountChannelItem,
  AccountDetail,
  AccountSummary,
  CatalogRepository,
  ChannelAccountItem,
  ChannelFilter,
  ChannelSummary,
  MerchantSummary,
  ProviderSummary,
  ProviderWithMerchant,
} from '../application/ports.js'
import type { Scope } from '../domain/scope.js'

const merchantSelect = { merchantId: true, name: true, isActive: true } satisfies Prisma.MerchantSelect
const merchantRefSelect = { merchantId: true, name: true } satisfies Prisma.MerchantSelect
const providerSelect = {
  providerId: true,
  merchantId: true,
  name: true,
  isActive: true,
} satisfies Prisma.ProviderSelect
const channelSelect = {
  channelId: true,
  gatewayId: true,
  providerId: true,
  name: true,
  isActive: true,
  settlementTermDays: true,
  rollingReservePct: true,
  rollingReserveDays: true,
} satisfies Prisma.ChannelSelect
const accountSelect = {
  accountId: true,
  providerId: true,
  name: true,
  chargebackReservePolicy: true,
  rollingReserveCapAmt: true,
  matchingRuleSetId: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.AccountSelect
const assignmentSelect = {
  isPrimary: true,
  assignedAt: true,
  assignedInBatchId: true,
} satisfies Prisma.AccountChannelSelect

type ChannelRow = Prisma.ChannelGetPayload<{ select: typeof channelSelect }>
type AccountRow = Prisma.AccountGetPayload<{ select: typeof accountSelect }>

function toChannel(row: ChannelRow): ChannelSummary {
  return { ...row, rollingReservePct: toPercentage(row.rollingReservePct) }
}

function toAccount(row: AccountRow): AccountSummary {
  return {
    ...row,
    // The CHECK constraint guarantees the value; an unexpected one is a data error, not a 200.
    chargebackReservePolicy: ChargebackReservePolicy.parse(row.chargebackReservePolicy),
    rollingReserveCapAmt: toMoney(row.rollingReserveCapAmt),
    createdAt: row.createdAt.toISOString(),
  }
}

/** The scope as a filter on the owning merchant (design D2): an empty scope matches nothing. */
function visibleMerchant(scope: Scope): Prisma.IntFilter {
  return { in: [...scope.merchantIds] }
}

/** Read-only catalog queries. Every WHERE includes the scope, so an invisible row is simply absent. */
export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listMerchants(scope: Scope): Promise<MerchantSummary[]> {
    return this.prisma.merchant.findMany({
      where: { merchantId: visibleMerchant(scope) },
      select: merchantSelect,
      orderBy: { merchantId: 'asc' },
    })
  }

  async findMerchant(scope: Scope, merchantId: number): Promise<MerchantSummary | null> {
    return this.prisma.merchant.findFirst({
      where: { merchantId: { equals: merchantId, ...visibleMerchant(scope) } },
      select: merchantSelect,
    })
  }

  async listProviders(scope: Scope, merchantId: number): Promise<ProviderSummary[]> {
    return this.prisma.provider.findMany({
      where: { merchantId: { equals: merchantId, ...visibleMerchant(scope) } },
      select: providerSelect,
      orderBy: { providerId: 'asc' },
    })
  }

  async findProvider(scope: Scope, providerId: number): Promise<ProviderWithMerchant | null> {
    return this.prisma.provider.findFirst({
      where: { providerId, merchantId: visibleMerchant(scope) },
      select: { ...providerSelect, merchant: { select: merchantRefSelect } },
    })
  }

  async listProviderChannels(scope: Scope, providerId: number): Promise<ChannelSummary[]> {
    const rows = await this.prisma.channel.findMany({
      where: { providerId, provider: { merchantId: visibleMerchant(scope) } },
      select: channelSelect,
      orderBy: { channelId: 'asc' },
    })
    return rows.map(toChannel)
  }

  async listProviderAccounts(scope: Scope, providerId: number): Promise<AccountSummary[]> {
    const rows = await this.prisma.account.findMany({
      where: { providerId, provider: { merchantId: visibleMerchant(scope) } },
      select: accountSelect,
      orderBy: { name: 'asc' },
    })
    return rows.map(toAccount)
  }

  async findAccount(scope: Scope, accountId: string): Promise<AccountDetail | null> {
    const row = await this.prisma.account.findFirst({
      where: { accountId, provider: { merchantId: visibleMerchant(scope) } },
      select: {
        ...accountSelect,
        provider: { select: { ...providerSelect, merchant: { select: merchantRefSelect } } },
      },
    })
    if (!row) return null
    const { provider, ...account } = row
    const { merchant, ...providerSummary } = provider
    return { ...toAccount(account), provider: providerSummary, merchant }
  }

  async listAccountChannels(scope: Scope, accountId: string): Promise<AccountChannelItem[]> {
    const rows = await this.prisma.accountChannel.findMany({
      where: { accountId, account: { provider: { merchantId: visibleMerchant(scope) } } },
      select: {
        ...assignmentSelect,
        channel: {
          select: {
            ...channelSelect,
            // The channel's current primary account, whichever account it belongs to.
            accountChannels: {
              where: { isPrimary: true },
              select: { account: { select: { accountId: true, name: true } } },
            },
          },
        },
      },
      orderBy: [{ assignedAt: 'asc' }, { channelId: 'asc' }],
    })
    return rows.map(({ channel, ...assignment }) => {
      const { accountChannels, ...channelRow } = channel
      return {
        ...toChannel(channelRow),
        isPrimary: assignment.isPrimary,
        assignedAt: assignment.assignedAt.toISOString(),
        assignedInBatchId: assignment.assignedInBatchId,
        primaryAccount: accountChannels[0]?.account ?? null,
      }
    })
  }

  async listChannels(scope: Scope, filter: ChannelFilter): Promise<ChannelSummary[]> {
    const rows = await this.prisma.channel.findMany({
      where: {
        provider: { merchantId: visibleMerchant(scope) },
        // "Not assigned yet" (README §3.2): transactions exist and no AccountChannel row does.
        ...(filter.unassigned ? { accountChannels: { none: {} }, transactions: { some: {} } } : {}),
      },
      select: channelSelect,
      orderBy: { channelId: 'asc' },
    })
    return rows.map(toChannel)
  }

  async findChannel(scope: Scope, channelId: number): Promise<ChannelSummary | null> {
    const row = await this.prisma.channel.findFirst({
      where: { channelId, provider: { merchantId: visibleMerchant(scope) } },
      select: channelSelect,
    })
    return row ? toChannel(row) : null
  }

  async listChannelAccounts(scope: Scope, channelId: number): Promise<ChannelAccountItem[]> {
    const rows = await this.prisma.accountChannel.findMany({
      where: { channelId, channel: { provider: { merchantId: visibleMerchant(scope) } } },
      select: {
        ...assignmentSelect,
        account: { select: { accountId: true, name: true, providerId: true, isActive: true } },
      },
      orderBy: [{ assignedAt: 'asc' }, { account: { name: 'asc' } }],
    })
    return rows.map(({ account, ...assignment }) => ({
      ...account,
      isPrimary: assignment.isPrimary,
      assignedAt: assignment.assignedAt.toISOString(),
      assignedInBatchId: assignment.assignedInBatchId,
    }))
  }
}
