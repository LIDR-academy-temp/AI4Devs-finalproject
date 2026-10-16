// Describes a .xlsx package: sheets in workbook order, headers, row counts, preview and column stats,
// everything as text and within the reading limits (design D1–D3). Only the parts this product needs
// are inflated: workbook.xml, its rels, sharedStrings.xml and the worksheet parts.
import { DomainError } from '../../../../shared/errors.js'
import { FileTooLargeError, FileUnreadableError } from '../../domain/errors.js'
import type { SheetDescription, WorkbookDescription } from '../../domain/workbook.js'
import { type ReadLimits, readLimits } from './limits.js'
import { sharedStringsCollector } from './shared-strings.js'
import { sheetParser } from './sheet-parser.js'
import { attribute, type XmlSink, xmlSink } from './xml.js'
import { countEntries, isZip, readCentralDirectory, readEntry, type ZipEntry } from './zip.js'

export interface DescribeOptions {
  limits?: Partial<ReadLimits>
  /** Test seam: called with the running total of inflated bytes after every chunk. */
  onInflated?: (totalBytes: number) => void
}

const CONTENT_TYPES = '[Content_Types].xml'
const WORKBOOK = 'xl/workbook.xml'
const WORKBOOK_RELS = 'xl/_rels/workbook.xml.rels'
const SHARED_STRINGS = 'xl/sharedStrings.xml'
const WORKSHEET_RELATIONSHIP = /\/worksheet$/

interface SheetRef {
  name: string
  hidden: boolean
  relationshipId: string
}

interface Relationship {
  type: string
  target: string
}

function resolveTarget(target: string): string {
  if (target.startsWith('/')) return target.slice(1)
  return `xl/${target.replace(/^\.\//, '')}`
}

export function describeWorkbook(
  bytes: Uint8Array,
  fileName: string,
  options: DescribeOptions = {},
): WorkbookDescription {
  const limits = readLimits(options.limits)
  const unreadable = (reason: string) => new FileUnreadableError(fileName, reason)
  const tooLarge = (limit: string): never => {
    throw new FileTooLargeError(fileName, limit)
  }

  try {
    if (!isZip(bytes)) throw unreadable('not a zip package')
    if (countEntries(bytes) > limits.maxZipEntries) tooLarge(`more than ${limits.maxZipEntries} zip entries`)
    const entries = new Map<string, ZipEntry>()
    for (const entry of readCentralDirectory(bytes)) entries.set(entry.name, entry)
    if (!entries.has(CONTENT_TYPES) || !entries.has(WORKBOOK)) throw unreadable('missing workbook part')

    let inflated = 0
    const stream = (name: string, sink: XmlSink) => {
      const entry = entries.get(name)
      if (!entry) throw unreadable(`missing part ${name}`)
      readEntry(bytes, entry, (chunk, final) => {
        inflated += chunk.length
        if (inflated > limits.maxInflatedBytes) tooLarge(`more than ${limits.maxInflatedBytes} bytes when inflated`)
        options.onInflated?.(inflated)
        sink.push(chunk, final)
      })
    }

    const sheetRefs: SheetRef[] = []
    stream(
      WORKBOOK,
      xmlSink({
        open(name, attributes) {
          if (name !== 'sheet') return
          const state = attribute(attributes, 'state')
          sheetRefs.push({
            name: attribute(attributes, 'name') ?? '',
            hidden: state === 'hidden' || state === 'veryHidden',
            relationshipId: attribute(attributes, 'id') ?? '',
          })
        },
      }),
    )

    const relationships = new Map<string, Relationship>()
    if (entries.has(WORKBOOK_RELS)) {
      stream(
        WORKBOOK_RELS,
        xmlSink({
          open(name, attributes) {
            if (name !== 'Relationship') return
            const id = attribute(attributes, 'Id')
            if (id === undefined) return
            relationships.set(id, {
              type: attribute(attributes, 'Type') ?? '',
              target: attribute(attributes, 'Target') ?? '',
            })
          },
        }),
      )
    }

    const worksheets = sheetRefs
      .map((ref) => ({ ref, relationship: relationships.get(ref.relationshipId) }))
      .filter((s) => s.relationship !== undefined && WORKSHEET_RELATIONSHIP.test(s.relationship.type))
    if (worksheets.length === 0) throw unreadable('no worksheets')

    const sst = sharedStringsCollector((count) => {
      if (count > limits.maxSharedStrings) tooLarge(`more than ${limits.maxSharedStrings} shared strings`)
    })
    if (entries.has(SHARED_STRINGS)) stream(SHARED_STRINGS, sst)

    const sheets: SheetDescription[] = []
    for (const { ref, relationship } of worksheets) {
      const parser = sheetParser({ name: ref.name, hidden: ref.hidden, sharedStrings: sst.strings, limits, tooLarge })
      stream(resolveTarget((relationship as Relationship).target), parser)
      sheets.push(parser.result())
    }
    return { sheets }
  } catch (error) {
    if (error instanceof DomainError) throw error
    throw unreadable(error instanceof Error ? error.message : String(error))
  }
}
