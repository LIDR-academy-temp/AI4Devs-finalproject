// The merchant → provider → account selection of a filtered list, checked against the user's scope.
import { useQuery } from '@tanstack/react-query'
import { merchantsQuery, providerQuery, providersQuery } from './queries'

/** The merchant → provider → account a screen reads from its address. */
export interface ScopeSearch {
  merchantId?: number
  providerId?: number
  accountId?: string
}

/**
 * Whether the merchant → provider → account of the address are visible to the user (web-admin-fees design D3), with
 * the options of each level. A list is asked only once they are: an id outside the scope would be a 404 of the API,
 * and the screen already knows. Fees and In Progress use it (import-in-progress D5).
 */
export function useScopeSelection(search: ScopeSearch) {
  const { merchantId, providerId, accountId } = search
  const merchants = useQuery(merchantsQuery)
  const merchantVisible = merchants.data?.some((m) => m.merchantId === merchantId) ?? false
  const providers = useQuery({ ...providersQuery(merchantId ?? 0), enabled: merchantVisible })
  const providerVisible = merchantVisible && (providers.data?.some((p) => p.providerId === providerId) ?? false)
  const provider = useQuery({ ...providerQuery(providerId ?? 0), enabled: providerVisible })
  const accountVisible = providerVisible && (provider.data?.accounts.some((a) => a.accountId === accountId) ?? false)

  const levels = [
    { asked: merchantId !== undefined, query: merchants, visible: merchantVisible },
    { asked: providerId !== undefined, query: providers, visible: providerVisible },
    { asked: accountId !== undefined, query: provider, visible: accountVisible },
  ]
  let state: 'ready' | 'checking' | 'not_available' | 'error' = 'ready'
  for (const level of levels) {
    if (!level.asked) break
    if (level.query.isError) state = 'error'
    else if (!level.query.data) state = 'checking'
    else if (!level.visible) state = 'not_available'
    if (state !== 'ready') break
  }

  return {
    state,
    merchants: merchants.data ?? [],
    providers: merchantVisible ? (providers.data ?? []) : [],
    accounts: providerVisible ? (provider.data?.accounts ?? []) : [],
    retry: () => Promise.all([merchants, providers, provider].filter((q) => q.isError).map((q) => q.refetch())),
  }
}

export type ScopeSelection = ReturnType<typeof useScopeSelection>
