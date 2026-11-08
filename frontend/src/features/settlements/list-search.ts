// Search params of Settlement List (settlements-browse design D7). Invalid values are dropped, impossible days too;
// the days are YYYY-MM-DD text, never parsed into a Date.
import { BatchStatus, IntId, IsoDate } from '@recon/shared'
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

const intId = (value: unknown): number | undefined => {
  const parsed = IntId.safeParse(typeof value === 'number' ? String(value) : value)
  return parsed.success ? parsed.data : undefined
}

const uuid = (value: unknown): string | undefined => {
  const parsed = z.uuid().safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** A day of the calendar, as the API checks it: `2026-02-30` is dropped like a malformed one. */
const day = (value: unknown): string | undefined => {
  const parsed = IsoDate.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export const validateSettlementListSearch = (search: Record<string, unknown>): SettlementListSearch => {
  const status = BatchStatus.safeParse(search.status)
  const page = intId(search.page)
  // Every key is returned, undefined when invalid: the router lays this object over the raw search, so a key left
  // out would keep its raw value.
  return {
    merchantId: intId(search.merchantId),
    providerId: intId(search.providerId),
    accountId: uuid(search.accountId),
    status: status.success ? status.data : undefined,
    dateField: search.dateField === 'processedAt' ? ('processedAt' as const) : undefined,
    from: day(search.from),
    to: day(search.to),
    page: page && page > 1 ? page : undefined,
  }
}
