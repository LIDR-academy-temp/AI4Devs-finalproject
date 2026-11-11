// What a write does to a fee (README §3.2 Fee; admin-fees design D3), as pure functions: the row a creation stores,
// and the rows a PATCH leaves (an in-place correction, or a change from a date that closes the fee and opens a
// successor). Money is normalized to 4 decimals and percentages to 6, as DECIMAL(19,4) and DECIMAL(9,6) store them.
import type { FeeChange, FeeCorrection, FeeCreate, FeePatch } from '@recon/shared'
import { Prisma } from '../../../generated/prisma/client.js'
import { FeeInUseError, FeeRuleError } from './errors.js'
import type { FeeSpan } from './fee-validity.js'
import { previousDay } from './fee-validity.js'

/** The stored configuration and validity of a fee. */
export interface FeeState extends FeeSpan {
  fixedAmount: string | null
  percentage: string | null
  conditionalPercentage: string | null
  conditionThresholdAmt: string | null
  brandFixedAmount: string | null
  brandPercentage: string | null
  description: string | null
}

/** Whether movements or batch fees reference the fee, and the latest business day it was applied to (design D5). */
export interface FeeUsage {
  inUse: boolean
  /** YYYY-MM-DD, or null without dated use. */
  lastAppliedEventDate: string | null
}

type ValueField = Exclude<keyof FeeState, 'feeId' | 'feeTypeId' | 'startDate' | 'endDate'>
type EditableField = ValueField | 'startDate' | 'endDate'

const MONEY_FIELDS = ['fixedAmount', 'conditionThresholdAmt', 'brandFixedAmount'] as const
const RATE_FIELDS = ['percentage', 'conditionalPercentage', 'brandPercentage'] as const
const VALUE_FIELDS: readonly ValueField[] = [
  'fixedAmount',
  'percentage',
  'conditionalPercentage',
  'conditionThresholdAmt',
  'brandFixedAmount',
  'brandPercentage',
  'description',
]
/** In the order a correction reports them. */
const EDITABLE_FIELDS: readonly EditableField[] = [...VALUE_FIELDS, 'startDate', 'endDate']
/** What a fee in use still takes in place. */
const EDITABLE_IN_USE = new Set<EditableField>(['description', 'endDate'])

const money = (v: string | null) => (v === null ? null : new Prisma.Decimal(v).toFixed(4))
const rate = (v: string | null) => (v === null ? null : new Prisma.Decimal(v).toFixed(6))

function normalized(field: EditableField, value: string | null): string | null {
  if ((MONEY_FIELDS as readonly string[]).includes(field)) return money(value)
  if ((RATE_FIELDS as readonly string[]).includes(field)) return rate(value)
  return value
}

/** README §3.2: CK_Fee_amountOrPercentage and CK_Fee_validity, answered as 400 with the field to point at. */
export function checkFeeRules(fee: FeeState): void {
  if (fee.fixedAmount === null && fee.percentage === null)
    throw new FeeRuleError('fixedAmount', 'fixedAmount or percentage is required')
  if (fee.startDate !== null && fee.endDate !== null && fee.endDate < fee.startDate)
    throw new FeeRuleError('endDate', 'endDate must not be before startDate')
}

/** The row a POST /accounts/{id}/fees stores; the caller checks the fee type and the overlaps. */
export function planCreate(input: FeeCreate, feeId: string): FeeState {
  const fee: FeeState = {
    feeId,
    feeTypeId: input.feeTypeId,
    fixedAmount: money(input.fixedAmount ?? null),
    percentage: rate(input.percentage ?? null),
    conditionalPercentage: rate(input.conditionalPercentage ?? null),
    conditionThresholdAmt: money(input.conditionThresholdAmt ?? null),
    brandFixedAmount: money(input.brandFixedAmount ?? null),
    brandPercentage: rate(input.brandPercentage ?? null),
    startDate: input.startDate,
    endDate: input.endDate,
    description: input.description ?? null,
  }
  checkFeeRules(fee)
  return fee
}

export type PatchPlan =
  | {
      kind: 'correct'
      /** closed: only endDate changed, from no end to a day; updated otherwise. */
      action: 'updated' | 'closed'
      /** The fields whose value changes, in a fixed order. */
      changed: EditableField[]
      before: FeeState
      after: FeeState
    }
  | {
      kind: 'change'
      before: FeeState
      /** The fee, ending the day before effectiveFrom. */
      closed: FeeState
      /** A new fee of the same account and type from effectiveFrom, with the original end. */
      successor: FeeState
    }

/** The rows a PATCH /fees/{id} leaves; the caller checks the overlaps. `successorId` is used only by a change. */
export function planPatch(current: FeeState, usage: FeeUsage, body: FeePatch, successorId: string): PatchPlan {
  return 'effectiveFrom' in body ? planChange(current, usage, body, successorId) : planCorrection(current, usage, body)
}

function planCorrection(current: FeeState, usage: FeeUsage, body: FeeCorrection): PatchPlan {
  const after: FeeState = { ...current }
  const changed: EditableField[] = []
  for (const field of EDITABLE_FIELDS) {
    if (!(field in body)) continue
    const value = normalized(field, (body as Partial<Record<EditableField, string | null>>)[field] ?? null)
    if (value === current[field]) continue
    after[field] = value
    changed.push(field)
  }

  if (usage.inUse) {
    const rejected = changed.filter((f) => !EDITABLE_IN_USE.has(f))
    if (rejected.length > 0) throw new FeeInUseError({ fields: rejected })
    if (changed.includes('endDate')) assertCoversLastEvent(after.endDate, usage)
  }
  checkFeeRules(after)

  const closes = changed.length === 1 && changed[0] === 'endDate' && current.endDate === null
  return { kind: 'correct', action: closes ? 'closed' : 'updated', changed, before: current, after }
}

function planChange(current: FeeState, usage: FeeUsage, body: FeeChange, successorId: string): PatchPlan {
  const { effectiveFrom } = body
  if (
    (current.startDate !== null && effectiveFrom <= current.startDate) ||
    (current.endDate !== null && effectiveFrom > current.endDate)
  )
    throw new FeeRuleError(
      'effectiveFrom',
      'effectiveFrom must fall after the start and within the validity of the fee',
    )

  const closedEnd = previousDay(effectiveFrom)
  assertCoversLastEvent(closedEnd, usage)

  const successor: FeeState = { ...current, feeId: successorId, startDate: effectiveFrom, endDate: current.endDate }
  for (const field of VALUE_FIELDS)
    if (field in body)
      successor[field] = normalized(field, (body as Partial<Record<ValueField, string | null>>)[field] ?? null)
  checkFeeRules(successor)

  return { kind: 'change', before: current, closed: { ...current, endDate: closedEnd }, successor }
}

/** A fee in use must stay in force up to the last day it was applied to. */
function assertCoversLastEvent(endDate: string | null, usage: FeeUsage): void {
  const last = usage.lastAppliedEventDate
  if (endDate !== null && last !== null && endDate < last) throw new FeeInUseError({ lastAppliedEventDate: last })
}
