// Batch fees prefilled from the `Other Fees` sheet (README §1.2, §4.2 `batchFees`; spec "Fees por batch prellenados
// desde la hoja de fees"): each row resolved against the fee type catalog by title or code. Design D10.
import type { BatchFeeProposal, SheetMappingColumn, TargetField } from '@recon/shared'
import { parseMoney } from './money.js'
import type { SheetRow } from './workbook.js'

export interface FeeTypeRef {
  feeTypeId: number
  code: string
  title: string
}

/** A batch_fees sheet with its rows and confirmed columns. */
export interface BatchFeeSheet {
  headers: string[]
  rows: SheetRow[]
  columns: SheetMappingColumn[]
}

const UNKNOWN_TYPE = 'Fee type not in the catalog; kept as a free amount'
const CURRENCY = /^[A-Za-z]{3}$/

const normalize = (text: string) => text.trim().toLowerCase()

export function prefillBatchFees(sheets: BatchFeeSheet[], feeTypes: FeeTypeRef[]): BatchFeeProposal[] {
  const byName = new Map<string, FeeTypeRef>()
  for (const feeType of feeTypes) {
    byName.set(normalize(feeType.title), feeType)
    byName.set(normalize(feeType.code), feeType)
  }
  const fees: BatchFeeProposal[] = []
  for (const sheet of sheets) {
    const index = (field: TargetField) => {
      const column = sheet.columns.find((c) => c.targetField === field)
      return column === undefined ? -1 : sheet.headers.indexOf(column.sourceColumn)
    }
    const typeIndex = index('feeType')
    const amountIndex = index('amount')
    const currencyIndex = index('currency')
    for (const row of sheet.rows) {
      const typeText = (typeIndex < 0 ? '' : (row.cells[typeIndex] ?? '')).trim()
      const amountText = (amountIndex < 0 ? '' : (row.cells[amountIndex] ?? '')).trim()
      if (typeText === '' && amountText === '') continue
      const warnings: string[] = []
      const feeType = byName.get(normalize(typeText))
      if (!feeType) warnings.push(UNKNOWN_TYPE)
      const amount = amountText === '' ? null : parseMoney(amountText)
      if (amountText !== '' && amount === null) warnings.push(`Amount "${amountText}" could not be read as a number`)
      const currencyText = (currencyIndex < 0 ? '' : (row.cells[currencyIndex] ?? '')).trim()
      const currency = CURRENCY.test(currencyText) ? currencyText.toUpperCase() : null
      fees.push({
        feeTypeId: feeType?.feeTypeId ?? null,
        code: feeType?.code ?? null,
        title: feeType?.title ?? typeText,
        amount,
        currency,
        source: 'file',
        ...(warnings.length > 0 ? { warning: warnings.join('; ') } : {}),
      })
    }
  }
  return fees
}
