import type { ProviderDetail } from '@recon/shared'
import { NotFoundError } from '../domain/errors.js'
import type { Scope } from '../domain/scope.js'
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
} from './ports.js'

/**
 * Read use cases of the catalog (README §4.4, catalog rows). The repository applies the scope inside
 * every query; this layer only turns "nothing came back" into NotFoundError, and for sub-resources checks
 * the parent first so that a child of an invisible parent is never listed (design D5).
 */
export class CatalogService {
  constructor(private readonly catalog: CatalogRepository) {}

  listMerchants(scope: Scope): Promise<MerchantSummary[]> {
    return this.catalog.listMerchants(scope)
  }

  async listProviders(scope: Scope, merchantId: number): Promise<ProviderSummary[]> {
    await this.requireMerchant(scope, merchantId)
    return this.catalog.listProviders(scope, merchantId)
  }

  async getProvider(scope: Scope, providerId: number): Promise<ProviderDetail> {
    const provider = await this.requireProvider(scope, providerId)
    const [accounts, channels] = await Promise.all([
      this.catalog.listProviderAccounts(scope, providerId),
      this.catalog.listProviderChannels(scope, providerId),
    ])
    return { ...provider, accounts, channels }
  }

  async listProviderChannels(scope: Scope, providerId: number): Promise<ChannelSummary[]> {
    await this.requireProvider(scope, providerId)
    return this.catalog.listProviderChannels(scope, providerId)
  }

  async listProviderAccounts(scope: Scope, providerId: number): Promise<AccountSummary[]> {
    await this.requireProvider(scope, providerId)
    return this.catalog.listProviderAccounts(scope, providerId)
  }

  async getAccount(scope: Scope, accountId: string): Promise<AccountDetail> {
    const account = await this.catalog.findAccount(scope, accountId)
    if (!account) throw new NotFoundError('Account')
    return account
  }

  async listAccountChannels(scope: Scope, accountId: string): Promise<AccountChannelItem[]> {
    await this.getAccount(scope, accountId)
    return this.catalog.listAccountChannels(scope, accountId)
  }

  listChannels(scope: Scope, filter: ChannelFilter): Promise<ChannelSummary[]> {
    return this.catalog.listChannels(scope, filter)
  }

  async listChannelAccounts(scope: Scope, channelId: number): Promise<ChannelAccountItem[]> {
    const channel = await this.catalog.findChannel(scope, channelId)
    if (!channel) throw new NotFoundError('Channel')
    return this.catalog.listChannelAccounts(scope, channelId)
  }

  private async requireMerchant(scope: Scope, merchantId: number): Promise<MerchantSummary> {
    const merchant = await this.catalog.findMerchant(scope, merchantId)
    if (!merchant) throw new NotFoundError('Merchant')
    return merchant
  }

  private async requireProvider(scope: Scope, providerId: number) {
    const provider = await this.catalog.findProvider(scope, providerId)
    if (!provider) throw new NotFoundError('Provider')
    return provider
  }
}
