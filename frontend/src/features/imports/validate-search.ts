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
  return dropUndefined({
    step,
    match: match.success ? match.data : undefined,
    page: page && page > 1 ? page : undefined,
    validation: validation.success ? validation.data : undefined,
    ipage: ipage && ipage > 1 ? ipage : undefined,
    issue,
  })
}

/** Absent keys stay absent, so the address carries only what is set. */
function dropUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}
