// Ports of the catalog application layer. Adapters live in ../infrastructure; the in-memory double in ./__fakes__.
import type {
  AccountChannelItem,
  AccountDetail,
  AccountSummary,
  ChannelAccountItem,
  ChannelSummary,
  MerchantRef,
  MerchantSummary,
  ProviderSummary,
} from '@recon/shared'
import type { Scope } from '../domain/scope.js'

export type {
  AccountChannelItem,
  AccountDetail,
  AccountSummary,
  ChannelAccountItem,
  ChannelSummary,
  MerchantRef,
  MerchantSummary,
  ProviderSummary,
}

export type ProviderWithMerchant = ProviderSummary & { merchant: MerchantRef }

export interface ChannelFilter {
  /** true: only channels with transactions and no AccountChannel row ("not assigned yet"). */
  unassigned?: boolean
}

/**
 * Read access to the catalog. Every method takes the caller's scope and applies it inside the query
 * (design D2): a resource outside the scope is never returned, so `null` reads as "not found".
 * Lists are ordered deterministically: merchants, providers and channels by id; accounts by name;
 * account–channel rows by `assignedAt`, then by id.
 */
export interface CatalogRepository {
  listMerchants(scope: Scope): Promise<MerchantSummary[]>
  findMerchant(scope: Scope, merchantId: number): Promise<MerchantSummary | null>
  listProviders(scope: Scope, merchantId: number): Promise<ProviderSummary[]>
  findProvider(scope: Scope, providerId: number): Promise<ProviderWithMerchant | null>
  listProviderChannels(scope: Scope, providerId: number): Promise<ChannelSummary[]>
  listProviderAccounts(scope: Scope, providerId: number): Promise<AccountSummary[]>
  findAccount(scope: Scope, accountId: string): Promise<AccountDetail | null>
  listAccountChannels(scope: Scope, accountId: string): Promise<AccountChannelItem[]>
  listChannels(scope: Scope, filter: ChannelFilter): Promise<ChannelSummary[]>
  findChannel(scope: Scope, channelId: number): Promise<ChannelSummary | null>
  listChannelAccounts(scope: Scope, channelId: number): Promise<ChannelAccountItem[]>
}
