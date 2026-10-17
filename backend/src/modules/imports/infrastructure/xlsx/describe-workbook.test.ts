import { strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { FileTooLargeError, FileUnreadableError } from '../../domain/errors.js'
import { describeWorkbook } from './describe-workbook.js'
import { DEFAULT_READ_LIMITS } from './limits.js'
import { buildXlsx, type CellInput, templateRows } from './test-support.js'

const FILE = 'test.xlsx'

function sheetOf(bytes: Uint8Array, name = 'APP', options?: Parameters<typeof describeWorkbook>[2]) {
  const sheet = describeWorkbook(bytes, FILE, options).sheets.find((s) => s.name === name)
  if (!sheet) throw new Error(`sheet ${name} missing`)
  return sheet
}

describe('describeWorkbook: cell text', () => {
  it('resolves shared strings, rich text runs and preserved spaces, and skips phonetic runs', () => {
    const bytes = buildXlsx({
      sharedStrings: [
        'ID',
        { xml: '<si><r><rPr><b/></rPr><t>Amo</t></r><r><t>unt</t></r></si>' },
        { xml: '<si><t xml:space="preserve"> USD </t><rPh sb="0" eb="1"><t>phonetic</t></rPh></si>' },
      ],
      sheets: [
        {
          name: 'APP',
          rows: [
            [
              { t: 's', v: '0' },
              { t: 's', v: '1' },
              { t: 's', v: '2' },
            ],
          ],
        },
      ],
    })

    const sheet = sheetOf(bytes)

    expect(sheet.headers).toEqual(['ID', 'Amount', 'USD'])
  })

  it('reads inline strings, including rich inline runs', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['ID', 'Amount'],
            ['252570479111759', { t: 'inlineStr', innerXml: '<is><r><t>1</t></r><r><t>6.22</t></r></is>' }],
          ],
        },
      ],
    })

    const sheet = sheetOf(bytes)

    expect(sheet.preview).toEqual([['252570479111759', '16.22']])
  })

  it('returns numeric cells as the exact text of the file and counts precision already lost in Excel', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['ID', 'Amount'],
            [{ v: '12345678901234567' }, { v: '16.22' }],
            [{ t: 'n', v: '1.2345678901234567E16' }, { v: '72.09999999999999' }],
            [{ v: '4512308877' }, { v: '25' }],
            [{ v: '1234567890123450' }, { v: '0.5' }],
          ],
        },
      ],
    })

    const sheet = sheetOf(bytes)

    expect(sheet.preview.map((row) => row[0])).toEqual([
      '12345678901234567',
      '1.2345678901234567E16',
      '4512308877',
      '1234567890123450',
    ])
    expect(sheet.preview[1]?.[1]).toBe('72.09999999999999')
    expect(sheet.columnStats[0]).toMatchObject({ numericCells: 4, lossyNumericCells: 3 })
    expect(sheet.columnStats[1]?.numericCells).toBe(4)
  })

  it('does not count text cells as numeric, even when they look like numbers', () => {
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: templateRows(['12345678901234567', '4512308877']) }] })

    const sheet = sheetOf(bytes)

    expect(sheet.columnStats[0]).toMatchObject({ numericCells: 0, lossyNumericCells: 0 })
    expect(sheet.preview[0]?.[0]).toBe('12345678901234567')
  })

  it('renders booleans, errors, formula strings and dates as text', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['A', 'B', 'C', 'D', 'E'],
            [
              { t: 'b', v: '1' },
              { t: 'b', v: '0' },
              { t: 'e', v: '#N/A' },
              { t: 'str', f: 'CONCAT("a","b")', v: 'ab' },
              { t: 'd', v: '2026-10-01T00:00:00' },
            ],
          ],
        },
      ],
    })

    expect(sheetOf(bytes).preview).toEqual([['TRUE', 'FALSE', '#N/A', 'ab', '2026-10-01T00:00:00']])
  })

  it('counts a row whose only content is a formula without cached value, reading the cell as empty text', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'CHB',
          rows: [
            ['ID', 'Amount', 'Currency'],
            ['535044421404059', { v: '46.67' }, 'USD'],
            [{ t: 'inlineStr', innerXml: '<is><t></t></is>' }, { f: 'SUM(B2:B2)' }, null],
          ],
        },
      ],
    })

    const sheet = sheetOf(bytes, 'CHB')

    expect(sheet.rowCount).toBe(2)
    expect(sheet.preview[1]).toEqual(['', '', ''])
  })

  it('ignores rows without any value, text or formula', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          sheetDataXml:
            '<row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c></row><row r="2"><c r="A2" s="1"/></row><row r="3"><c r="A3" t="inlineStr"><is><t>x</t></is></c></row>',
        },
      ],
    })

    expect(sheetOf(bytes).rowCount).toBe(1)
  })

  it('follows rows and cells sequentially when the r attributes are missing', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          noRowRefs: true,
          rows: [
            ['ID', 'Amount'],
            ['1', { v: '2' }],
            ['3', { v: '4' }],
          ],
        },
      ],
    })

    const sheet = sheetOf(bytes)

    expect(sheet.headers).toEqual(['ID', 'Amount'])
    expect(sheet.rowCount).toBe(2)
    expect(sheet.preview).toEqual([
      ['1', '2'],
      ['3', '4'],
    ])
  })
})

describe('describeWorkbook: headers, counts and preview', () => {
  it('names an empty header by its column letter and drops trailing empty headers', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'Settings',
          rows: [
            ['Chargeback Alert Fee Types', '', 'Non-Transactional Fees', '', ''],
            ['x', null, 'y'],
          ],
        },
      ],
    })

    expect(sheetOf(bytes, 'Settings').headers).toEqual([
      'Chargeback Alert Fee Types',
      'Column B',
      'Non-Transactional Fees',
    ])
  })

  it('disambiguates repeated headers, ignoring case and surrounding spaces', () => {
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: [['ID', ' Amount ', 'amount', 'Amount']] }] })

    expect(sheetOf(bytes).headers).toEqual(['ID', 'Amount', 'amount (2)', 'Amount (3)'])
  })

  it('reports a sheet without a header row as having no columns but still counts its rows', () => {
    const bytes = buildXlsx({
      sheets: [{ name: 'APP', sheetDataXml: '<row r="3"><c r="A3" t="inlineStr"><is><t>x</t></is></c></row>' }],
    })

    const sheet = sheetOf(bytes)

    expect(sheet.headers).toEqual([])
    expect(sheet.rowCount).toBe(1)
    expect(sheet.preview).toEqual([[]])
  })

  it('keeps at most five preview rows, aligned to the headers with empty strings for missing cells', () => {
    const rows: CellInput[][] = [['ID', 'Amount', 'Currency']]
    for (let i = 1; i <= 8; i++) rows.push([`${i}`, { v: `${i}.5` }])

    const sheet = sheetOf(buildXlsx({ sheets: [{ name: 'APP', rows }] }))

    expect(sheet.rowCount).toBe(8)
    expect(sheet.preview).toHaveLength(5)
    expect(sheet.preview[0]).toEqual(['1', '1.5', ''])
  })

  it('collects distinct non-empty values per column in order of appearance and gives up above the cap', () => {
    const rows: CellInput[][] = [['Status', 'ID']]
    for (let i = 0; i < 60; i++) rows.push([i % 2 === 0 ? 'CHB 2' : i % 3 === 0 ? '' : 'CHB', `${1000 + i}`])

    const sheet = sheetOf(buildXlsx({ sheets: [{ name: 'CB', rows }] }), 'CB', { limits: { maxDistinctValues: 50 } })

    expect(sheet.columnStats[0]?.distinctValues).toEqual(['CHB 2', 'CHB'])
    expect(sheet.columnStats[1]?.distinctValues).toBeNull()
  })

  it('reports hidden sheets and keeps the order of workbook.xml even when the zip stores sheets first', () => {
    const bytes = buildXlsx({
      order: 'sheets-first',
      sheets: [
        { name: 'APP', rows: templateRows(['1']) },
        { name: 'Settings', hidden: true, rows: [['Chargeback Alert Fee Types'], ['Chargeback Alert Fee']] },
      ],
    })

    const workbook = describeWorkbook(bytes, FILE)

    expect(workbook.sheets.map((s) => [s.name, s.hidden, s.rowCount])).toEqual([
      ['APP', false, 1],
      ['Settings', true, 1],
    ])
  })

  it('reads a package without sharedStrings.xml and one with stored (uncompressed) entries', () => {
    expect(sheetOf(buildXlsx({ sheets: [{ name: 'APP', rows: templateRows(['1', '2']) }] })).rowCount).toBe(2)
    expect(sheetOf(buildXlsx({ level: 0, sheets: [{ name: 'APP', rows: templateRows(['1', '2']) }] })).rowCount).toBe(2)
  })
})

describe('describeWorkbook: unreadable packages', () => {
  it.each([
    { title: 'random bytes', bytes: strToU8('definitely not a zip file at all, just text') },
    {
      title: 'an OLE container (xls or password-protected workbook)',
      bytes: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]),
    },
    {
      title: 'a zip without xl/workbook.xml',
      bytes: buildXlsx({ omit: ['workbook'], sheets: [{ name: 'APP', rows: [] }] }),
    },
    {
      title: 'a zip without [Content_Types].xml',
      bytes: buildXlsx({ omit: ['contentTypes'], sheets: [{ name: 'APP', rows: [] }] }),
    },
    {
      title: 'a workbook whose sheet part is missing',
      bytes: buildXlsx({ omit: ['sheet1'], sheets: [{ name: 'APP', rows: [] }] }),
    },
    { title: 'a workbook without sheets', bytes: buildXlsx({ sheets: [] }) },
    {
      title: 'a sheet with broken XML',
      bytes: buildXlsx({ sheets: [{ name: 'APP', xml: '<worksheet><sheetData><row></worksheet>' }] }),
    },
  ])('rejects $title with FileUnreadableError naming the file', ({ bytes }) => {
    let caught: unknown
    try {
      describeWorkbook(bytes, FILE)
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(FileUnreadableError)
    expect((caught as FileUnreadableError).details).toEqual({ fileName: FILE })
    expect((caught as FileUnreadableError).status).toBe(422)
    expect((caught as FileUnreadableError).code).toBe('file_unreadable')
  })
})

describe('describeWorkbook: limits', () => {
  it('stops inflating a decompression bomb as soon as the inflated bytes exceed the limit', () => {
    const padding = ' '.repeat(64 * 1024 * 1024)
    const bytes = buildXlsx({
      sheets: [
        { name: 'APP', sheetDataXml: `<row r="1"><c r="A1" t="inlineStr"><is><t>ID</t></is></c></row>${padding}` },
      ],
    })
    expect(bytes.length).toBeLessThan(200 * 1024)
    let maxInflated = 0

    let caught: unknown
    try {
      describeWorkbook(bytes, FILE, {
        limits: { maxInflatedBytes: 1024 },
        onInflated: (total) => {
          maxInflated = Math.max(maxInflated, total)
        },
      })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(FileTooLargeError)
    expect((caught as FileTooLargeError).status).toBe(400)
    expect((caught as FileTooLargeError).code).toBe('file_too_large')
    expect((caught as FileTooLargeError).details).toMatchObject({ fileName: FILE })
    // The whole sheet inflates to 64 MiB; stopping early means only the first inflated chunk was ever produced.
    expect(maxInflated).toBeLessThan(8 * 1024 * 1024)
  })

  it('rejects a sheet with more rows than allowed', () => {
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: templateRows(['1', '2', '3', '4', '5']) }] })

    expect(() => describeWorkbook(bytes, FILE, { limits: { maxRowsPerSheet: 3 } })).toThrow(FileTooLargeError)
    expect(() => describeWorkbook(bytes, FILE, { limits: { maxRowsPerSheet: 5 } })).not.toThrow()
  })

  it('rejects a sheet with more columns than allowed', () => {
    const bytes = buildXlsx({
      sheets: [
        {
          name: 'APP',
          rows: [
            ['A', 'B', 'C'],
            ['1', '2', '3'],
          ],
        },
      ],
    })

    expect(() => describeWorkbook(bytes, FILE, { limits: { maxColumns: 2 } })).toThrow(FileTooLargeError)
  })

  it('rejects a package with more entries than allowed', () => {
    const extraEntries: Record<string, Uint8Array> = {}
    for (let i = 0; i < 10; i++) extraEntries[`extra/${i}.xml`] = strToU8('<x/>')
    const bytes = buildXlsx({ sheets: [{ name: 'APP', rows: templateRows(['1']) }], extraEntries })

    expect(() => describeWorkbook(bytes, FILE, { limits: { maxZipEntries: 8 } })).toThrow(FileTooLargeError)
  })

  it('rejects a shared string table larger than allowed', () => {
    const bytes = buildXlsx({ sharedStrings: ['a', 'b', 'c'], sheets: [{ name: 'APP', rows: [['a', 'b', 'c']] }] })

    expect(() => describeWorkbook(bytes, FILE, { limits: { maxSharedStrings: 2 } })).toThrow(FileTooLargeError)
  })
})

describe('describeWorkbook: cell references', () => {
  const header = '<c r="A1" t="inlineStr"><is><t>ID</t></is></c>'

  it('rejects a reference beyond column XFD as unreadable, quickly, even for an empty styled cell', () => {
    const bytes = buildXlsx({
      sheets: [{ name: 'APP', sheetDataXml: `<row r="1">${header}<c r="ZZZZZ1" s="1"/></row>` }],
    })

    const started = performance.now()
    expect(() => describeWorkbook(bytes, FILE)).toThrow(FileUnreadableError)
    expect(performance.now() - started).toBeLessThan(2000)
  })

  it('applies the column limit to every cell, with or without a value', () => {
    const bytes = buildXlsx({ sheets: [{ name: 'APP', sheetDataXml: `<row r="1">${header}<c r="IW1" s="1"/></row>` }] })

    expect(() => describeWorkbook(bytes, FILE)).toThrow(FileTooLargeError)
  })
})

describe('describeWorkbook: default limits (spec "Límites de lectura del archivo", design D3)', () => {
  const MIB = 1024 * 1024

  it('fixes 64 MiB inflated, 200 000 rows, 256 columns, 10 000 entries and 2 000 000 shared strings', () => {
    expect(DEFAULT_READ_LIMITS).toMatchObject({
      maxInflatedBytes: 64 * MIB,
      maxRowsPerSheet: 200_000,
      maxColumns: 256,
      maxZipEntries: 10_000,
      maxSharedStrings: 2_000_000,
    })
  })

  /**
   * A package with the bulk of its content in a single shared string (never kept in the preview). Stored
   * rather than deflated: the reader counts stored bytes the same way, and compressing 64 MiB in the test is
   * what would make it slow.
   */
  function packageWithSharedText(text: string): Uint8Array {
    return buildXlsx({
      sharedStrings: [{ xml: `<si><t>${text}</t></si>` }],
      sheets: [{ name: 'APP', rows: [['ID'], ['1']] }],
      level: 0,
    })
  }

  /** Total inflated bytes of a package, as the reader counts them. */
  function inflatedTotalOf(bytes: Uint8Array): number {
    let total = 0
    describeWorkbook(bytes, FILE, {
      limits: { maxInflatedBytes: Number.MAX_SAFE_INTEGER },
      onInflated: (running) => {
        total = running
      },
    })
    return total
  }

  it('accepts a package that inflates to exactly 64 MiB and rejects one byte more', () => {
    const baseline = inflatedTotalOf(packageWithSharedText(''))
    const exactly = packageWithSharedText('A'.repeat(64 * MIB - baseline))
    const oneMore = packageWithSharedText('A'.repeat(64 * MIB - baseline + 1))

    let total = 0
    const onInflated = (running: number) => {
      total = running
    }
    expect(() => describeWorkbook(exactly, FILE, { onInflated })).not.toThrow()
    expect(total).toBe(64 * MIB)
    expect(() => describeWorkbook(oneMore, FILE)).toThrow(FileTooLargeError)
  }, 30_000)

  it('accepts a sheet with exactly 200 000 data rows and rejects 200 001', () => {
    const sheetWith = (rows: number) =>
      buildXlsx({
        sheets: [
          {
            name: 'APP',
            sheetDataXml: `<row><c t="inlineStr"><is><t>ID</t></is></c></row>${'<row><c><v>1</v></c></row>'.repeat(rows)}`,
          },
        ],
      })

    expect(sheetOf(sheetWith(200_000)).rowCount).toBe(200_000)
    expect(() => describeWorkbook(sheetWith(200_001), FILE)).toThrow(FileTooLargeError)
  })
})
