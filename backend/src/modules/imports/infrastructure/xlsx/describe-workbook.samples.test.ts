// The reader against the real sample files (data/samples, written by openpyxl) and a workbook saved by Excel desktop.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { describeWorkbook } from './describe-workbook.js'

const SAMPLES = path.resolve(import.meta.dirname, '../../../../../../data/samples')
const TEMPLATE_SHEETS = [
  'APP',
  'DEC',
  'CHB',
  'REF',
  'RDR',
  'RR',
  'Duplicate Corrections',
  'CHB Alerts',
  'Other Fees',
  'Settings',
]
const EXCEL_NATIVE = path.join(SAMPLES, 'excel-real-sample.xlsx')

function read(relative: string) {
  const fileName = path.basename(relative)
  return describeWorkbook(readFileSync(path.join(SAMPLES, relative)), fileName)
}

function rowCounts(workbook: ReturnType<typeof describeWorkbook>) {
  return Object.fromEntries(workbook.sheets.map((s) => [s.name, s.rowCount]))
}

describe('describeWorkbook on data/samples', () => {
  it('batch-clean: ten sheets in workbook order, Settings hidden, row counts and template headers', () => {
    const workbook = read('batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx')

    expect(workbook.sheets.map((s) => s.name)).toEqual(TEMPLATE_SHEETS)
    expect(rowCounts(workbook)).toEqual({
      APP: 340,
      DEC: 110,
      CHB: 3,
      REF: 7,
      RDR: 3,
      RR: 320,
      'Duplicate Corrections': 0,
      'CHB Alerts': 0,
      'Other Fees': 2,
      Settings: 21,
    })
    for (const name of ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR']) {
      const sheet = workbook.sheets.find((s) => s.name === name)
      expect(sheet?.headers, name).toEqual(['ID', 'Amount', 'Currency'])
      expect(sheet?.hidden, name).toBe(false)
      expect(sheet?.columnStats[0], name).toMatchObject({ numericCells: 0, lossyNumericCells: 0 })
    }
    const settings = workbook.sheets.find((s) => s.name === 'Settings')
    expect(settings?.hidden).toBe(true)
    expect(settings?.headers).toEqual(['Chargeback Alert Fee Types', 'Column B', 'Non-Transactional Fees'])
    expect(workbook.sheets.find((s) => s.name === 'Other Fees')?.headers).toEqual(['Type of Fee', 'Amount', 'Currency'])
    expect(workbook.sheets.find((s) => s.name === 'Duplicate Corrections')?.headers).toEqual(['ID', 'Status', 'Amount'])
    expect(workbook.sheets.find((s) => s.name === 'CHB Alerts')?.headers).toEqual(['ID', 'Type of Fee'])
  })

  it('batch-clean: preview values are the raw text of the file, IDs as text, amounts as Excel stored them', () => {
    const workbook = read('batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx')
    const app = workbook.sheets.find((s) => s.name === 'APP')
    const chb = workbook.sheets.find((s) => s.name === 'CHB')
    const rr = workbook.sheets.find((s) => s.name === 'RR')

    expect(app?.preview[0]).toEqual(['252570479111759', '16.22', 'USD'])
    expect(app?.preview).toHaveLength(5)
    expect(app?.columnStats[1]?.numericCells).toBe(340)
    expect(app?.columnStats[2]?.distinctValues).toEqual(['USD'])
    expect(app?.columnStats[0]?.distinctValues).toBeNull()
    expect(rr?.preview[0]).toEqual(['605317920155402', '2.27', 'USD'])
    // The leftover =SUM row of the template: empty ID, formula without cached value.
    expect(chb?.preview[2]).toEqual(['', '', ''])
  })

  it('batch-clean: the last APP amount keeps the float text openpyxl wrote (72.09999999999999)', () => {
    const workbook = describeWorkbook(
      readFileSync(path.join(SAMPLES, 'batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx')),
      'batch-clean.xlsx',
      { limits: { previewRows: 1000 } },
    )
    const app = workbook.sheets.find((s) => s.name === 'APP')

    expect(app?.preview.at(-1)).toEqual(['326166282408169', '72.09999999999999', 'USD'])
  })

  it('batch-split: part1 carries E, part2 carries I, R and the batch fees', () => {
    const part1 = read('batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx')
    const part2 = read('batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx')

    expect(part1.sheets.map((s) => s.name)).toEqual(TEMPLATE_SHEETS)
    expect(part2.sheets.map((s) => s.name)).toEqual(TEMPLATE_SHEETS)
    expect(rowCounts(part1)).toMatchObject({ APP: 340, DEC: 110, CHB: 0, REF: 0, RDR: 0, RR: 0, 'Other Fees': 0 })
    expect(rowCounts(part2)).toMatchObject({ APP: 0, DEC: 0, CHB: 3, REF: 7, RDR: 3, RR: 320, 'Other Fees': 2 })
  })

  it('legacy-provider: old sheet and column names, status values per column, CHB 2 present', () => {
    const workbook = read('legacy-provider/Legacy_ProviderC-Alt_batch.xlsx')

    expect(workbook.sheets.map((s) => s.name)).toEqual(['Summary', 'TRX', 'Fail', 'CB'])
    expect(rowCounts(workbook)).toEqual({ Summary: 1, TRX: 60, Fail: 20, CB: 1 })
    for (const name of ['TRX', 'Fail', 'CB']) {
      expect(workbook.sheets.find((s) => s.name === name)?.headers, name).toEqual([
        'Merchant Order No#',
        'Order Status',
        'Amount USD',
      ])
    }
    const statusValues = (name: string) => workbook.sheets.find((s) => s.name === name)?.columnStats[1]?.distinctValues
    expect(statusValues('TRX')).toEqual(['Successful'])
    expect(statusValues('Fail')).toEqual(['Failed'])
    expect(statusValues('CB')).toEqual(['CHB 2'])
    expect(workbook.sheets.find((s) => s.name === 'CB')?.preview[0]).toEqual([
      'df14616d-4b26-4ffb-9984-72717ebff6a6',
      'CHB 2',
      '305.32',
    ])
    expect(workbook.sheets.find((s) => s.name === 'Summary')?.headers).toEqual(['Batch', 'Total'])
  })

  it('batch-issues and batch-blocked are readable', () => {
    expect(rowCounts(read('batch-issues/Recon_Template_ProviderB-Main_batch-issues.xlsx'))).toMatchObject({
      APP: 339,
      DEC: 101,
      REF: 4,
    })
    expect(rowCounts(read('batch-blocked/Recon_Template_ProviderB-Main_batch-blocked.xlsx'))).toMatchObject({
      APP: 21,
      Settings: 21,
    })
  })

  it('a workbook saved by Excel desktop from the template reads like the openpyxl samples', () => {
    expect(existsSync(EXCEL_NATIVE), `${EXCEL_NATIVE} must exist (provided by the team, synthetic data)`).toBe(true)
    const workbook = describeWorkbook(readFileSync(EXCEL_NATIVE), path.basename(EXCEL_NATIVE))

    const names = workbook.sheets.map((s) => s.name)
    for (const name of ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR', 'Other Fees'])
      expect(names, 'sheet present').toContain(name)
    for (const name of ['APP', 'DEC', 'CHB', 'REF', 'RDR', 'RR']) {
      const sheet = workbook.sheets.find((s) => s.name === name)
      expect(sheet?.headers.slice(0, 3), name).toEqual(['ID', 'Amount', 'Currency'])
      expect(sheet?.columnStats[0]?.numericCells, `${name}: IDs pasted as text`).toBe(0)
      for (const row of sheet?.preview ?? []) {
        expect(row[0], `${name}: ID is text`).toMatch(/^\d*$|^[0-9a-f-]{36}$/)
      }
    }
    expect(workbook.sheets.find((s) => s.name === 'Settings')?.hidden).toBe(true)
  })
})
