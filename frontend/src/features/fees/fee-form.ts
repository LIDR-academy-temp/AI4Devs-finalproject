// The fee form's values ⇄ the bodies of the API (web-admin-fees design D4, D6). Pure: the form shows, this decides
// what is sent. Only what changed is sent, compared as text; amounts and rates never go through a JS number. The
// local checks are the ones that would be a sure 400; overlaps, use and validity limits are decided by the API.
import { percentError, percentToRate, rateToPercent } from '@/lib/format'
import type { FeeCreateBody, FeePatchBody } from './contract'
import { strings } from './strings'

export type FeeFormMode = 'create' | 'correct' | 'change'

/** Every field as the inputs hold it. */
export interface FeeFormValues {
  feeTypeId: string
  fixedAmount: string
  /** Percent as written ("2.75"), not the fraction the API takes. */
  percent: string
  startDate: string
  /** No start date: since forever. */
  always: boolean
  endDate: string
  /** No end date. */
  noEnd: boolean
  description: string
  reason: string
  effectiveFrom: string
}

export type FeeFormField = keyof FeeFormValues

/** What the form needs of an existing fee. */
export interface EditableFee {
  feeTypeId: number
  fixedAmount: string | null
  percentage: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  inUse: boolean
}

export type FeeFormResult =
  | { ok: true; body: FeeCreateBody | FeePatchBody }
  | { ok: false; errors: Partial<Record<FeeFormField, string>>; general: string | null }

const e = strings.form.errors
const MONEY = /^-?\d{1,15}(\.\d{1,4})?$/
const MAX_DESCRIPTION = 100
const MAX_REASON = 500

export function initialFeeValues(_mode: FeeFormMode, fee?: EditableFee): FeeFormValues {
  return {
    feeTypeId: fee ? String(fee.feeTypeId) : '',
    fixedAmount: fee?.fixedAmount ?? '',
    percent: fee?.percentage ? rateToPercent(fee.percentage) : '',
    startDate: fee?.startDate ?? '',
    always: fee ? fee.startDate === null : true,
    endDate: fee?.endDate ?? '',
    noEnd: fee ? fee.endDate === null : true,
    description: fee?.description ?? '',
    reason: '',
    effectiveFrom: '',
  }
}

/** "15", "15.0", "015.0000" → "15": the same amount written in different ways. */
function canonical(value: string | null): string | null {
  if (value === null) return null
  const negative = value.startsWith('-')
  const [integer = '0', fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const whole = integer.replace(/^0+(?=\d)/, '')
  const rest = fraction.replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${rest ? `.${rest}` : ''}`
}

interface Parsed {
  errors: Partial<Record<FeeFormField, string>>
  fixedAmount: string | null
  percentage: string | null
  startDate: string | null
  endDate: string | null
  description: string | null
  reason: string | undefined
}

/**
 * Reads and checks every field; the mode decides which of them count. A disabled input reaches here as undefined
 * (React Hook Form leaves disabled fields out), read as empty.
 */
function parse(input: FeeFormValues): Parsed {
  const values = {
    ...input,
    fixedAmount: input.fixedAmount ?? '',
    percent: input.percent ?? '',
    startDate: input.startDate ?? '',
    endDate: input.endDate ?? '',
    description: input.description ?? '',
    reason: input.reason ?? '',
    always: input.always ?? false,
    noEnd: input.noEnd ?? false,
  }
  const errors: Partial<Record<FeeFormField, string>> = {}
  const amount = values.fixedAmount.trim()
  if (amount !== '' && !MONEY.test(amount)) errors.fixedAmount = e.amountInvalid
  const percent = values.percent.trim()
  const problem = percent === '' ? null : percentError(percent)
  if (problem === 'invalid') errors.percent = e.percentInvalid
  if (problem === 'too_precise') errors.percent = e.percentTooPrecise
  if (problem === 'out_of_range') errors.percent = e.percentOutOfRange
  if (!values.always && values.startDate === '') errors.startDate = e.dateRequired
  if (!values.noEnd && values.endDate === '') errors.endDate = e.dateRequired
  const description = values.description.trim()
  if (description.length > MAX_DESCRIPTION) errors.description = e.descriptionTooLong
  const reason = values.reason.trim()
  if (reason.length > MAX_REASON) errors.reason = e.reasonTooLong
  return {
    errors,
    fixedAmount: amount === '' ? null : amount,
    percentage: percent === '' || problem ? null : percentToRate(percent),
    startDate: values.always ? null : values.startDate || null,
    endDate: values.noEnd ? null : values.endDate || null,
    description: description === '' ? null : description,
    reason: reason === '' ? undefined : reason,
  }
}

const failed = (errors: Partial<Record<FeeFormField, string>>, general: string | null = null): FeeFormResult => ({
  ok: false,
  errors,
  general,
})

/** At least an amount or a percentage, the rule of a valid fee (admin-fees spec "Reglas de un fee válido"). */
function needsAValue(p: Parsed, errors: Partial<Record<FeeFormField, string>>) {
  if (p.fixedAmount === null && p.percentage === null && !errors.fixedAmount && !errors.percent) {
    errors.fixedAmount = e.amountOrPercent
    errors.percent = e.amountOrPercent
  }
}

export function feeFormBody(mode: FeeFormMode, values: FeeFormValues, fee?: EditableFee): FeeFormResult {
  const p = parse(values)
  if (mode === 'create') return createBody(values, p)
  if (!fee) throw new Error(`A ${mode} needs the fee`)
  return mode === 'correct' ? correctionBody(p, fee) : changeBody(values, p, fee)
}

function createBody(values: FeeFormValues, p: Parsed): FeeFormResult {
  const errors = { ...p.errors }
  if (values.feeTypeId === '') errors.feeTypeId = e.feeTypeRequired
  needsAValue(p, errors)
  if (Object.keys(errors).length > 0) return failed(errors)
  const body: FeeCreateBody = { feeTypeId: Number(values.feeTypeId) }
  if (p.fixedAmount !== null) body.fixedAmount = p.fixedAmount
  if (p.percentage !== null) body.percentage = p.percentage
  body.startDate = p.startDate
  body.endDate = p.endDate
  if (p.description !== null) body.description = p.description
  return { ok: true, body }
}

/** In place: only the changed fields; a fee in use, only description and end date (the rest are read only). */
function correctionBody(p: Parsed, fee: EditableFee): FeeFormResult {
  const editable: (keyof Parsed)[] = fee.inUse
    ? ['endDate', 'description']
    : ['fixedAmount', 'percentage', 'startDate', 'endDate', 'description']
  const errors = Object.fromEntries(
    Object.entries(p.errors).filter(
      ([field]) =>
        field === 'reason' || editable.includes(field === 'percent' ? 'percentage' : (field as keyof Parsed)),
    ),
  ) as Partial<Record<FeeFormField, string>>
  if (!fee.inUse) needsAValue(p, errors)
  if (Object.keys(errors).length > 0) return failed(errors)

  const body: Record<string, string | null> = {}
  for (const field of editable) {
    const now = p[field] as string | null
    const before = fee[field as keyof EditableFee] as string | null
    const same =
      field === 'fixedAmount' || field === 'percentage' ? canonical(now) === canonical(before) : now === before
    if (!same) body[field] = now
  }
  if (Object.keys(body).length === 0) return failed({}, e.nothingToSave)
  if (p.reason !== undefined) body.reason = p.reason
  return { ok: true, body: body as FeePatchBody }
}

/** From a date: effectiveFrom and the values that changed; dates are not part of it. */
function changeBody(values: FeeFormValues, p: Parsed, fee: EditableFee): FeeFormResult {
  const errors = Object.fromEntries(
    Object.entries(p.errors).filter(([field]) => ['fixedAmount', 'percent', 'description', 'reason'].includes(field)),
  ) as Partial<Record<FeeFormField, string>>
  if (values.effectiveFrom === '') errors.effectiveFrom = e.effectiveFromRequired
  needsAValue(p, errors)
  if (Object.keys(errors).length > 0) return failed(errors)

  const body: Record<string, string | null> = {}
  if (canonical(p.fixedAmount) !== canonical(fee.fixedAmount)) body.fixedAmount = p.fixedAmount
  if (canonical(p.percentage) !== canonical(fee.percentage)) body.percentage = p.percentage
  if (p.description !== fee.description) body.description = p.description
  if (Object.keys(body).length === 0) return failed({}, e.changeAValue)
  return {
    ok: true,
    body: { effectiveFrom: values.effectiveFrom, ...body, ...(p.reason ? { reason: p.reason } : {}) } as FeePatchBody,
  }
}
