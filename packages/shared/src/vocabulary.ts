// Fixed vocabulary from the README (CLAUDE.md "Vocabulario fijo") and the scalar formats of the API (README §4).
import { z } from 'zod'

export const Cycle = z.enum(['E', 'I', 'R'])
export type Cycle = z.infer<typeof Cycle>

export const TransactionStatusCode = z.enum(['Pending', 'Successful', 'Declined', 'Chargeback', 'Refund', 'RDR'])
export type TransactionStatusCode = z.infer<typeof TransactionStatusCode>

export const SheetKind = z.enum(['transactions', 'batch_fees', 'ignore'])
export const MatchResult = z.enum(['matched', 'unmatched', 'ambiguous', 'ignored'])
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
export const ImportStatus = z.enum(['uploaded', 'mapped', 'analyzed', 'validated', 'processed', 'cancelled'])
export const BatchStatus = z.enum(['processed', 'paid', 'undone'])
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

/** Money in the API: decimal string with up to 4 decimals, never number. */
export const Money = z.string().regex(/^-?\d+(\.\d{1,4})?$/, 'decimal string expected')
export const Percentage = z.string().regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, 'fraction 0..1 expected')
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Integer id in a path segment (catalogs, users, findings): positive and within SQL Server INT. */
export const IntId = z
  .string()
  .regex(/^\d{1,10}$/)
  .pipe(z.coerce.number<string>().int().positive().max(2_147_483_647))
