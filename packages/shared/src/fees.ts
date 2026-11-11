// Fees of an account (README §3.2 "Fees", §4.1, §4.4; spec fees): what Settlement Review reads and what the fee
// administration writes (admin-fees design D2). Validity dates are business dates (YYYY-MM-DD); null means "always".
// Money and percentages travel as decimal strings, never JSON numbers.
import { z } from 'zod'
import { UserRef } from './auth.js'
import { Money4, Rate6 } from './settlement.js'
import { IntId, IsoDate, Money, Percentage } from './vocabulary.js'

const positiveInt = z.number().int().positive()

/** Status of a fee against today's calendar day in New York (design D7). */
export const FeeStatus = z.enum(['active', 'scheduled', 'closed'])
export type FeeStatus = z.infer<typeof FeeStatus>

/** Kind of a fee by its type: computed per movement, batch preset, or free-amount category. */
export const FeeKind = z.enum(['transactional', 'preset', 'free_amount'])
export type FeeKind = z.infer<typeof FeeKind>

/** A fee of an account. A percentage-only preset has no computed amount: the analyst writes it (P9). */
export const AccountFee = z.object({
  feeId: z.uuid(),
  feeTypeId: positiveInt,
  code: z.string(),
  title: z.string(),
  isTransactional: z.boolean(),
  fixedAmount: Money4.nullable(),
  percentage: Rate6.nullable(),
  /** Stored but not applied by the settlement engine yet (known limitation). */
  conditionalPercentage: Rate6.nullable(),
  conditionThresholdAmt: Money4.nullable(),
  brandFixedAmount: Money4.nullable(),
  brandPercentage: Rate6.nullable(),
  /** null: since forever. */
  startDate: IsoDate.nullable(),
  /** null: no end. */
  endDate: IsoDate.nullable(),
  description: z.string().nullable(),
  status: FeeStatus,
  /** A movement breakdown or a batch fee of any attempt (undone included) references it (design D5). */
  inUse: z.boolean(),
  /** Latest business day the fee was applied to; null when not in use. The earliest allowed end date. */
  lastAppliedEventDate: IsoDate.nullable(),
  createdBy: UserRef,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type AccountFee = z.infer<typeof AccountFee>

/** Query of GET /accounts/{id}/fees. */
export const AccountFeesQuery = z.strictObject({
  transactional: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  /** Business date the fees must be in force at. */
  asOf: IsoDate.optional(),
})
export type AccountFeesQuery = z.infer<typeof AccountFeesQuery>

/** GET /fee-types. */
export const FeeTypeView = z.object({
  feeTypeId: positiveInt,
  code: z.string(),
  title: z.string(),
  isTransactional: z.boolean(),
  appliesToStatusId: z.number().int().nullable(),
  allowsFreeAmount: z.boolean(),
})
export type FeeTypeView = z.infer<typeof FeeTypeView>

// ───────────────────────── Writes ─────────────────────────

/** Configuration values of a fee: what a correction or a change from a date may set. */
const feeValues = {
  fixedAmount: Money.nullable().optional(),
  percentage: Percentage.nullable().optional(),
  conditionalPercentage: Percentage.nullable().optional(),
  conditionThresholdAmt: Money.nullable().optional(),
  brandFixedAmount: Money.nullable().optional(),
  brandPercentage: Percentage.nullable().optional(),
  description: z.string().max(100).nullable().optional(),
}
const VALUE_KEYS = Object.keys(feeValues) as (keyof typeof feeValues)[]

/** Optional reason kept in the history and the audit log. */
const Reason = z.string().trim().min(1).max(500)

/**
 * Body of POST /accounts/{id}/fees (README §4.1). "fixedAmount or percentage" and "endDate ≥ startDate" are domain
 * rules answered as 400 validation_error with details.field (design D9), not schema rules.
 */
export const FeeCreate = z.strictObject({
  feeTypeId: positiveInt.max(2_147_483_647),
  ...feeValues,
  /** null or omitted: since forever. */
  startDate: IsoDate.nullable().default(null),
  /** null or omitted: no end. */
  endDate: IsoDate.nullable().default(null),
})
export type FeeCreate = z.infer<typeof FeeCreate>

/** In-place correction: any subset of the editable fields (a fee in use takes only description and endDate). */
export const FeeCorrection = z
  .strictObject({
    ...feeValues,
    startDate: IsoDate.nullable().optional(),
    endDate: IsoDate.nullable().optional(),
    reason: Reason.optional(),
  })
  .refine((b) => Object.keys(b).some((k) => k !== 'reason'), 'at least one field to change is required')
export type FeeCorrection = z.infer<typeof FeeCorrection>

/** Change from a date: closes the fee on effectiveFrom − 1 day and opens a successor with the new values. */
export const FeeChange = z
  .strictObject({
    effectiveFrom: IsoDate,
    ...feeValues,
    reason: Reason.optional(),
  })
  .refine((b) => VALUE_KEYS.some((k) => k in b), 'at least one new value is required')
export type FeeChange = z.infer<typeof FeeChange>

/** Body of PATCH /fees/{id}: a change from a date when effectiveFrom is present, an in-place correction otherwise. */
export const FeePatch = z.union([FeeChange, FeeCorrection])
export type FeePatch = z.infer<typeof FeePatch>

/** Response of PATCH /fees/{id}: the patched fee, and its successor after a change from a date. */
export const FeeUpdateResult = z.object({
  fee: AccountFee,
  successor: AccountFee.nullable(),
})
export type FeeUpdateResult = z.infer<typeof FeeUpdateResult>

// ───────────────────────── Global view ─────────────────────────

/** Query of GET /fees. */
export const FeesQuery = z.strictObject({
  merchantId: IntId.optional(),
  providerId: IntId.optional(),
  accountId: z.uuid().optional(),
  kind: FeeKind.optional(),
  /** Omitted: every status. */
  status: FeeStatus.optional(),
  /** Case-insensitive; account name, fee type code or title, description. */
  q: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
})
export type FeesQuery = z.infer<typeof FeesQuery>

const NamedIntRef = z.object({ id: positiveInt, name: z.string() })

/** A fee of GET /fees, with the hierarchy it belongs to. */
export const FeeListItem = AccountFee.extend({
  merchant: NamedIntRef,
  provider: NamedIntRef,
  account: z.object({ id: z.uuid(), name: z.string() }),
})
export type FeeListItem = z.infer<typeof FeeListItem>

/** GET /fees: ordered by merchant, provider, account, type title, startDate (nulls first) and feeId. */
export const FeePage = z.object({
  items: z.array(FeeListItem),
  page: positiveInt,
  pageSize: positiveInt,
  total: z.number().int().nonnegative(),
})
export type FeePage = z.infer<typeof FeePage>

// ───────────────────────── History ─────────────────────────

export const FeeHistoryAction = z.enum(['created', 'updated', 'closed', 'copied'])
export type FeeHistoryAction = z.infer<typeof FeeHistoryAction>

/** The configuration of a fee as a history row keeps it, in API form. */
export const FeeSnapshot = z.object({
  feeTypeId: positiveInt,
  fixedAmount: Money4.nullable(),
  percentage: Rate6.nullable(),
  conditionalPercentage: Rate6.nullable(),
  conditionThresholdAmt: Money4.nullable(),
  brandFixedAmount: Money4.nullable(),
  brandPercentage: Rate6.nullable(),
  startDate: IsoDate.nullable(),
  endDate: IsoDate.nullable(),
  description: z.string().nullable(),
})
export type FeeSnapshot = z.infer<typeof FeeSnapshot>

/** Query of GET /fees/{id}/history: the fee alone, or every fee of the same type in its account. */
export const FeeHistoryQuery = z.strictObject({
  scope: z.enum(['fee', 'type']).default('fee'),
})
export type FeeHistoryQuery = z.infer<typeof FeeHistoryQuery>

/** A row of GET /fees/{id}/history, newest first. */
export const FeeHistoryEntry = z.object({
  feeHistoryId: positiveInt,
  feeId: z.uuid(),
  action: FeeHistoryAction,
  changedAt: z.iso.datetime(),
  changedBy: UserRef,
  reason: z.string().nullable(),
  before: FeeSnapshot.nullable(),
  after: FeeSnapshot,
})
export type FeeHistoryEntry = z.infer<typeof FeeHistoryEntry>

// ───────────────────────── Errors ─────────────────────────

/** 409 codes of the fee administration (design D9). */
export const FeeErrorCode = z.enum(['fee_overlap', 'fee_in_use'])
export type FeeErrorCode = z.infer<typeof FeeErrorCode>

/** details of 409 fee_overlap. */
export const FeeOverlapDetails = z.object({
  conflicts: z.array(z.object({ feeId: z.uuid(), startDate: IsoDate.nullable(), endDate: IsoDate.nullable() })),
})
export type FeeOverlapDetails = z.infer<typeof FeeOverlapDetails>

/** details of 409 fee_in_use: the rejected fields, or the last applied event a closing must not leave out. */
export const FeeInUseDetails = z.object({
  fields: z.array(z.string()).optional(),
  lastAppliedEventDate: IsoDate.optional(),
})
export type FeeInUseDetails = z.infer<typeof FeeInUseDetails>
