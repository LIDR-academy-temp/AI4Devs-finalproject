// What an uploaded part must satisfy before anything is parsed (README §2.5, §4.2; design D3, D4).
import { UnsupportedFileTypeError } from './errors.js'

/** README §4.2: "hasta 20 MB cada uno", read as MiB. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_FILES_PER_REQUEST = 10
/** ImportFile.fileName is NVARCHAR(255). */
export const MAX_FILE_NAME_LENGTH = 255

const FALLBACK_NAME = 'upload'
const XLSX_NAME = /^.+\.xlsx$/i
// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are exactly what is stripped from client names
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g

/**
 * The display name of a file: only the base name the client sent (never a path), without control
 * characters, within the column length and keeping the extension when it has to be cut.
 */
export function sanitizeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? ''
  const clean = base.replace(CONTROL_CHARACTERS, '').trim()
  if (clean === '' || clean === '.' || clean === '..') return FALLBACK_NAME
  if (clean.length <= MAX_FILE_NAME_LENGTH) return clean
  const dot = clean.lastIndexOf('.')
  const extension = dot > 0 ? clean.slice(dot) : ''
  return clean.slice(0, MAX_FILE_NAME_LENGTH - extension.length) + extension
}

/** Only `.xlsx` is accepted (README §1.2: other formats are roadmap); the client's mimetype is not trusted either way. */
export function assertXlsxName(fileName: string): void {
  if (!XLSX_NAME.test(fileName)) throw new UnsupportedFileTypeError(fileName)
}

/** A zip local file header: what every OOXML package starts with (an .xls or an encrypted workbook is an OLE container). */
export function isOoxmlMagic(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}
