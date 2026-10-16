// Minimal zip reader over a buffer: central directory + streaming inflate of one entry at a time.
// Random access by name (the parts of a workbook are not stored in a useful order) and output
// counted chunk by chunk by the caller, so a decompression bomb is stopped without trusting the
// sizes declared in the headers. No ZIP64, no encryption: a .xlsx of at most 20 MiB never needs them.
import { Inflate } from 'fflate'

export class ZipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZipError'
  }
}

export interface ZipEntry {
  name: string
  method: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
  flags: number
}

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const EOCD_MIN = 22
const MAX_COMMENT = 0xffff
const METHOD_STORED = 0
const METHOD_DEFLATE = 8
const FLAG_ENCRYPTED = 0x1
const ZIP64_MARKER = 0xffffffff
/** Compressed bytes pushed per step: bounds how much a single step can inflate (deflate expands ~1000x at most). */
const PUSH_CHUNK = 4096

const decoder = new TextDecoder('utf-8')

export function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const dv = view(bytes)
  const stop = Math.max(0, bytes.length - EOCD_MIN - MAX_COMMENT)
  for (let offset = bytes.length - EOCD_MIN; offset >= stop; offset--) {
    if (dv.getUint32(offset, true) === EOCD_SIGNATURE) return offset
  }
  throw new ZipError('end of central directory not found')
}

/** Number of entries declared by the end-of-central-directory record, before reading them. */
export function countEntries(bytes: Uint8Array): number {
  const eocd = findEndOfCentralDirectory(bytes)
  return view(bytes).getUint16(eocd + 10, true)
}

export function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const dv = view(bytes)
  const eocd = findEndOfCentralDirectory(bytes)
  const total = dv.getUint16(eocd + 10, true)
  const size = dv.getUint32(eocd + 12, true)
  const start = dv.getUint32(eocd + 16, true)
  if (start === ZIP64_MARKER || start + size > bytes.length) throw new ZipError('central directory out of bounds')

  const entries: ZipEntry[] = []
  let offset = start
  for (let i = 0; i < total; i++) {
    if (offset + 46 > bytes.length || dv.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
      throw new ZipError('malformed central directory entry')
    }
    const flags = dv.getUint16(offset + 8, true)
    const method = dv.getUint16(offset + 10, true)
    const compressedSize = dv.getUint32(offset + 20, true)
    const uncompressedSize = dv.getUint32(offset + 24, true)
    const nameLength = dv.getUint16(offset + 28, true)
    const extraLength = dv.getUint16(offset + 30, true)
    const commentLength = dv.getUint16(offset + 32, true)
    const localHeaderOffset = dv.getUint32(offset + 42, true)
    const nameStart = offset + 46
    if (nameStart + nameLength > bytes.length) throw new ZipError('malformed central directory entry')
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength))
    entries.push({ name, method, compressedSize, uncompressedSize, localHeaderOffset, flags })
    offset = nameStart + nameLength + extraLength + commentLength
  }
  return entries
}

/**
 * Streams the content of one entry to `onChunk`. The caller counts the inflated bytes and throws
 * to stop; nothing past the current chunk is ever inflated.
 */
export function readEntry(
  bytes: Uint8Array,
  entry: ZipEntry,
  onChunk: (chunk: Uint8Array, final: boolean) => void,
): void {
  const dv = view(bytes)
  const header = entry.localHeaderOffset
  if (header + 30 > bytes.length || dv.getUint32(header, true) !== LOCAL_SIGNATURE) {
    throw new ZipError(`malformed local header of ${entry.name}`)
  }
  if (entry.flags & FLAG_ENCRYPTED) throw new ZipError(`${entry.name} is encrypted`)
  if (entry.compressedSize === ZIP64_MARKER || entry.uncompressedSize === ZIP64_MARKER) {
    throw new ZipError(`${entry.name} uses ZIP64`)
  }
  const nameLength = dv.getUint16(header + 26, true)
  const extraLength = dv.getUint16(header + 28, true)
  const start = header + 30 + nameLength + extraLength
  const end = start + entry.compressedSize
  if (end > bytes.length) throw new ZipError(`${entry.name} data out of bounds`)
  const data = bytes.subarray(start, end)

  if (entry.method === METHOD_STORED) {
    onChunk(data, true)
    return
  }
  if (entry.method !== METHOD_DEFLATE) throw new ZipError(`${entry.name} uses unsupported compression ${entry.method}`)

  const inflate = new Inflate()
  inflate.ondata = onChunk
  if (data.length === 0) {
    onChunk(new Uint8Array(0), true)
    return
  }
  for (let offset = 0; offset < data.length; offset += PUSH_CHUNK) {
    const stop = Math.min(offset + PUSH_CHUNK, data.length)
    inflate.push(data.subarray(offset, stop), stop === data.length)
  }
}
