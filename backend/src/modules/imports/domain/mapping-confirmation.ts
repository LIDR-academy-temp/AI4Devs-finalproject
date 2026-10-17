// The confirmed mapping (README §3.2 ImportSheetColumnMap, HU1 CA4; spec "Confirmación del pareo", "Forma del pareo
// confirmado"): structural validation of what the analyst sends, and the effective mapping of a sheet (confirmed
// when it exists, the proposal otherwise). Design D6.
import type { Cycle, MappingConfirmation, SheetKind, SheetMappingColumn, SheetMappingInput } from '@recon/shared'
import type { MappingProposal, SheetMappingProposal } from '../../matching/domain/propose-mapping.js'
import { MappingShapeError } from './errors.js'

/** What the import knows of a sheet, for validation: its id, name and header. */
export interface SheetFacts {
  sheetId: string
  sheetName: string
  headers: string[]
}

export interface ValidatedSheetMapping extends SheetFacts {
  kind: SheetKind
  cycle: Cycle | null
  statusId: number | null
  columns: SheetMappingColumn[]
}

/** The mapping that governs a sheet right now. `kind` is null only for an unconfirmed sheet without proposal. */
export interface EffectiveMapping {
  kind: SheetKind | null
  cycle: Cycle | null
  statusId: number | null
  columns: SheetMappingColumn[]
  source: 'confirmed' | 'proposed'
}

/** Not resolved to a gateway yet (decision 3 of the proposal review): accepted nowhere until the README says how. */
const UNSUPPORTED_TARGET = 'gateway'

/**
 * Checks the body against the import: every sheet once, columns in the header, one target per column kind,
 * cycle and status coherent with the kind. Completeness (ID, status) is readiness, not a 400.
 */
export function validateMappingConfirmation(input: MappingConfirmation, sheets: SheetFacts[]): ValidatedSheetMapping[] {
  const byId = new Map(input.sheets.map((s) => [s.sheetId, s]))
  const known = new Set(sheets.map((s) => s.sheetId))
  for (const sheet of input.sheets) {
    if (!known.has(sheet.sheetId)) {
      throw new MappingShapeError(`Sheet ${sheet.sheetId} does not belong to this import`, { sheetId: sheet.sheetId })
    }
  }
  if (byId.size !== input.sheets.length) {
    const repeated = input.sheets.find((s, i) => input.sheets.findIndex((o) => o.sheetId === s.sheetId) !== i)
    throw new MappingShapeError(`Sheet ${repeated?.sheetId} appears more than once`, {
      sheetId: repeated?.sheetId ?? null,
    })
  }
  return sheets.map((facts) => {
    const sheet = byId.get(facts.sheetId)
    if (!sheet) {
      throw new MappingShapeError(`Sheet "${facts.sheetName}" is missing from the confirmation`, {
        sheetId: facts.sheetId,
        sheetName: facts.sheetName,
      })
    }
    return validateSheet(sheet, facts)
  })
}

function validateSheet(sheet: SheetMappingInput, facts: SheetFacts): ValidatedSheetMapping {
  const at = { sheetId: facts.sheetId, sheetName: facts.sheetName }
  const headers = new Set(facts.headers)
  const targets = new Set<string>()
  for (const column of sheet.columns) {
    if (!headers.has(column.sourceColumn)) {
      throw new MappingShapeError(
        `Column "${column.sourceColumn}" is not in the header of sheet "${facts.sheetName}"`,
        {
          ...at,
          sourceColumn: column.sourceColumn,
        },
      )
    }
    if (column.targetField === UNSUPPORTED_TARGET) {
      throw new MappingShapeError(`Target field "${column.targetField}" is not supported in this version`, {
        ...at,
        sourceColumn: column.sourceColumn,
        targetField: column.targetField,
      })
    }
    if (targets.has(column.targetField)) {
      throw new MappingShapeError(
        `Target field "${column.targetField}" is mapped more than once in sheet "${facts.sheetName}"`,
        {
          ...at,
          targetField: column.targetField,
        },
      )
    }
    targets.add(column.targetField)
  }
  if (sheet.kind === 'transactions') {
    if (sheet.cycle === null) {
      throw new MappingShapeError(`Sheet "${facts.sheetName}" is a transactions sheet without a cycle`, {
        ...at,
        field: 'cycle',
      })
    }
    if (sheet.cycle === 'R' && sheet.statusId !== null) {
      throw new MappingShapeError(`Sheet "${facts.sheetName}" is a reserve (R) sheet: it has no status`, {
        ...at,
        field: 'statusId',
      })
    }
  } else {
    if (sheet.cycle !== null) {
      throw new MappingShapeError(`Sheet "${facts.sheetName}" is ${sheet.kind}: it has no cycle`, {
        ...at,
        field: 'cycle',
      })
    }
    if (sheet.statusId !== null) {
      throw new MappingShapeError(`Sheet "${facts.sheetName}" is ${sheet.kind}: it has no statusId`, {
        ...at,
        field: 'statusId',
      })
    }
  }
  return { ...facts, kind: sheet.kind, cycle: sheet.cycle, statusId: sheet.statusId, columns: sheet.columns }
}

/** A confirmation body that accepts a proposal as it stands (tests, Bruno). Throws when a sheet has no proposal. */
export function confirmationFromProposal(sheets: SheetFacts[], proposal: MappingProposal): MappingConfirmation {
  return {
    sheets: sheets.map((facts, index) => {
      const proposed = proposal.sheets[index]
      if (!proposed || proposed.proposed.kind === null) {
        throw new Error(`sheet "${facts.sheetName}" has no proposal; classify it before confirming`)
      }
      return {
        sheetId: facts.sheetId,
        kind: proposed.proposed.kind,
        cycle: proposed.proposed.cycle,
        statusId: proposed.proposed.statusId,
        columns: proposedColumns(proposed),
      }
    }),
  }
}

function proposedColumns(proposed: SheetMappingProposal): SheetMappingColumn[] {
  const columns: SheetMappingColumn[] = []
  for (const column of proposed.columns) {
    if (column.targetField !== null)
      columns.push({ sourceColumn: column.sourceColumn, targetField: column.targetField })
  }
  return columns
}

export interface EffectiveMappingInput {
  mappingConfirmed: boolean
  confirmed: Pick<ValidatedSheetMapping, 'kind' | 'cycle' | 'statusId' | 'columns'> | null
  proposed: SheetMappingProposal
}

/** The confirmed mapping governs once it exists (matching spec "Pareo confirmado es la fuente de verdad"). */
export function effectiveMapping({ mappingConfirmed, confirmed, proposed }: EffectiveMappingInput): EffectiveMapping {
  if (mappingConfirmed && confirmed !== null) return { ...confirmed, source: 'confirmed' }
  return {
    kind: proposed.proposed.kind,
    cycle: proposed.proposed.cycle,
    statusId: proposed.proposed.statusId,
    columns: proposedColumns(proposed),
    source: 'proposed',
  }
}
