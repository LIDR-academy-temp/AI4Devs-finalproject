// Catalog reads of the Accounts screen (design D8). Keys are per resource so other screens can share the cache.
import { queryOptions } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api/client'

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

export const accountChannelsQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['accounts', accountId, 'channels'],
    queryFn: () => unwrap(api.GET('/api/v1/accounts/{accountId}/channels', { params: { path: { accountId } } })),
  })

/** Account with its provider and merchant (header of an import, account given by link). */
export const accountQuery = (accountId: string) =>
  queryOptions({
    queryKey: ['accounts', accountId],
    queryFn: () => unwrap(api.GET('/api/v1/accounts/{accountId}', { params: { path: { accountId } } })),
  })
