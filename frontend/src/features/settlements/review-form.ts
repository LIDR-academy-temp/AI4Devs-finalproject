// The form of Settlement Review as pure functions (web-settlement design D4, D5): the schema the screen validates
// with and the body it sends to the preview and to Process. Everything is text: an amount is never turned into a
// number, and it is sent exactly as written.
import { z } from 'zod'
import type { SettlementRequest } from './contract'

/** Where a batch fee row comes from: the Other Fees sheet, a preset fee of the account or a free amount. */
export type FeeOrigin = 'file' | 'preset' | 'free'

export interface FeeRow {
  /** Stable key of the row in the field array. */
  key: string
  origin: FeeOrigin
  /** Null only in a file row whose type is not in the catalog, until the analyst chooses one. */
  feeTypeId: number | null
  /** A file row whose type was not in the catalog: the analyst chooses a free-amount type for it (design D5). */
  chooseType?: boolean
  feeId: string | null
  /** Title of the fee type (or the text of the file for an unknown type). */
  title: string
  amount: string
  description: string
  /** Warning of the analysis for a file row (unknown type, other currency…). */
  fileWarning?: string
  /** Currency of the file row, shown as a reference: the amount written is USD. */
  currency?: string | null
  /** Rate of a percentage-only preset, shown to the analyst; never multiplied (P9 of #11). */
  percentage?: string | null
}

export interface ReviewFormValues {
  batchNo: string
  settlementDate: string
  fees: FeeRow[]
  confirmChannels: boolean
}

export const formMessages = {
  batchNo: 'Enter a positive whole number.',
  batchNoMax: 'Enter a number up to 2147483647.',
  settlementDate: 'Choose the settlement date.',
  invalidDate: 'Enter a valid date.',
  amount: 'Enter an amount with up to 4 decimals, other than zero.',
  description: 'Write a description for a free-amount fee.',
  descriptionLength: 'Use at most 200 characters.',
  unknownType: 'Unknown fee type in the file: choose a free-amount type or remove the fee.',
}

const BATCH_NO = /^[1-9]\d*$/
/** The batch number is an INT column: the API answers 400 past it. */
const MAX_BATCH_NO = 2_147_483_647
const AMOUNT = /^-?\d{1,15}(\.\d{1,4})?$/
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** A decimal string with a sign, up to 15 digits and 4 decimals, other than zero; checked on the text only. */
export const isAmount = (value: string) => AMOUNT.test(value) && /[1-9]/.test(value)

/** A real calendar day written as YYYY-MM-DD (the value of an input of type date). */
function isCalendarDay(value: string): boolean {
  const match = DATE.exec(value)
  if (!match) return false
  const [, y, m, d] = match.map(Number) as [number, number, number, number]
  const day = new Date(Date.UTC(y, m - 1, d))
  return day.getUTCFullYear() === y && day.getUTCMonth() === m - 1 && day.getUTCDate() === d
}

const feeRowSchema = z
  .object({
    key: z.string(),
    origin: z.enum(['file', 'preset', 'free']),
    feeTypeId: z.number().int().nullable(),
    chooseType: z.boolean().optional(),
    feeId: z.string().nullable(),
    title: z.string(),
    amount: z.string(),
    description: z.string(),
    fileWarning: z.string().optional(),
    currency: z.string().nullable().optional(),
    percentage: z.string().nullable().optional(),
  })
  .superRefine((row, ctx) => {
    if (row.feeTypeId === null) ctx.addIssue({ code: 'custom', path: ['feeTypeId'], message: formMessages.unknownType })
    if (!isAmount(row.amount)) ctx.addIssue({ code: 'custom', path: ['amount'], message: formMessages.amount })
    const description = row.description.trim()
    if (row.origin === 'free' && description.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['description'], message: formMessages.description })
    } else if (description.length > 200) {
      ctx.addIssue({ code: 'custom', path: ['description'], message: formMessages.descriptionLength })
    }
  })

export const reviewFormSchema = z.object({
  batchNo: z
    .string()
    .regex(BATCH_NO, formMessages.batchNo)
    // Only for a whole number: anything else already has the message above.
    .refine((value) => !BATCH_NO.test(value) || Number(value) <= MAX_BATCH_NO, formMessages.batchNoMax),
  settlementDate: z
    .string()
    .min(1, formMessages.settlementDate)
    .refine((value) => value.length === 0 || isCalendarDay(value), formMessages.invalidDate),
  fees: z.array(feeRowSchema),
  confirmChannels: z.boolean(),
})

/**
 * The body of the preview and of Process for valid values: the reviewed run, the number as an integer (it is not
 * money), the date as written and the batch fees in the order of the rows, each amount exactly as written.
 * `confirmChannelAssignment` goes only when the preview asks for it and the box is checked.
 */
export function toRequest(values: ReviewFormValues, runId: number, confirmationRequired: boolean): SettlementRequest {
  return {
    runId,
    batchNo: Number.parseInt(values.batchNo, 10),
    settlementDate: values.settlementDate,
    ...(confirmationRequired && values.confirmChannels ? { confirmChannelAssignment: true } : {}),
    batchFees: values.fees.map((row) => {
      const description = row.description.trim()
      return {
        feeTypeId: row.feeTypeId!,
        feeId: row.feeId,
        amount: row.amount,
        ...(description ? { description } : {}),
        source: row.origin === 'file' ? 'file' : 'manual',
      }
    }),
  }
}
