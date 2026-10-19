// Fees as Settlement Review reads them (README §3.2 "Fees", §4.4; settlement-process, spec fees). Validity dates are
// business dates (YYYY-MM-DD); null means "always".
import { z } from 'zod'
import { Money4, Rate6 } from './settlement.js'
import { IsoDate } from './vocabulary.js'

/** A fee of an account. A percentage-only preset has no computed amount: the analyst writes it (P9). */
export const AccountFee = z.object({
  feeId: z.uuid(),
  feeTypeId: z.number().int().positive(),
  code: z.string(),
  title: z.string(),
  isTransactional: z.boolean(),
  fixedAmount: Money4.nullable(),
  percentage: Rate6.nullable(),
  /** null: since forever. */
  startDate: IsoDate.nullable(),
  /** null: no end. */
  endDate: IsoDate.nullable(),
  description: z.string().nullable(),
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
  feeTypeId: z.number().int().positive(),
  code: z.string(),
  title: z.string(),
  isTransactional: z.boolean(),
  appliesToStatusId: z.number().int().nullable(),
  allowsFreeAmount: z.boolean(),
})
export type FeeTypeView = z.infer<typeof FeeTypeView>
