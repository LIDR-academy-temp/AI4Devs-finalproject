// Search params of Settlement List (settlements-browse design D7). Invalid values are dropped; the days are YYYY-MM-DD
// text, never parsed into a Date.
import { BatchStatus, IntId } from '@recon/shared'
import { z } from 'zod'
import type { AccountChoiceSearch } from '@/features/accounts/account-choice'
import type { SettlementDateField } from './contract'

export interface SettlementListSearch extends AccountChoiceSearch {
  status?: BatchStatus
  /** Absent: the settlement date, the default of the API. */
  dateField?: Exclude<SettlementDateField, 'settlementDate'>
  from?: string
  to?: string
  page?: number
}

const DAY = /^\d{4}-\d{2}-\d{2}$/

const intId = (value: unknown): number | undefined => {
  const parsed = IntId.safeParse(typeof value === 'number' ? String(value) : value)
  return parsed.success ? parsed.data : undefined
}

const uuid = (value: unknown): string | undefined => {
  const parsed = z.uuid().safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const day = (value: unknown): string | undefined => (typeof value === 'string' && DAY.test(value) ? value : undefined)

export const validateSettlementListSearch = (search: Record<string, unknown>): SettlementListSearch => {
  const status = BatchStatus.safeParse(search.status)
  const page = intId(search.page)
  return dropUndefined({
    merchantId: intId(search.merchantId),
    providerId: intId(search.providerId),
    accountId: uuid(search.accountId),
    status: status.success ? status.data : undefined,
    dateField: search.dateField === 'processedAt' ? ('processedAt' as const) : undefined,
    from: day(search.from),
    to: day(search.to),
    page: page && page > 1 ? page : undefined,
  })
}

/** Absent keys stay absent, so the address carries only what is set. */
function dropUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}
