// Describes a .xlsx package: sheets in workbook order, headers, row counts, preview and column stats,
// everything as text and within the reading limits (design D1–D3). Only the parts this product needs
// are inflated: workbook.xml, its rels, sharedStrings.xml and the worksheet parts. `withPackage` opens the
// package the same way for the rows reader (design D3 of import-analyze).
import { DomainError } from '../../../../shared/errors.js'
import { FileTooLargeError, FileUnreadableError } from '../../domain/errors.js'
import type { SheetDescription, WorkbookDescription } from '../../domain/workbook.js'
import { type ReadLimits, readLimits } from './limits.js'
import { sharedStringsCollector } from './shared-strings.js'
import { sheetParser } from './sheet-parser.js'
import { attribute, XmlError, type XmlSink, xmlSink } from './xml.js'
import { countEntries, isZip, readCentralDirectory, readEntry, type ZipEntry, ZipError } from './zip.js'

export interface DescribeLog {
  warn(obj: object, msg: string): void
}

export interface DescribeOptions {
  limits?: Partial<ReadLimits>
  /** Receives the real error when the reader fails for a reason it did not anticipate (see the catch below). */
  log?: DescribeLog
  /** Test seam: called with the running total of inflated bytes after every chunk. */
  onInflated?: (totalBytes: number) => void
}

/** A worksheet of the package: its name, visibility and the zip entry that holds it. */
export interface Worksheet {
  name: string
  hidden: boolean
  target: string
}

/** What the readers get once the package is open and validated: the sheets, the shared strings and a way to stream a part. */
export interface OpenPackage {
  worksheets: Worksheet[]
  sharedStrings: readonly string[]
  limits: ReadLimits
  stream(name: string, sink: XmlSink): void
  tooLarge(limit: string): never
  unreadable(reason: string): FileUnreadableError
}

/** What the 422 says when the failure is not one the reader can explain to the client. */
const UNEXPECTED_REASON = 'the workbook could not be read'

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

/**
 * Opens the package (zip, workbook.xml, rels, shared strings) within the limits and hands it to `body`.
 * Reader errors (zip, XML, limits) become the client-facing 400/422; anything else is logged and hidden.
 */
export function withPackage<T>(
  bytes: Uint8Array,
  fileName: string,
  options: DescribeOptions,
  body: (pkg: OpenPackage) => T,
): T {
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

    const worksheets: Worksheet[] = []
    for (const ref of sheetRefs) {
      const relationship = relationships.get(ref.relationshipId)
      if (relationship === undefined || !WORKSHEET_RELATIONSHIP.test(relationship.type)) continue
      worksheets.push({ name: ref.name, hidden: ref.hidden, target: resolveTarget(relationship.target) })
    }
    if (worksheets.length === 0) throw unreadable('no worksheets')

    const sst = sharedStringsCollector((count) => {
      if (count > limits.maxSharedStrings) tooLarge(`more than ${limits.maxSharedStrings} shared strings`)
    })
    if (entries.has(SHARED_STRINGS)) stream(SHARED_STRINGS, sst)

    return body({ worksheets, sharedStrings: sst.strings, limits, stream, tooLarge, unreadable })
  } catch (error) {
    if (error instanceof DomainError) throw error
    // Only the reader's own zip and XML errors describe the file; any other error (a bug, an edge case of the
    // runtime) is ours to log, and the client gets a fixed reason rather than its message.
    if (error instanceof ZipError || error instanceof XmlError) throw unreadable(error.message)
    options.log?.warn({ err: error, fileName }, 'unexpected error while reading a workbook')
    throw unreadable(UNEXPECTED_REASON)
  }
}

export function describeWorkbook(
  bytes: Uint8Array,
  fileName: string,
  options: DescribeOptions = {},
): WorkbookDescription {
  return withPackage(bytes, fileName, options, ({ worksheets, sharedStrings, limits, stream, tooLarge }) => {
    const sheets: SheetDescription[] = []
    for (const sheet of worksheets) {
      const parser = sheetParser({ name: sheet.name, hidden: sheet.hidden, sharedStrings, limits, tooLarge })
      stream(sheet.target, parser)
      sheets.push(parser.result())
    }
    return { sheets }
  })
}
