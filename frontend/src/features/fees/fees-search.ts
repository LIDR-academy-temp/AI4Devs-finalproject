// Search params of Administration › Fees (web-admin-fees design D3). Invalid values are dropped; a level of the
// merchant → provider → account cascade without the one above is dropped too, so every filter can be checked
// against the lists the screen shows.
import { FeeKind, FeeStatus, IntId } from '@recon/shared'
import { z } from 'zod'
import type { FeesQuery } from './contract'

export interface FeesSearch {
  merchantId?: number
  providerId?: number
  accountId?: string
  kind?: FeeKind
  /** Absent: the active fees, the default of the screen. `all`: no status filter. */
  status?: FeeStatus | 'all'
  q?: string
  page?: number
}

const intId = (value: unknown): number | undefined => {
  const parsed = IntId.safeParse(typeof value === 'number' ? String(value) : value)
  return parsed.success ? parsed.data : undefined
}

const uuid = (value: unknown): string | undefined => {
  const parsed = z.uuid().safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** The longest q the API takes (FeesQuery). */
export const MAX_Q = 100

export const validateFeesSearch = (search: Record<string, unknown>): FeesSearch => {
  const merchantId = intId(search.merchantId)
  const providerId = merchantId === undefined ? undefined : intId(search.providerId)
  const accountId = providerId === undefined ? undefined : uuid(search.accountId)
  const kind = FeeKind.safeParse(search.kind)
  const status = search.status === 'all' ? ('all' as const) : FeeStatus.safeParse(search.status).data
  const q = typeof search.q === 'string' ? search.q.trim() : ''
  const page = intId(search.page)
  // Every key is returned, undefined when invalid: the router lays this object over the raw search, so a key left
  // out would keep its raw value.
  return {
    merchantId,
    providerId,
    accountId,
    kind: kind.success ? kind.data : undefined,
    status,
    q: q && q.length <= MAX_Q ? q : undefined,
    page: page && page > 1 ? page : undefined,
  }
}

/** What the screen asks GET /fees for the address: the active fees unless the address says otherwise. */
export function feesQueryOf(search: FeesSearch): FeesQuery {
  return dropUndefined({
    merchantId: search.merchantId === undefined ? undefined : String(search.merchantId),
    providerId: search.providerId === undefined ? undefined : String(search.providerId),
    accountId: search.accountId,
    kind: search.kind,
    q: search.q,
    status: search.status === 'all' ? undefined : (search.status ?? 'active'),
    page: search.page ?? 1,
  })
}

/** Absent keys stay absent, so the address carries only what is set. */
function dropUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}
