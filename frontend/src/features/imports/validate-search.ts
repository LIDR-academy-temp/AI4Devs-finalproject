// Search params of New Reconciliation and of the import workspace (design D2). Invalid values are dropped.
import { IntId, MatchResult } from '@recon/shared'
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
  return { step, match: match.success ? match.data : undefined, page: page && page > 1 ? page : undefined }
}
