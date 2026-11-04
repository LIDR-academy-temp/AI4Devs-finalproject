// A failed write of a fee → what its form shows (web-admin-fees design D7). The details of the 409s are read with
// the schemas of @recon/shared; details that do not validate fall back to the general message of the code.
import { FeeInUseDetails, FeeOverlapDetails } from '@recon/shared'
import { ApiError } from '@/lib/api/client'
import { formatValidity } from './fee-display'
import type { FeeFormField } from './fee-form'
import { strings } from './strings'

const e = strings.form.errors

export interface FeeProblem {
  /** Messages next to a field. */
  fields: Partial<Record<FeeFormField, string>>
  /** Message of the form as a whole. */
  general: string | null
  /** The conflicting fees of a fee_overlap, as `start → end`. */
  conflicts: string[]
  /** The list the screen shows is stale (the fee is in use now, or gone): ask for it again. */
  refetch: boolean
}

/** The field of the API (details.field) → the fields of the form it marks. */
const API_FIELDS: Record<string, FeeFormField[]> = {
  fixedAmount: ['fixedAmount', 'percent'],
  percentage: ['percent'],
  startDate: ['startDate'],
  endDate: ['endDate'],
  effectiveFrom: ['effectiveFrom'],
  feeTypeId: ['feeTypeId'],
  description: ['description'],
  reason: ['reason'],
}

const FIELD_LABELS: Record<string, string> = {
  fixedAmount: strings.history.fields.fixedAmount,
  percentage: strings.history.fields.percentage,
  conditionalPercentage: strings.history.fields.conditionalPercentage,
  conditionThresholdAmt: strings.history.fields.conditionThresholdAmt,
  brandFixedAmount: strings.history.fields.brandFixedAmount,
  brandPercentage: strings.history.fields.brandPercentage,
  startDate: strings.history.fields.startDate,
  endDate: strings.history.fields.endDate,
  description: strings.history.fields.description,
}

const problem = (patch: Partial<FeeProblem>): FeeProblem => ({
  fields: {},
  general: null,
  conflicts: [],
  refetch: false,
  ...patch,
})

export function feeProblemOf(error: unknown, typeTitle: string): FeeProblem {
  if (!(error instanceof ApiError)) return problem({ general: e.unknown })
  const details = error.details

  if (error.status === 400) {
    const field =
      details && typeof details === 'object' && !Array.isArray(details) && 'field' in details
        ? String((details as { field: unknown }).field)
        : null
    const targets = field ? API_FIELDS[field] : undefined
    if (targets) return problem({ fields: Object.fromEntries(targets.map((t) => [t, error.message])) })
    return problem({ general: e.invalid(error.message) })
  }

  if (error.code === 'fee_overlap') {
    const parsed = FeeOverlapDetails.safeParse(details)
    return problem({
      general: e.overlap(typeTitle),
      conflicts: parsed.success ? parsed.data.conflicts.map((c) => formatValidity(c.startDate, c.endDate)) : [],
    })
  }

  if (error.code === 'fee_in_use') {
    const parsed = FeeInUseDetails.safeParse(details)
    const fields = parsed.success ? parsed.data.fields : undefined
    const day = parsed.success ? parsed.data.lastAppliedEventDate : undefined
    let general = e.unknown
    if (fields && fields.length > 0) general = e.inUseFields(fields.map((f) => FIELD_LABELS[f] ?? f))
    else if (day) general = e.appliedUpTo(day)
    return problem({ general, refetch: true })
  }

  if (error.status === 403) return problem({ general: e.forbidden })
  if (error.status === 404) return problem({ general: e.notFound, refetch: true })
  return problem({ general: e.unknown })
}
