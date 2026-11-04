// Catalog reads of the Accounts screen (design D8). Keys are per resource so other screens can share the cache.
import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'
import { getMatchingRuleSets } from './contract'

export const merchantsQuery = queryOptions({
  queryKey: ['merchants'],
  queryFn: () => unwrap(api.GET('/api/v1/merchants')),
})

export const providersQuery = (merchantId: number) =>
  queryOptions({
    queryKey: ['merchants', merchantId, 'providers'],
    queryFn: () =>
      unwrap(
        api.GET('/api/v1/merchants/{merchantId}/providers', { params: { path: { merchantId: String(merchantId) } } }),
      ),
  })

export const providerQuery = (providerId: number) =>
  queryOptions({
    queryKey: ['providers', providerId],
    queryFn: () =>
      unwrap(api.GET('/api/v1/providers/{providerId}', { params: { path: { providerId: String(providerId) } } })),
  })

/** Channels with transactions and no account, for the whole scope; each screen filters by provider. */
export const unassignedChannelsQuery = queryOptions({
  queryKey: ['channels', { unassigned: true }],
  queryFn: () => unwrap(api.GET('/api/v1/channels', { params: { query: { unassigned: 'true' } } })),
})

/** Every channel of the scope with its primary account (Channel Assignment, web-admin-accounts design D8). */
export const channelsQuery = queryOptions({
  queryKey: ['channels', { unassigned: false }],
  queryFn: () => unwrap(api.GET('/api/v1/channels')),
})

/** The accounts a channel was ever associated to: the primary one and the historical ones. */
export const channelAccountsQuery = (channelId: number) =>
  queryOptions({
    queryKey: ['channels', channelId, 'accounts'],
    queryFn: () =>
      unwrap(api.GET('/api/v1/channels/{channelId}/accounts', { params: { path: { channelId: String(channelId) } } })),
  })

export const accountChannelsQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['accounts', accountId, 'channels'],
    queryFn: () => unwrap(api.GET('/api/v1/accounts/{accountId}/channels', { params: { path: { accountId } } })),
  })

/** The matching rule sets of a provider and the accounts linked to each (web-admin-accounts design D4, D7). */
export const matchingRuleSetsQuery = (providerId: number) =>
  queryOptions({
    queryKey: ['providers', providerId, 'matching-rule-sets'],
    queryFn: () => getMatchingRuleSets(providerId),
  })

/** Account with its provider and merchant (header of an import, account given by link). */
export const accountQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['accounts', accountId],
    queryFn: () => unwrap(api.GET('/api/v1/accounts/{accountId}', { params: { path: { accountId } } })),
  })
