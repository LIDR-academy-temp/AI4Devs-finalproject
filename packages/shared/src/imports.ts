// Response and query schemas of the import API (README §3.2 "Importación", §4.2, §4.4 rows Importación).
import { z } from 'zod'
import { UserRef } from './auth.js'
import { Cycle, ImportStatus, SheetKind, TargetField } from './vocabulary.js'

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

export const ImportSheetDetail = z.object({
  sheetId: z.uuid(),
  sheetName: z.string(),
  hidden: z.boolean(),
  rowCount: z.number().int().nonnegative(),
  proposed: SheetProposal,
  columns: z.array(ColumnProposal),
  /** First rows as `header → text`; every cell is a string, never a JSON number. */
  preview: z.array(z.record(z.string(), z.string())),
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

/** README §4.2: the import with its files, sheets, mapping proposal, preview and readiness. */
export const ImportDetail = ImportSummary.extend({
  files: z.array(ImportFileDetail),
  readiness: Readiness,
})
export type ImportDetail = z.infer<typeof ImportDetail>

export const ImportsQuery = z.object({
  status: ImportStatus.optional(),
})
export type ImportsQuery = z.infer<typeof ImportsQuery>
