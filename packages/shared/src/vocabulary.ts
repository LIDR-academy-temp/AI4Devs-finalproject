// Fixed vocabulary from the README (CLAUDE.md "Vocabulario fijo") and the scalar formats of the API (README §4).
import { z } from 'zod'

export const Cycle = z.enum(['E', 'I', 'R'])
export type Cycle = z.infer<typeof Cycle>

export const TransactionStatusCode = z.enum(['Pending', 'Successful', 'Declined', 'Chargeback', 'Refund', 'RDR'])
export type TransactionStatusCode = z.infer<typeof TransactionStatusCode>

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

/** Per-row warnings of the analysis, counted per code in `analysis.warnings` (README §1.2 "Importes…", spec "Resumen del análisis"). */
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

/** Why a row is `unmatched` or `ignored` (README §3.2 ImportRow; spec "Resultado del cruce", "Filas sin ID se ignoran"). */
export const RowReason = z.enum(['no_match', 'id_format', 'lossy_numeric_id', 'empty_id', 'no_gateways'])
export type RowReason = z.infer<typeof RowReason>

/** Situation of a channel seen in the analysis (README §4.2 `channels`, §3.2 AccountChannel). */
export const ChannelAssignment = z.enum(['assigned', 'unassigned', 'assigned_to_other_account'])
export type ChannelAssignment = z.infer<typeof ChannelAssignment>

/** What a readiness `missing` item is about (spec "Readiness de la propuesta", "Precondiciones del análisis"). */
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

/** Money in the API: decimal string with up to 4 decimals, never number. */
export const Money = z.string().regex(/^-?\d+(\.\d{1,4})?$/, 'decimal string expected')
export const Percentage = z.string().regex(/^(0(\.\d{1,6})?|1(\.0{1,6})?)$/, 'fraction 0..1 expected')
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Integer id in a path segment (catalogs, users, findings): positive and within SQL Server INT. */
export const IntId = z
  .string()
  .regex(/^\d{1,10}$/)
  .pipe(z.coerce.number<string>().int().positive().max(2_147_483_647))
