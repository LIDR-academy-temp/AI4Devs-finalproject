// Response and query schemas of the import API (README §3.2 "Importación", §4.2, §4.4 rows Importación).
import { z } from 'zod'
import { UserRef } from './auth.js'
import { AccountRef } from './catalog.js'
import {
  ChannelAssignment,
  Cycle,
  ImportStatus,
  MatchResult,
  Money,
  ReadinessField,
  RowReason,
  SheetKind,
  TargetField,
  WarningCode,
} from './vocabulary.js'

/** Internal ids are BIGINT (README §4): they travel as decimal strings, never as JSON numbers. */
const BigIntId = z.string().regex(/^\d+$/)

/** Where a proposal came from: a rule of the account's rule set, a global rule, or no rule at all. */
export const ProposalSource = z.enum(['account', 'global', 'none'])
export type ProposalSource = z.infer<typeof ProposalSource>

/** A distinct value of a column proposed as `status`, resolved through the global aliases. */
export const StatusValue = z.object({
  value: z.string(),
  statusId: z.number().int().nullable(),
  statusName: z.string().nullable(),
  excludeAmount: z.boolean(),
})
export type StatusValue = z.infer<typeof StatusValue>

/** What the rules propose for a sheet; everything null with `source = none` when no rule matches. */
export const SheetProposal = z.object({
  kind: SheetKind.nullable(),
  cycle: Cycle.nullable(),
  statusId: z.number().int().nullable(),
  statusName: z.string().nullable(),
  source: ProposalSource,
  note: z.string().optional(),
})
export type SheetProposal = z.infer<typeof SheetProposal>

export const ColumnProposal = z.object({
  sourceColumn: z.string(),
  targetField: TargetField.nullable(),
  source: ProposalSource,
  /** Only for columns proposed as `status`. */
  statusValues: z.array(StatusValue).optional(),
})
export type ColumnProposal = z.infer<typeof ColumnProposal>

/** A confirmed column: `sourceColumn` must be a header of the sheet; columns left out are kept as reference data. */
export const SheetMappingColumn = z.object({
  sourceColumn: z.string().min(1),
  targetField: TargetField,
})
export type SheetMappingColumn = z.infer<typeof SheetMappingColumn>

/** The confirmed mapping of a sheet as the detail returns it (spec "Confirmación del pareo"). */
export const SheetMapping = z.object({
  kind: SheetKind,
  cycle: Cycle.nullable(),
  statusId: z.number().int().nullable(),
  statusName: z.string().nullable(),
  columns: z.array(SheetMappingColumn),
})
export type SheetMapping = z.infer<typeof SheetMapping>

/** One sheet of the `PUT /imports/{id}/mapping` body. */
export const SheetMappingInput = z.object({
  sheetId: z.uuid(),
  kind: SheetKind,
  cycle: Cycle.nullable(),
  statusId: z.number().int().nullable(),
  columns: z.array(SheetMappingColumn),
})
export type SheetMappingInput = z.infer<typeof SheetMappingInput>

/** Body of `PUT /imports/{id}/mapping`: every sheet of the import (spec "Forma del pareo confirmado"). */
export const MappingConfirmation = z.object({
  sheets: z.array(SheetMappingInput).min(1),
})
export type MappingConfirmation = z.infer<typeof MappingConfirmation>

export const ImportSheetDetail = z.object({
  sheetId: z.uuid(),
  sheetName: z.string(),
  hidden: z.boolean(),
  rowCount: z.number().int().nonnegative(),
  proposed: SheetProposal,
  columns: z.array(ColumnProposal),
  /** First rows as `header → text`; every cell is a string, never a JSON number. */
  preview: z.array(z.record(z.string(), z.string())),
  mappingConfirmed: z.boolean(),
  /** The confirmed mapping; null until the analyst confirms (the proposal stays as reference). */
  mapping: SheetMapping.nullable(),
})
export type ImportSheetDetail = z.infer<typeof ImportSheetDetail>

export const ImportFileDetail = z.object({
  fileId: z.uuid(),
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  uploadedAt: z.iso.datetime(),
  sheets: z.array(ImportSheetDetail),
})
export type ImportFileDetail = z.infer<typeof ImportFileDetail>

export const ReadinessItem = z.object({
  sheetId: z.uuid().nullable(),
  sheetName: z.string().nullable(),
  message: z.string(),
  /** On `missing` items: which field is lacking (spec "Precondiciones del análisis"). */
  field: ReadinessField.optional(),
})
export type ReadinessItem = z.infer<typeof ReadinessItem>

/** Whether the mapping as it stands satisfies the analysis preconditions (`missing`) and what to review (`notes`). */
export const Readiness = z.object({
  canAnalyze: z.boolean(),
  missing: z.array(ReadinessItem),
  notes: z.array(ReadinessItem),
})
export type Readiness = z.infer<typeof Readiness>

export const ImportSummary = z.object({
  importId: z.uuid(),
  accountId: z.uuid(),
  status: ImportStatus,
  createdBy: UserRef,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  analyzedAt: z.iso.datetime().nullable(),
  rowsTotal: z.number().int().nullable(),
  rowsMatched: z.number().int().nullable(),
  rowsUnmatched: z.number().int().nullable(),
  currentBatchId: z.uuid().nullable(),
  fileCount: z.number().int().nonnegative(),
})
export type ImportSummary = z.infer<typeof ImportSummary>

const nonNegativeInt = z.number().int().nonnegative()

export const AnalysisRows = z.object({
  total: nonNegativeInt,
  matched: nonNegativeInt,
  unmatched: nonNegativeInt,
  ambiguous: nonNegativeInt,
  ignored: nonNegativeInt,
})
export type AnalysisRows = z.infer<typeof AnalysisRows>

/** Rows not ignored, per cycle. */
export const AnalysisByCycle = z.object({ E: nonNegativeInt, I: nonNegativeInt, R: nonNegativeInt })
export type AnalysisByCycle = z.infer<typeof AnalysisByCycle>

/** One count per warning code; zeros are explicit (the record is exhaustive). */
export const AnalysisWarnings = z.record(WarningCode, nonNegativeInt)
export type AnalysisWarnings = z.infer<typeof AnalysisWarnings>

/** Spec "Resumen del análisis": derived from the persisted rows. */
export const AnalysisSummary = z.object({
  rows: AnalysisRows,
  byCycle: AnalysisByCycle,
  warnings: AnalysisWarnings,
})
export type AnalysisSummary = z.infer<typeof AnalysisSummary>

/** README §4.2 `channels`: a channel of the matched transactions and its assignment (spec "Aviso de canales"). */
export const ChannelNotice = z.object({
  channelId: z.number().int(),
  name: z.string(),
  gatewayId: z.number().int(),
  providerId: z.number().int(),
  rowCount: nonNegativeInt,
  assignment: ChannelAssignment,
  /** The current primary account when `assignment = assigned_to_other_account`. */
  otherAccount: AccountRef.nullable(),
  note: z.string().nullable(),
})
export type ChannelNotice = z.infer<typeof ChannelNotice>

/** README §4.2 `batchFees`: a row of the batch fees sheet resolved against the fee type catalog. */
export const BatchFeeProposal = z.object({
  feeTypeId: z.number().int().nullable(),
  code: z.string().nullable(),
  title: z.string(),
  amount: Money.nullable(),
  currency: z.string().nullable(),
  source: z.literal('file'),
  warning: z.string().optional(),
})
export type BatchFeeProposal = z.infer<typeof BatchFeeProposal>

/** README §4.2: the import with its files, sheets, mapping proposal and confirmation, preview, readiness and, once analyzed, the analysis. */
export const ImportDetail = ImportSummary.extend({
  files: z.array(ImportFileDetail),
  readiness: Readiness,
  /** null until the import is analyzed. */
  analysis: AnalysisSummary.nullable(),
  channels: z.array(ChannelNotice).nullable(),
  batchFees: z.array(BatchFeeProposal).nullable(),
})
export type ImportDetail = z.infer<typeof ImportDetail>

export const ImportsQuery = z.object({
  status: ImportStatus.optional(),
})
export type ImportsQuery = z.infer<typeof ImportsQuery>

/** A transaction an ambiguous row could be (spec "Resultado del cruce"). */
export const RowCandidate = z.object({
  gatewayId: z.number().int(),
  gatewayName: z.string(),
  transactionId: BigIntId,
  channelId: z.number().int(),
  channelName: z.string(),
  statusId: z.number().int(),
  statusName: z.string(),
  amount: Money,
})
export type RowCandidate = z.infer<typeof RowCandidate>

/** The transaction a matched row is linked to. */
export const ImportRowTransaction = z.object({
  transactionId: BigIntId,
  channelId: z.number().int(),
  channelName: z.string(),
  statusId: z.number().int(),
  statusName: z.string(),
  amount: Money,
  transactionDate: z.iso.datetime(),
})
export type ImportRowTransaction = z.infer<typeof ImportRowTransaction>

/** Spec "Filas del import": one persisted row with what the analysis resolved and the original cells. */
export const ImportRowItem = z.object({
  fileId: z.uuid(),
  fileName: z.string(),
  sheetId: z.uuid(),
  sheetName: z.string(),
  rowNo: z.number().int().positive(),
  cycle: Cycle,
  matchResult: MatchResult,
  reason: RowReason.nullable(),
  transactionIdRaw: z.string().nullable(),
  transactionId: BigIntId.nullable(),
  gatewayId: z.number().int().nullable(),
  statusRaw: z.string().nullable(),
  statusId: z.number().int().nullable(),
  statusName: z.string().nullable(),
  amount: Money.nullable(),
  currency: z.string().nullable(),
  excludeAmount: z.boolean(),
  ignore: z.boolean(),
  warnings: z.array(WarningCode),
  /** Empty unless the row is ambiguous. */
  candidates: z.array(RowCandidate),
  transaction: ImportRowTransaction.nullable(),
  /** The whole original row as `header → text`. */
  rawData: z.record(z.string(), z.string()),
})
export type ImportRowItem = z.infer<typeof ImportRowItem>

export const ImportRowsQuery = z.object({
  match: MatchResult.optional(),
  sheetId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
})
export type ImportRowsQuery = z.infer<typeof ImportRowsQuery>

export const ImportRowsPage = z.object({
  items: z.array(ImportRowItem),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: nonNegativeInt,
})
export type ImportRowsPage = z.infer<typeof ImportRowsPage>

/** Body of `PATCH /imports/{id}/rows/{sheetId}/{rowNo}` (spec "Resolución de una fila ambigua"). */
export const ResolveRowBody = z.object({
  gatewayId: z.number().int().positive(),
})
export type ResolveRowBody = z.infer<typeof ResolveRowBody>
