/**
 * In-memory double of CatalogRepository (../ports.ts) over a fixture that mirrors the seed
 * (backend/prisma/synthetic.ts): 2 merchants, 3 providers, 9 channels, 5 accounts, 7 AccountChannel
 * rows, and transactions on every channel, so that RAM-07 (1007) and RAM-13 (1013) are the only
 * "not assigned yet" channels. Account ids are fixed test UUIDs (the seed draws them from a PRNG).
 */
import type { Scope } from '../../domain/scope.js'
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
} from '../ports.js'

export interface AccountChannelRow {
  accountId: string
  channelId: number
  isPrimary: boolean
  assignedAt: string
  assignedInBatchId: string | null
}

export interface CatalogFixture {
  merchants: MerchantSummary[]
  providers: ProviderSummary[]
  channels: ChannelSummary[]
  accounts: AccountSummary[]
  accountChannels: AccountChannelRow[]
  channelsWithTransactions: number[]
}

export const ACCOUNT_IDS = {
  'ProviderA-USD': 'a0000000-0000-4000-8000-000000000001',
  'ProviderA-EUR': 'a0000000-0000-4000-8000-000000000002',
  'ProviderB-Main': 'b0000000-0000-4000-8000-000000000001',
  'ProviderC-USD': 'c0000000-0000-4000-8000-000000000001',
  'ProviderC-Alt': 'c0000000-0000-4000-8000-000000000002',
} as const
export type AccountName = keyof typeof ACCOUNT_IDS

export const LEGACY_RULE_SET_ID = 1
export const LAST_BATCH_IDS: Partial<Record<AccountName, string>> = {
  'ProviderA-USD': 'd0000000-0000-4000-8000-000000000123',
}

function channel(
  channelId: number,
  gatewayId: number,
  providerId: number,
  name: string,
  settlementTermDays: number,
  rollingReservePct: string,
  rollingReserveDays: number,
): ChannelSummary {
  return {
    channelId,
    gatewayId,
    providerId,
    name,
    isActive: true,
    settlementTermDays,
    rollingReservePct,
    rollingReserveDays,
  }
}

function account(
  name: AccountName,
  providerId: number,
  policy: AccountSummary['chargebackReservePolicy'],
  cap: string | null,
  matchingRuleSetId: number | null,
  createdAt: string,
): AccountSummary {
  return {
    accountId: ACCOUNT_IDS[name],
    providerId,
    name,
    chargebackReservePolicy: policy,
    rollingReserveCapAmt: cap,
    matchingRuleSetId,
    isActive: true,
    createdAt,
  }
}

function assigned(name: AccountName, channelId: number, assignedAt: string): AccountChannelRow {
  return {
    accountId: ACCOUNT_IDS[name],
    channelId,
    isPrimary: true,
    assignedAt,
    assignedInBatchId: LAST_BATCH_IDS[name] ?? null,
  }
}

export function seedFixture(): CatalogFixture {
  return {
    merchants: [
      { merchantId: 1, name: 'Merchant A', isActive: true },
      { merchantId: 2, name: 'Merchant B', isActive: true },
    ],
    providers: [
      { providerId: 101, merchantId: 1, name: 'Provider A', isActive: true },
      { providerId: 102, merchantId: 1, name: 'Provider B', isActive: true },
      { providerId: 201, merchantId: 2, name: 'Provider C', isActive: true },
    ],
    channels: [
      channel(1001, 1, 101, 'RAM-01', 14, '0.100000', 180),
      channel(1002, 1, 101, 'RAM-02', 14, '0.100000', 180),
      channel(1003, 1, 101, 'RAM-03', 14, '0.100000', 180),
      channel(1007, 1, 101, 'RAM-07', 14, '0.100000', 180),
      channel(1011, 1, 102, 'RAM-11', 10, '0.100000', 180),
      channel(1012, 1, 102, 'RAM-12', 10, '0.100000', 180),
      channel(1013, 1, 102, 'RAM-13', 10, '0.050000', 120),
      channel(2001, 2, 201, 'RAM-U1', 7, '0.000000', 0),
      channel(2002, 2, 201, 'RAM-U2', 7, '0.050000', 180),
    ],
    accounts: [
      account('ProviderA-USD', 101, 'hold_until_term', null, null, '2026-03-01T00:00:00.000Z'),
      account('ProviderA-EUR', 101, 'hold_until_term', '50000.0000', null, '2026-06-01T00:00:00.000Z'),
      account('ProviderB-Main', 102, 'release_on_chargeback', null, null, '2026-03-01T00:00:00.000Z'),
      account('ProviderC-USD', 201, 'hold_until_term', null, null, '2026-08-01T00:00:00.000Z'),
      account('ProviderC-Alt', 201, 'hold_until_term', null, LEGACY_RULE_SET_ID, '2026-08-01T00:00:00.000Z'),
    ],
    accountChannels: [
      assigned('ProviderA-USD', 1001, '2026-10-12T00:00:00.000Z'),
      assigned('ProviderA-USD', 1002, '2026-10-12T00:00:00.000Z'),
      assigned('ProviderA-EUR', 1003, '2026-10-12T00:00:00.000Z'),
      assigned('ProviderB-Main', 1011, '2026-10-12T00:00:00.000Z'),
      assigned('ProviderB-Main', 1012, '2026-10-12T00:00:00.000Z'),
      assigned('ProviderC-USD', 2001, '2026-10-12T00:00:00.000Z'),
      assigned('ProviderC-Alt', 2002, '2026-10-12T00:00:00.000Z'),
    ],
    channelsWithTransactions: [1001, 1002, 1003, 1007, 1011, 1012, 1013, 2001, 2002],
  }
}

const byId = (a: { [k: string]: unknown }, b: { [k: string]: unknown }, key: string) =>
  (a[key] as number) - (b[key] as number)

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(public fixture: CatalogFixture = seedFixture()) {}

  /** Test helper: a channel's history in a second account (never a second primary). */
  addAccountChannel(row: AccountChannelRow): void {
    this.fixture.accountChannels.push({ ...row })
  }

  private visible(scope: Scope, merchantId: number): boolean {
    return scope.merchantIds.includes(merchantId)
  }

  private provider(providerId: number): ProviderSummary | undefined {
    return this.fixture.providers.find((p) => p.providerId === providerId)
  }

  private providerVisible(scope: Scope, providerId: number): boolean {
    const p = this.provider(providerId)
    return p !== undefined && this.visible(scope, p.merchantId)
  }

  private merchantRef(merchantId: number) {
    const m = this.fixture.merchants.find((x) => x.merchantId === merchantId)!
    return { merchantId: m.merchantId, name: m.name }
  }

  private accountRef(accountId: string) {
    const a = this.fixture.accounts.find((x) => x.accountId === accountId)!
    return { accountId: a.accountId, name: a.name }
  }

  async listMerchants(scope: Scope): Promise<MerchantSummary[]> {
    return structuredClone(
      this.fixture.merchants.filter((m) => this.visible(scope, m.merchantId)).sort((a, b) => byId(a, b, 'merchantId')),
    )
  }

  async findMerchant(scope: Scope, merchantId: number): Promise<MerchantSummary | null> {
    const m = this.fixture.merchants.find((x) => x.merchantId === merchantId)
    return m && this.visible(scope, m.merchantId) ? structuredClone(m) : null
  }

  async listProviders(scope: Scope, merchantId: number): Promise<ProviderSummary[]> {
    if (!this.visible(scope, merchantId)) return []
    return structuredClone(
      this.fixture.providers.filter((p) => p.merchantId === merchantId).sort((a, b) => byId(a, b, 'providerId')),
    )
  }

  async findProvider(scope: Scope, providerId: number): Promise<ProviderWithMerchant | null> {
    const p = this.provider(providerId)
    if (!p || !this.visible(scope, p.merchantId)) return null
    return { ...structuredClone(p), merchant: this.merchantRef(p.merchantId) }
  }

  async listProviderChannels(scope: Scope, providerId: number): Promise<ChannelSummary[]> {
    if (!this.providerVisible(scope, providerId)) return []
    return structuredClone(
      this.fixture.channels.filter((c) => c.providerId === providerId).sort((a, b) => byId(a, b, 'channelId')),
    )
  }

  async listProviderAccounts(scope: Scope, providerId: number): Promise<AccountSummary[]> {
    if (!this.providerVisible(scope, providerId)) return []
    return structuredClone(
      this.fixture.accounts.filter((a) => a.providerId === providerId).sort((a, b) => a.name.localeCompare(b.name)),
    )
  }

  async findAccount(scope: Scope, accountId: string): Promise<AccountDetail | null> {
    const a = this.fixture.accounts.find((x) => x.accountId.toLowerCase() === accountId.toLowerCase())
    if (!a || !this.providerVisible(scope, a.providerId)) return null
    const provider = this.provider(a.providerId)!
    return {
      ...structuredClone(a),
      provider: structuredClone(provider),
      merchant: this.merchantRef(provider.merchantId),
    }
  }

  async listAccountChannels(scope: Scope, accountId: string): Promise<AccountChannelItem[]> {
    const a = await this.findAccount(scope, accountId)
    if (!a) return []
    return this.fixture.accountChannels
      .filter((row) => row.accountId === a.accountId)
      .sort((x, y) => x.assignedAt.localeCompare(y.assignedAt) || x.channelId - y.channelId)
      .map((row) => {
        const c = this.fixture.channels.find((x) => x.channelId === row.channelId)!
        const primary = this.fixture.accountChannels.find((x) => x.channelId === row.channelId && x.isPrimary)
        return {
          ...structuredClone(c),
          isPrimary: row.isPrimary,
          assignedAt: row.assignedAt,
          assignedInBatchId: row.assignedInBatchId,
          primaryAccount: primary ? this.accountRef(primary.accountId) : null,
        }
      })
  }

  async listChannels(scope: Scope, filter: ChannelFilter): Promise<ChannelSummary[]> {
    const withTransactions = new Set(this.fixture.channelsWithTransactions)
    const assigned = new Set(this.fixture.accountChannels.map((row) => row.channelId))
    return structuredClone(
      this.fixture.channels
        .filter((c) => this.providerVisible(scope, c.providerId))
        .filter((c) => !filter.unassigned || (withTransactions.has(c.channelId) && !assigned.has(c.channelId)))
        .sort((a, b) => byId(a, b, 'channelId')),
    )
  }

  async findChannel(scope: Scope, channelId: number): Promise<ChannelSummary | null> {
    const c = this.fixture.channels.find((x) => x.channelId === channelId)
    return c && this.providerVisible(scope, c.providerId) ? structuredClone(c) : null
  }

  async listChannelAccounts(scope: Scope, channelId: number): Promise<ChannelAccountItem[]> {
    if (!(await this.findChannel(scope, channelId))) return []
    return this.fixture.accountChannels
      .filter((row) => row.channelId === channelId)
      .map((row) => ({ row, account: this.fixture.accounts.find((a) => a.accountId === row.accountId)! }))
      .sort((x, y) => x.row.assignedAt.localeCompare(y.row.assignedAt) || x.account.name.localeCompare(y.account.name))
      .map(({ row, account }) => ({
        accountId: account.accountId,
        name: account.name,
        providerId: account.providerId,
        isActive: account.isActive,
        isPrimary: row.isPrimary,
        assignedAt: row.assignedAt,
        assignedInBatchId: row.assignedInBatchId,
      }))
  }
}
