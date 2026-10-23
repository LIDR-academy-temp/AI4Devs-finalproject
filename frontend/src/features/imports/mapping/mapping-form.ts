// The mapping form (design D5): values per sheet, the shape rules of the PUT replicated on the client, and the
// conversion to the confirmation body. Columns are kept in header order, keyed by sheetId and position.
import { type Cycle, type SheetKind, SheetMappingInput, TargetField, TRANSACTION_STATUSES } from '@recon/shared'
import { z } from 'zod'
import type { ImportDetail, ImportSheet, MappingConfirmationBody } from '@/lib/api/types'
import { strings } from '../strings'
import { fieldLabel, fieldsFor } from './field-options'

export interface ColumnForm {
  sourceColumn: string
  targetField: TargetField | null
}

export interface SheetForm {
  kind: SheetKind | null
  cycle: Cycle | null
  statusId: number | null
  columns: ColumnForm[]
}

export interface MappingValues {
  sheets: Record<string, SheetForm>
}

/** The mapping that governs a sheet: the confirmed one once it exists, the proposal before. */
export function sheetFormOf(sheet: ImportSheet): SheetForm {
  if (sheet.mappingConfirmed && sheet.mapping) {
    const { kind, cycle, statusId, columns } = sheet.mapping
    return {
      kind,
      cycle,
      statusId,
      columns: sheet.columns.map((c) => ({
        sourceColumn: c.sourceColumn,
        targetField: columns.find((m) => m.sourceColumn === c.sourceColumn)?.targetField ?? null,
      })),
    }
  }
  const { kind, cycle, statusId } = sheet.proposed
  return {
    kind,
    cycle,
    statusId,
    columns: sheet.columns.map((c) => ({ sourceColumn: c.sourceColumn, targetField: c.targetField })),
  }
}

export function valuesFromDetail(detail: ImportDetail): MappingValues {
  return {
    sheets: Object.fromEntries(detail.files.flatMap((f) => f.sheets).map((s) => [s.sheetId, sheetFormOf(s)])),
  }
}

/** The ids of the sheets the import has now. */
export function sheetIdsOf(detail: ImportDetail): Set<string> {
  return new Set(detail.files.flatMap((f) => f.sheets.map((s) => s.sheetId)))
}

/** The form values of the given sheets only: a sheet of a removed file is not part of the mapping any more. */
export function onlySheets(values: MappingValues, ids: Set<string>): MappingValues {
  return { sheets: Object.fromEntries(Object.entries(values.sheets).filter(([id]) => ids.has(id))) }
}

/** The body of `PUT mapping`: every sheet of the import, only the columns with a field, none in ignored sheets. */
export function toMappingConfirmation(values: MappingValues, detail: ImportDetail): MappingConfirmationBody {
  return {
    sheets: detail.files
      .flatMap((f) => f.sheets)
      .map((sheet) => {
        const form = values.sheets[sheet.sheetId] ?? sheetFormOf(sheet)
        // The schema requires a type before the confirmation: a sheet without one is a bug, never an ignored sheet.
        const kind = form.kind
        if (kind === null) throw new Error(`Sheet "${sheet.sheetName}" has no type`)
        const transactions = kind === 'transactions'
        return {
          sheetId: sheet.sheetId,
          kind,
          cycle: transactions ? form.cycle : null,
          statusId: transactions && form.cycle !== 'R' ? form.statusId : null,
          columns:
            kind === 'ignore'
              ? []
              : form.columns.flatMap((c) =>
                  c.targetField ? [{ sourceColumn: c.sourceColumn, targetField: c.targetField }] : [],
                ),
        }
      }),
  }
}

/** A new type keeps only the fields that type takes; batch fees and ignore have no cycle nor status. */
export function changeKind(sheet: SheetForm, kind: SheetKind): SheetForm {
  const allowed = fieldsFor(kind)
  const transactions = kind === 'transactions'
  return {
    kind,
    cycle: transactions ? sheet.cycle : null,
    statusId: transactions ? sheet.statusId : null,
    columns: sheet.columns.map((c) => ({
      ...c,
      targetField: c.targetField && (allowed as readonly string[]).includes(c.targetField) ? c.targetField : null,
    })),
  }
}

const SheetFormSchema = z
  .object({
    kind: SheetMappingInput.shape.kind.nullable(),
    cycle: SheetMappingInput.shape.cycle,
    statusId: SheetMappingInput.shape.statusId,
    columns: z.array(z.object({ sourceColumn: z.string(), targetField: TargetField.nullable() })),
  })
  .superRefine((sheet, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })
    if (sheet.kind === null) issue(['kind'], strings.mapping.errors.kind)
    if (sheet.kind === 'transactions') {
      if (sheet.cycle === null) issue(['cycle'], strings.mapping.errors.cycle)
      else if (sheet.cycle === 'R' && sheet.statusId !== null) issue(['statusId'], strings.mapping.errors.reserveStatus)
    } else if (sheet.kind !== null) {
      if (sheet.cycle !== null) issue(['cycle'], strings.mapping.errors.noCycle)
      if (sheet.statusId !== null) issue(['statusId'], strings.mapping.errors.noStatus)
    }
    if (sheet.kind === 'ignore') return
    sheet.columns.forEach((column, index) => {
      if (column.targetField === null) return
      const twice = sheet.columns.filter((c) => c.targetField === column.targetField).length > 1
      if (twice) issue(['columns', index, 'targetField'], strings.mapping.errors.twice(fieldLabel(column.targetField)))
    })
  })

/** The shape rules of the confirmation (spec "Forma del pareo confirmado"), with the sheet and columns concerned. */
export const mappingSchema = z.object({ sheets: z.record(z.string(), SheetFormSchema) })

const sourceText = (source: ImportSheet['proposed']['source']) =>
  source === 'account' ? strings.mapping.accountRule : strings.mapping.globalRule

/** What the rules propose for a sheet, in the analyst's words (design D5). */
export function proposalLabel(proposed: ImportSheet['proposed']): string {
  if (proposed.kind === null || proposed.source === 'none') return strings.mapping.noProposal
  const origin = ` — ${sourceText(proposed.source)}`
  if (proposed.kind === 'batch_fees') return `Proposed: batch fees${origin}`
  if (proposed.kind === 'ignore') return `Proposed: ignore${origin}`
  return `Proposed: ${mappingText(proposed.cycle, proposed.statusName)}${origin}`
}

/** `<cycle> · <status>` of a transactions sheet. */
export function mappingText(cycle: Cycle | null, statusName: string | null): string {
  if (cycle === 'R') return 'R · reserve, no status'
  return `${cycle ?? '?'} · ${statusName ?? 'status from column'}`
}

/** The confirmed mapping of a sheet, shown next to the proposal. */
export function confirmedLabel(mapping: NonNullable<ImportSheet['mapping']>): string {
  if (mapping.kind === 'batch_fees') return 'Confirmed: batch fees'
  if (mapping.kind === 'ignore') return 'Confirmed: ignore'
  return `Confirmed: ${mapping.cycle === 'R' ? 'R · reserve' : mappingText(mapping.cycle, mapping.statusName)}`
}

/** Options of the fixed status: the shared catalog (design D6); `null` is "From column". */
export const statusOptions = TRANSACTION_STATUSES.map((s) => ({ statusId: s.statusId, label: s.name }))
