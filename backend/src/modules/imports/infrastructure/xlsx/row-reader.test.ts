import { describe, expect, it } from 'vitest'
import { FileTooLargeError, FileUnreadableError } from '../../domain/errors.js'
import { describeWorkbook } from './describe-workbook.js'
import { readSheetRows } from './row-reader.js'
import { buildXlsx, type CellInput, type SheetSpec } from './test-support.js'

// Design D3: the same SAX parser in "rows" mode. Every cell is text, rows carry the sheet's own numbering and
// the indexes of numeric cells whose precision was already lost in the file (design D2 of import-upload-mapping).
const HEADER: CellInput[] = ['ID', 'Amount', 'Currency']

function workbook(rows: CellInput[][], sheet: Partial<SheetSpec> = {}, sharedStrings?: string[]): Uint8Array {
  return buildXlsx({ sheets: [{ name: 'APP', rows, ...sheet }], ...(sharedStrings ? { sharedStrings } : {}) })
}

describe('readSheetRows', () => {
  it('returns the headers and one entry per data row, with rowNo taken from the r attribute', () => {
    const bytes = workbook([HEADER, ['1', { v: '10' }, 'USD'], ['2', { v: '20.5' }, 'USD']])

    const result = readSheetRows(bytes, 'a.xlsx', 'APP')

    expect(result.headers).toEqual(['ID', 'Amount', 'Currency'])
    expect(result.rows).toEqual([
      { rowNo: 2, cells: ['1', '10', 'USD'], lossyNumeric: [] },
      { rowNo: 3, cells: ['2', '20.5', 'USD'], lossyNumeric: [] },
    ])
  })

  it('numbers rows sequentially after the last known one when they carry no r attribute', () => {
    const bytes = workbook([HEADER, ['1', { v: '10' }, 'USD'], ['2', { v: '20' }, 'USD']], { noRowRefs: true })

    expect(readSheetRows(bytes, 'a.xlsx', 'APP').rows.map((r) => r.rowNo)).toEqual([2, 3])
  })

  it('skips the header and rows without any cell, keeping the sheet numbering, and fills missing cells with ""', () => {
    const bytes = workbook([HEADER, ['x'], [null, null, null], ['y', null, 'EUR']])

    expect(readSheetRows(bytes, 'a.xlsx', 'APP').rows).toEqual([
      { rowNo: 2, cells: ['x', '', ''], lossyNumeric: [] },
      { rowNo: 4, cells: ['y', '', 'EUR'], lossyNumeric: [] },
    ])
  })

  it('keeps a formula without cached value as "" and still emits the row (the template leftover)', () => {
    const bytes = workbook([HEADER, ['1', { v: '10' }, 'USD'], ['', { f: 'SUM(B2:B2)' }, null]])

    expect(readSheetRows(bytes, 'a.xlsx', 'APP').rows[1]).toEqual({ rowNo: 3, cells: ['', '', ''], lossyNumeric: [] })
  })

  it('flags, by column index, the numeric cells that lost precision in the file', () => {
    const bytes = workbook([
      HEADER,
      [{ v: '12345678901234567' }, { v: '10' }, 'USD'],
      [{ v: '1.2345678901234567E16' }, { v: '10' }, 'USD'],
      [{ v: '4512308877' }, { v: '10' }, 'USD'],
      ['12345678901234567', { v: '10' }, 'USD'],
    ])

    const rows = readSheetRows(bytes, 'a.xlsx', 'APP').rows

    expect(rows.map((r) => r.lossyNumeric)).toEqual([[0], [0], [], []])
    expect(rows.map((r) => r.cells[0])).toEqual([
      '12345678901234567',
      '1.2345678901234567E16',
      '4512308877',
      '12345678901234567',
    ])
  })

  it('reads shared strings and inline strings as text', () => {
    const bytes = workbook([HEADER, ['Hello', { v: '1' }, 'World']], {}, ['Hello'])

    expect(readSheetRows(bytes, 'a.xlsx', 'APP').rows[0]?.cells).toEqual(['Hello', '1', 'World'])
  })

  it('reads the requested sheet of a multi-sheet workbook', () => {
    const bytes = buildXlsx({
      sheets: [
        { name: 'APP', rows: [HEADER, ['1', { v: '10' }, 'USD']] },
        { name: 'DEC', rows: [HEADER, ['2', { v: '20' }, 'USD'], ['3', { v: '30' }, 'USD']] },
      ],
    })

    expect(readSheetRows(bytes, 'a.xlsx', 'DEC').rows.map((r) => r.cells[0])).toEqual(['2', '3'])
  })

  it('throws FileUnreadableError for a sheet that is not in the workbook', () => {
    const bytes = workbook([HEADER, ['1', { v: '10' }, 'USD']])

    expect(() => readSheetRows(bytes, 'a.xlsx', 'Nope')).toThrow(FileUnreadableError)
  })

  it('applies the reading limits like describe() does', () => {
    const bytes = workbook([HEADER, ['1', { v: '10' }, 'USD'], ['2', { v: '20' }, 'USD'], ['3', { v: '30' }, 'USD']])

    expect(() => readSheetRows(bytes, 'a.xlsx', 'APP', { limits: { maxRowsPerSheet: 2 } })).toThrow(FileTooLargeError)
    expect(() => readSheetRows(bytes, 'a.xlsx', 'APP', { limits: { maxInflatedBytes: 100 } })).toThrow(
      FileTooLargeError,
    )
  })

  it('leaves describe() as it was: same counts, nothing retained beyond the preview', () => {
    const data: CellInput[][] = Array.from({ length: 12 }, (_, i) => [String(i), { v: '1' }, 'USD'])
    const bytes = workbook([HEADER, ...data])

    const described = describeWorkbook(bytes, 'a.xlsx').sheets[0]
    const rows = readSheetRows(bytes, 'a.xlsx', 'APP').rows

    expect(described?.rowCount).toBe(12)
    expect(described?.preview).toHaveLength(5)
    expect(described).not.toHaveProperty('rows')
    expect(rows).toHaveLength(12)
  })
})
