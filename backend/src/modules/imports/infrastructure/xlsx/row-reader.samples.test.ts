// The rows reader against the real sample files (data/samples) and the workbook saved by Excel desktop.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { readSheetRows } from './row-reader.js'

const SAMPLES = path.resolve(import.meta.dirname, '../../../../../../data/samples')
const BATCH_CLEAN = 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'
const BATCH_ISSUES = 'batch-issues/Recon_Template_ProviderB-Main_batch-issues.xlsx'
const BATCH_BLOCKED = 'batch-blocked/Recon_Template_ProviderB-Main_batch-blocked.xlsx'
const LEGACY = 'legacy-provider/Legacy_ProviderC-Alt_batch.xlsx'
const EXCEL_NATIVE = 'excel-real/excel-real-sample.xlsx'
const TRANSACTION_SHEETS = ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR']

const cache = new Map<string, Uint8Array>()

function bytes(relative: string): Uint8Array {
  let data = cache.get(relative)
  if (!data) {
    data = readFileSync(path.join(SAMPLES, relative))
    cache.set(relative, data)
  }
  return data
}

function rows(relative: string, sheetName: string) {
  return readSheetRows(bytes(relative), path.basename(relative), sheetName).rows
}

function transactionRows(relative: string): number {
  return TRANSACTION_SHEETS.reduce((sum, name) => sum + rows(relative, name).length, 0)
}

describe('readSheetRows on data/samples', () => {
  it('batch-clean APP: 340 rows numbered 2…341, IDs as text, the raw Excel double kept as written', () => {
    const app = rows(BATCH_CLEAN, 'APP')

    expect(app).toHaveLength(340)
    expect(app[0]).toEqual({ rowNo: 2, cells: ['252570479111759', '16.22', 'USD'], lossyNumeric: [] })
    expect(app.at(-1)?.rowNo).toBe(341)
    expect(app.at(-1)?.cells[1]).toBe('72.09999999999999')
    expect(app.every((r) => r.lossyNumeric.length === 0)).toBe(true)
  })

  it('batch-clean CHB, REF and RDR end with the =SUM() leftover: an empty ID at rows 4, 8 and 4', () => {
    expect(rows(BATCH_CLEAN, 'CHB').at(-1)).toEqual({ rowNo: 4, cells: ['', '', ''], lossyNumeric: [] })
    expect(rows(BATCH_CLEAN, 'REF').at(-1)).toEqual({ rowNo: 8, cells: ['', '', ''], lossyNumeric: [] })
    expect(rows(BATCH_CLEAN, 'RDR').at(-1)).toEqual({ rowNo: 4, cells: ['', '', ''], lossyNumeric: [] })
  })

  it('counts the rows of the five samples as expected.json does (read)', () => {
    expect(transactionRows(BATCH_CLEAN)).toBe(783)
    expect(transactionRows(BATCH_ISSUES)).toBe(772)
    expect(rows(BATCH_BLOCKED, 'APP')).toHaveLength(21)
    expect(rows(LEGACY, 'TRX')).toHaveLength(60)
    expect(rows(LEGACY, 'Fail')).toHaveLength(20)
    expect(rows(LEGACY, 'CB')).toHaveLength(1)
  })

  it('legacy-provider: status texts per sheet and the UUID ids as written', () => {
    const statuses = (name: string) => new Set(rows(LEGACY, name).map((r) => r.cells[1]))

    expect([...statuses('TRX')]).toEqual(['Successful'])
    expect([...statuses('Fail')]).toEqual(['Failed'])
    expect(rows(LEGACY, 'CB')[0]?.cells).toEqual(['df14616d-4b26-4ffb-9984-72717ebff6a6', 'CHB 2', '305.32'])
  })

  it('a workbook saved by Excel desktop reads without error, IDs as text and one numeric ID that lost precision', () => {
    const app = rows(EXCEL_NATIVE, 'APP')

    expect(app).toHaveLength(14)
    expect(app[0]?.cells.slice(0, 3)).toEqual(['403066894472190', '10', 'USD'])
    expect(app.filter((r) => r.lossyNumeric.includes(0))).toHaveLength(1)
  })
})
