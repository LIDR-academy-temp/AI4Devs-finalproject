// Search params of Administration › Channel Assignment (web-admin-accounts design D8): an optional merchant and,
// under it, an optional provider. Invalid values are dropped, and a provider without its merchant too, so every
// filter can be checked against the lists the screen shows.
import { IntId } from '@recon/shared'

export interface ChannelAssignmentSearch {
  merchantId?: number
  providerId?: number
}

const intId = (value: unknown): number | undefined => {
  const parsed = IntId.safeParse(typeof value === 'number' ? String(value) : value)
  return parsed.success ? parsed.data : undefined
}

export const validateChannelAssignmentSearch = (search: Record<string, unknown>): ChannelAssignmentSearch => {
  const merchantId = intId(search.merchantId)
  // Every key is returned, undefined when invalid, so the router does not keep an invalid raw value.
  return { merchantId, providerId: merchantId === undefined ? undefined : intId(search.providerId) }
}

/** A merchant chosen in the filter (empty: all merchants): the provider of the previous one no longer applies. */
export const chooseMerchant = (value: string): ChannelAssignmentSearch => ({
  merchantId: intId(value),
  providerId: undefined,
})

/** A provider chosen in the filter (empty: all the providers of the merchant). */
export const chooseProvider = (search: ChannelAssignmentSearch, value: string): ChannelAssignmentSearch => ({
  merchantId: search.merchantId,
  providerId: intId(value),
})
