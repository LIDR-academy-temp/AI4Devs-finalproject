// Test-only builder of minimal .xlsx packages: hand-written OOXML parts zipped with fflate.
// It covers only what the reader understands (sheets, shared strings, cells) so that edge cases
// (rich text, numeric cells, formulas without a cached value, hidden sheets…) can be crafted exactly.
import { strToU8, type Zippable, zipSync } from 'fflate'

export interface CellSpec {
  /** Cell type attribute; omitted means numeric (`n`). */
  t?: 'n' | 's' | 'inlineStr' | 'b' | 'e' | 'str' | 'd'
  /** Text of `<v>`; for `t="s"` it is the shared string index. */
  v?: string
  /** Formula text; a formula without `v` has no cached value. */
  f?: string
  /** Inline string text (`t="inlineStr"`); wrapped in `<is><t>`. */
  is?: string
  /** Raw inner XML of the cell, used verbatim instead of v/f/is. */
  innerXml?: string
  /** Omit the `r` attribute of the cell. */
  noRef?: boolean
}

/** A string becomes an inline string (or a shared string when the workbook declares it); a number, a numeric cell. */
export type CellInput = string | number | CellSpec | null

export interface SheetSpec {
  name: string
  hidden?: boolean
  rows?: CellInput[][]
  /** Omit the `r` attribute of every row. */
  noRowRefs?: boolean
  /** Raw inner XML of `<sheetData>`, used verbatim instead of `rows`. */
  sheetDataXml?: string
  /** Raw XML of the whole worksheet part, used verbatim. */
  xml?: string
}

export interface WorkbookSpec {
  sheets: SheetSpec[]
  /** Shared strings table: plain strings or raw `<si>` XML. Strings used in cells are looked up here first. */
  sharedStrings?: (string | { xml: string })[]
  /** Put the worksheet parts before workbook.xml in the zip (Excel and openpyxl do), or after. */
  order?: 'sheets-first' | 'workbook-first'
  /** Parts to leave out, to craft unreadable packages. */
  omit?: ('contentTypes' | 'workbook' | 'rels' | 'sheet1')[]
  /** Extra zip entries, e.g. to exceed the entry limit. */
  extraEntries?: Record<string, Uint8Array>
  /** Compression level for every entry (0 = stored). */
  level?: 0 | 6
}

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const NS_PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const REL_WORKSHEET = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet'

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

export function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function cellXml(input: CellInput, ref: string | null, shared: Map<string, number>): string {
  if (input === null) return ''
  const r = ref === null ? '' : ` r="${ref}"`
  if (typeof input === 'number') return `<c${r}><v>${input}</v></c>`
  if (typeof input === 'string') {
    const index = shared.get(input)
    if (index !== undefined) return `<c${r} t="s"><v>${index}</v></c>`
    return `<c${r} t="inlineStr"><is><t>${escapeXml(input)}</t></is></c>`
  }
  const t = input.t ? ` t="${input.t}"` : ''
  if (input.innerXml !== undefined) return `<c${r}${t}>${input.innerXml}</c>`
  const parts: string[] = []
  if (input.f !== undefined) parts.push(`<f>${escapeXml(input.f)}</f>`)
  if (input.is !== undefined) parts.push(`<is><t>${escapeXml(input.is)}</t></is>`)
  if (input.v !== undefined) parts.push(`<v>${escapeXml(input.v)}</v>`)
  if (parts.length === 0) return `<c${r}${t}/>`
  return `<c${r}${t}>${parts.join('')}</c>`
}

function sheetXml(sheet: SheetSpec, shared: Map<string, number>): string {
  if (sheet.xml !== undefined) return sheet.xml
  let sheetData = sheet.sheetDataXml ?? ''
  if (sheet.sheetDataXml === undefined) {
    const rows = sheet.rows ?? []
    sheetData = rows
      .map((cells, rowIndex) => {
        const rowNo = rowIndex + 1
        const r = sheet.noRowRefs ? '' : ` r="${rowNo}"`
        const body = cells
          .map((cell, colIndex) => {
            const noRef = sheet.noRowRefs || (typeof cell === 'object' && cell !== null && cell.noRef)
            return cellXml(cell, noRef ? null : `${columnLetter(colIndex)}${rowNo}`, shared)
          })
          .join('')
        return `<row${r}>${body}</row>`
      })
      .join('')
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheetData>${sheetData}</sheetData></worksheet>`
}

/** Builds an .xlsx package in memory. */
export function buildXlsx(spec: WorkbookSpec): Uint8Array {
  const omit = new Set(spec.omit ?? [])
  const shared = new Map<string, number>()
  const sst = spec.sharedStrings ?? []
  sst.forEach((entry, index) => {
    if (typeof entry === 'string') shared.set(entry, index)
  })

  const sheetParts: Record<string, string> = {}
  const sheetElements: string[] = []
  const relElements: string[] = []
  spec.sheets.forEach((sheet, index) => {
    const n = index + 1
    const state = sheet.hidden ? ' state="hidden"' : ''
    sheetElements.push(`<sheet name="${escapeXml(sheet.name)}" sheetId="${n}"${state} r:id="rId${n}"/>`)
    relElements.push(`<Relationship Id="rId${n}" Type="${REL_WORKSHEET}" Target="worksheets/sheet${n}.xml"/>`)
    if (!(n === 1 && omit.has('sheet1'))) sheetParts[`xl/worksheets/sheet${n}.xml`] = sheetXml(sheet, shared)
  })

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>${sheetElements.join('')}</sheets></workbook>`
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS_PKG_REL}">${relElements.join('')}</Relationships>`
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/></Types>`
  const sstXml =
    spec.sharedStrings === undefined
      ? null
      : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="${NS_MAIN}" count="${sst.length}" uniqueCount="${sst.length}">${sst
          .map((entry) => (typeof entry === 'string' ? `<si><t>${escapeXml(entry)}</t></si>` : entry.xml))
          .join('')}</sst>`

  const level = spec.level ?? 6
  const entry = (text: string): [Uint8Array, { level: 0 | 6 }] => [strToU8(text), { level }]
  const zip: Zippable = {}
  const addMeta = () => {
    if (!omit.has('contentTypes')) zip['[Content_Types].xml'] = entry(contentTypes)
    if (!omit.has('workbook')) zip['xl/workbook.xml'] = entry(workbook)
    if (!omit.has('rels')) zip['xl/_rels/workbook.xml.rels'] = entry(rels)
    if (sstXml !== null) zip['xl/sharedStrings.xml'] = entry(sstXml)
  }
  const addSheets = () => {
    for (const [name, xml] of Object.entries(sheetParts)) zip[name] = entry(xml)
  }
  if ((spec.order ?? 'sheets-first') === 'sheets-first') {
    addSheets()
    addMeta()
  } else {
    addMeta()
    addSheets()
  }
  for (const [name, bytes] of Object.entries(spec.extraEntries ?? {})) zip[name] = [bytes, { level }]
  return zipSync(zip)
}

/** The template layout used by the samples: ID / Amount / Currency with IDs as text. */
export function templateRows(ids: string[], amount = '10.5'): CellInput[][] {
  return [['ID', 'Amount', 'Currency'], ...ids.map((id) => [id, { v: amount }, 'USD'] as CellInput[])]
}
