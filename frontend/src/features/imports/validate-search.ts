// Search params of New Reconciliation and of the import workspace (design D2). Invalid values are dropped.
import { IntId, MatchResult, ValidationCode } from '@recon/shared'
import { z } from 'zod'

export interface NewReconciliationSearch {
  merchantId?: number
  providerId?: number
  accountId?: string
}

export const STEPS = ['files', 'mapping', 'analysis'] as const
export type Step = (typeof STEPS)[number]

export interface ImportSearch {
  step?: Step
  match?: MatchResult
  page?: number
  /** The validation whose findings are listed (web-validations design D5). */
  validation?: ValidationCode
  /** Page of that list; `page` belongs to the rows table. */
  ipage?: number
  /** The finding open in the drawer. */
  issue?: number
}

const intId = (value: unknown): number | undefined => {
  const parsed = IntId.safeParse(typeof value === 'number' ? String(value) : value)
  return parsed.success ? parsed.data : undefined
}

const uuid = (value: unknown): string | undefined => {
  const parsed = z.uuid().safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export const validateNewReconciliationSearch = (search: Record<string, unknown>): NewReconciliationSearch => ({
  merchantId: intId(search.merchantId),
  providerId: intId(search.providerId),
  accountId: uuid(search.accountId),
})

export const validateImportSearch = (search: Record<string, unknown>): ImportSearch => {
  const step = STEPS.find((s) => s === search.step)
  const match = MatchResult.safeParse(search.match)
  const page = intId(search.page)
  const validation = ValidationCode.safeParse(search.validation)
  const ipage = intId(search.ipage)
  const issue = intId(search.issue)
  // Every key is returned, undefined when invalid: the router lays this object over the raw search, so a key left
  // out would keep its raw value.
  return {
    step,
    match: match.success ? match.data : undefined,
    page: page && page > 1 ? page : undefined,
    validation: validation.success ? validation.data : undefined,
    ipage: ipage && ipage > 1 ? ipage : undefined,
    issue,
  }
}

/** The open statuses In Progress filters by (spec "Pantalla In Progress: filtros"). */
export const OPEN_STATUSES = ['uploaded', 'mapped', 'analyzed', 'validated'] as const
export type OpenStatus = (typeof OPEN_STATUSES)[number]

export interface InProgressSearch {
  merchantId?: number
  providerId?: number
  accountId?: string
  status?: OpenStatus
  mine?: true
  page?: number
}

/**
 * The address of In Progress (design D5): invalid values are dropped, and a level of the merchant → provider →
 * account cascade without the one above is dropped too, so every filter can be checked against the lists shown.
 */
export const validateInProgressSearch = (search: Record<string, unknown>): InProgressSearch => {
  const merchantId = intId(search.merchantId)
  const providerId = merchantId === undefined ? undefined : intId(search.providerId)
  const accountId = providerId === undefined ? undefined : uuid(search.accountId)
  const status = OPEN_STATUSES.find((open) => open === search.status)
  const page = intId(search.page)
  // Every key is returned, undefined when invalid, for the same reason as validateImportSearch.
  return {
    merchantId,
    providerId,
    accountId,
    status,
    mine: search.mine === true || search.mine === 'true' ? (true as const) : undefined,
    page: page && page > 1 ? page : undefined,
  }
}
