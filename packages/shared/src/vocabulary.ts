// Fixed vocabulary from the README (CLAUDE.md "Vocabulario fijo") and the scalar formats of the API (README §4).
import { z } from 'zod'

export const Cycle = z.enum(['E', 'I', 'R'])
export type Cycle = z.infer<typeof Cycle>

export const TransactionStatusCode = z.enum(['Pending', 'Successful', 'Declined', 'Chargeback', 'Refund', 'RDR'])
export type TransactionStatusCode = z.infer<typeof TransactionStatusCode>

export interface TransactionStatus {
  readonly statusId: number
  readonly code: TransactionStatusCode
  readonly name: string
  readonly cycle: Cycle
}

/**
 * The TransactionStatus catalog as the seed writes it (web-import, design D6). There is no endpoint for it yet;
 * an integration test of the backend keeps it equal to the seeded table.
 */
export const TRANSACTION_STATUSES = [
  { statusId: 1, code: 'Pending', name: 'Pending', cycle: 'E' },
  { statusId: 2, code: 'Successful', name: 'Successful', cycle: 'E' },
  { statusId: 3, code: 'Declined', name: 'Declined', cycle: 'E' },
  { statusId: 4, code: 'Chargeback', name: 'Chargeback', cycle: 'I' },
  { statusId: 5, code: 'Refund', name: 'Refund', cycle: 'I' },
  { statusId: 6, code: 'RDR', name: 'RDR', cycle: 'I' },
] as const satisfies readonly TransactionStatus[]

export const SheetKind = z.enum(['transactions', 'batch_fees', 'ignore'])
export type SheetKind = z.infer<typeof SheetKind>
export const MatchResult = z.enum(['matched', 'unmatched', 'ambiguous', 'ignored'])
export type MatchResult = z.infer<typeof MatchResult>
export const TargetField = z.enum([
  'transactionId',
  'status',
  'gateway',
  'amount',
  'currency',
  'txnDate',
  'feeType',
  'providerRef',
  'orderId',
  'reference',
])
export type TargetField = z.infer<typeof TargetField>
export const ImportStatus = z.enum(['uploaded', 'mapped', 'analyzed', 'validated', 'processed', 'cancelled'])
export type ImportStatus = z.infer<typeof ImportStatus>

/** Per-row warnings of the analysis, counted per code in `analysis.warnings` (README §1.2 "Importes…", spec: import, D8). */
export const WarningCode = z.enum([
  'negative_amount',
  'non_usd_currency',
  'amount_unparsed',
  'currency_invalid',
  'id_length',
  'lossy_numeric_id',
  'status_unresolved',
  'status_differs_from_sheet',
  'cycle_mismatch',
])
export type WarningCode = z.infer<typeof WarningCode>

/**
 * Warnings of a row as `GET rows` returns it: the persisted ones plus `out_of_scope_transaction`, added at read time
 * when the matched transaction belongs to a merchant outside the caller's scope (spec: import, D11). It depends on
 * who reads, so `analysis.warnings` does not count it.
 */
export const RowWarningCode = z.enum([...WarningCode.options, 'out_of_scope_transaction'])
export type RowWarningCode = z.infer<typeof RowWarningCode>

/** Why a row is `unmatched` or `ignored` (README §3.2 ImportRow; spec: import, D4, D5). */
export const RowReason = z.enum(['no_match', 'id_format', 'lossy_numeric_id', 'empty_id', 'no_gateways'])
export type RowReason = z.infer<typeof RowReason>

/** Situation of a channel seen in the analysis (README §4.2 `channels`, §3.2 AccountChannel). */
export const ChannelAssignment = z.enum(['assigned', 'unassigned', 'assigned_to_other_account'])
export type ChannelAssignment = z.infer<typeof ChannelAssignment>

/** What a readiness `missing` item is about (spec: import, D7). */
export const ReadinessField = z.enum(['kind', 'cycle', 'status', 'transactionId', 'transactions', 'confirmation'])
export type ReadinessField = z.infer<typeof ReadinessField>
export const BatchStatus = z.enum(['processed', 'paid', 'undone'])
export type BatchStatus = z.infer<typeof BatchStatus>
export const ChargebackReservePolicy = z.enum(['hold_until_term', 'release_on_chargeback'])
export type ChargebackReservePolicy = z.infer<typeof ChargebackReservePolicy>

export const ValidationCode = z.enum([
  'provider_mismatch',
  'non_recorded_adjustment',
  'duplicate_in_batch',
  'status_collision_in_batch',
  'duplicate_across_batches',
  'status_collision_across_batches',
  'missing_previous_to_batch',
  'missing_in_range',
])
export type ValidationCode = z.infer<typeof ValidationCode>
export const BLOCKING_VALIDATIONS: readonly ValidationCode[] = ['provider_mismatch']

/**
 * Money in the API: decimal string with up to 4 decimals, never number. At most 15 integer digits: what
 * DECIMAL(19,4) holds, so a larger amount is a 400 and not a failed write.
 */
export const Money = z.string().regex(/^-?\d{1,15}(\.\d{1,4})?$/, 'decimal string expected')
export const Percentage = z.string().regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, 'fraction 0..1 expected')

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/** A calendar date (YYYY-MM-DD), checked arithmetically: Date parsing would roll 2026-02-30 over to March. */
function isCalendarDate(value: string): boolean {
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number)
  const last = month === 2 && isLeapYear(year) ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0)
  return day >= 1 && day <= last
}

export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isCalendarDate, 'calendar date expected')

/** Integer id in a path segment (catalogs, users, findings): positive and within SQL Server INT. */
export const IntId = z
  .string()
  .regex(/^\d{1,10}$/)
  .pipe(z.coerce.number<string>().int().positive().max(2_147_483_647))
