import { queryOptions, useQuery } from '@tanstack/react-query'
import type { Me } from '@/lib/api/types'
import { fetchMe } from './auth-api'

/** Identity of the signed-in user; loaded by the authenticated layout before any screen renders. */
export const meQuery = queryOptions({ queryKey: ['auth', 'me'], queryFn: fetchMe, staleTime: Number.POSITIVE_INFINITY })

/** Only for components under the authenticated layout, where `meQuery` is guaranteed to be loaded. */
export function useMe(): Me {
  return useQuery(meQuery).data!
}
