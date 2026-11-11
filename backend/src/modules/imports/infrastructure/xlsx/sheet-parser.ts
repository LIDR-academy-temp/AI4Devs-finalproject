// One worksheet part, streamed: header row, row count, preview, per-column stats. Every cell is text (design D2).
// With `onRow`, every data row is also handed to the caller as it is finished (rows mode, design D3 of import-analyze).
import type { ColumnStats, SheetDescription, SheetRow } from '../../domain/workbook.js'
import type { ReadLimits } from './limits.js'
import { XmlError, type XmlSink, xmlSink } from './xml.js'

export interface SheetParser extends XmlSink {
  result(): SheetDescription
}

interface SheetParserOptions {
  name: string
  hidden: boolean
  sharedStrings: readonly string[]
  limits: ReadLimits
  /** Called when a limit is exceeded; must throw. */
  tooLarge(limit: string): never
  /** Receives every data row (never the header, never an empty row); the parser retains nothing of it. */
  onRow?: (row: SheetRow) => void
}

interface Cell {
  type: string
  text: string[]
  hasValue: boolean
  hasFormula: boolean
  column: number
}

/** A cell with a value or a formula; empty cells are never kept. */
interface ReadCell {
  value: string
  numeric: boolean
  lossy: boolean
}

/** Excel's last column is XFD: 16 384 columns, three letters at most. */
const MAX_COLUMN_INDEX = 16_383
const MAX_COLUMN_LETTERS = 3

export function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/**
 * Column index (0-based) of a cell reference such as `A2` or `AB10`; null when it has no letters.
 * A reference beyond column XFD cannot come from a real workbook: it is malformed, and it is rejected
 * before anything is sized by it.
 */
export function columnIndex(ref: string): number | null {
  let index = 0
  let letters = 0
  for (const ch of ref) {
    const code = ch.charCodeAt(0)
    if (code < 65 || code > 90) break
    if (++letters > MAX_COLUMN_LETTERS) throw new XmlError(`cell reference ${ref} is beyond column XFD`)
    index = index * 26 + (code - 64)
  }
  if (letters === 0) return null
  if (index - 1 > MAX_COLUMN_INDEX) throw new XmlError(`cell reference ${ref} is beyond column XFD`)
  return index - 1
}

/**
 * Excel keeps at most 15 significant digits in a numeric cell: an exponent or more than 15 digits
 * in the stored text means the precision was already lost in the file (README §3.2).
 */
export function isLossyNumber(text: string): boolean {
  if (/[eE]/.test(text)) return true
  const digits = text.replace(/[^0-9]/g, '').replace(/^0+/, '')
  return digits.length > 15
}

/** Row 1 as column names: trimmed, `Column <letter>` when empty, trailing empties dropped, repeats suffixed. */
export function normalizeHeaders(raw: readonly string[]): string[] {
  const trimmed = raw.map((h) => h.trim())
  let width = trimmed.length
  while (width > 0 && trimmed[width - 1] === '') width--
  const taken = new Set<string>()
  const headers: string[] = []
  for (let i = 0; i < width; i++) {
    const base = trimmed[i] === '' ? `Column ${columnLetter(i)}` : (trimmed[i] as string)
    let name = base
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base} (${n})`
    taken.add(name.toLowerCase())
    headers.push(name)
  }
  return headers
}

export function sheetParser(options: SheetParserOptions): SheetParser {
  const { limits, sharedStrings, tooLarge } = options
  let headers: string[] | null = null
  let rowCount = 0
  const preview: string[][] = []
  let stats: { distinct: Map<string, true> | null; numericCells: number; lossyNumericCells: number }[] = []

  let lastRow = 0
  let rowNo = 0
  let lastColumn = -1
  let cells: Map<number, ReadCell> = new Map()
  let cell: Cell | null = null
  let capturing: 'v' | 't' | null = null
  let inlineDepth = 0
  let phoneticDepth = 0

  function cellText(c: Cell): string {
    const text = c.text.join('')
    switch (c.type) {
      case 's': {
        const index = Number.parseInt(text, 10)
        return sharedStrings[index] ?? ''
      }
      case 'b':
        return text.trim() === '1' ? 'TRUE' : 'FALSE'
      default:
        return text
    }
  }

  function finishCell(c: Cell): void {
    // Empty cells (styled or not) are not kept, so the row map never grows beyond the cells with content.
    if (!c.hasValue && !c.hasFormula) return
    const value = cellText(c)
    const numeric = c.type === 'n' && c.hasValue
    cells.set(c.column, { value, numeric, lossy: numeric && isLossyNumber(value) })
  }

  function setHeaders(): void {
    const width = cells.size === 0 ? 0 : Math.max(...cells.keys()) + 1
    const raw: string[] = []
    for (let i = 0; i < width; i++) raw.push(cells.get(i)?.value ?? '')
    headers = normalizeHeaders(raw)
    stats = headers.map(() => ({ distinct: new Map(), numericCells: 0, lossyNumericCells: 0 }))
  }

  function finishRow(): void {
    if (rowNo === 1) {
      setHeaders()
      return
    }
    if (cells.size === 0) return
    rowCount++
    if (rowCount > limits.maxRowsPerSheet) tooLarge(`more than ${limits.maxRowsPerSheet} rows in sheet ${options.name}`)
    const width = headers?.length ?? 0
    const row: string[] = []
    const lossyNumeric: number[] = []
    for (let i = 0; i < width; i++) {
      const c = cells.get(i)
      const value = c?.value ?? ''
      row.push(value)
      const stat = stats[i]
      if (!stat || !c) continue
      if (c.numeric) stat.numericCells++
      if (c.lossy) {
        stat.lossyNumericCells++
        lossyNumeric.push(i)
      }
      if (value !== '' && stat.distinct !== null && !stat.distinct.has(value)) {
        if (stat.distinct.size >= limits.maxDistinctValues) stat.distinct = null
        else stat.distinct.set(value, true)
      }
    }
    if (preview.length < limits.previewRows) preview.push(row)
    options.onRow?.({ rowNo, cells: row, lossyNumeric })
  }

  const sink = xmlSink({
    open(name, attributes) {
      switch (name) {
        case 'row': {
          const r = attributes.r !== undefined ? Number.parseInt(attributes.r, 10) : Number.NaN
          rowNo = Number.isFinite(r) && r > 0 ? r : lastRow + 1
          lastColumn = -1
          cells = new Map()
          break
        }
        case 'c': {
          const ref = attributes.r !== undefined ? columnIndex(attributes.r) : null
          const column = ref ?? lastColumn + 1
          // Every cell counts against the column limit, with or without a value: an empty styled cell far to
          // the right would otherwise size the header row and the per-row map.
          if (column >= limits.maxColumns) tooLarge(`more than ${limits.maxColumns} columns`)
          lastColumn = column
          cell = { type: attributes.t ?? 'n', text: [], hasValue: false, hasFormula: false, column }
          break
        }
        case 'v':
          if (cell) capturing = 'v'
          break
        case 'f':
          if (cell) cell.hasFormula = true
          break
        case 'is':
          inlineDepth++
          break
        case 'rPh':
          phoneticDepth++
          break
        case 't':
          if (cell && inlineDepth > 0 && phoneticDepth === 0) {
            capturing = 't'
            cell.hasValue = true
          }
          break
        default:
          break
      }
    },
    text(text) {
      if (capturing && cell) cell.text.push(text)
    },
    close(name) {
      switch (name) {
        case 'v':
          if (cell) cell.hasValue = true
          capturing = null
          break
        case 't':
          capturing = null
          break
        case 'is':
          inlineDepth--
          break
        case 'rPh':
          phoneticDepth--
          break
        case 'c':
          if (cell) finishCell(cell)
          cell = null
          break
        case 'row':
          finishRow()
          lastRow = rowNo
          break
        default:
          break
      }
    },
  })

  return {
    push: sink.push,
    result(): SheetDescription {
      const columnStats: ColumnStats[] = stats.map((s) => ({
        distinctValues: s.distinct === null ? null : [...s.distinct.keys()],
        numericCells: s.numericCells,
        lossyNumericCells: s.lossyNumericCells,
      }))
      return { name: options.name, hidden: options.hidden, headers: headers ?? [], rowCount, preview, columnStats }
    },
  }
}
