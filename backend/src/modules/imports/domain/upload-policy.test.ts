import { describe, expect, it } from 'vitest'
import { UnsupportedFileTypeError } from './errors.js'
import {
  assertXlsxName,
  isOoxmlMagic,
  MAX_FILE_BYTES,
  MAX_FILE_NAME_LENGTH,
  MAX_FILES_PER_REQUEST,
  sanitizeFileName,
} from './upload-policy.js'

describe('sanitizeFileName', () => {
  it('keeps only the base name, whatever the separators the client sent', () => {
    expect(sanitizeFileName('..\\..\\evil.xlsx')).toBe('evil.xlsx')
    expect(sanitizeFileName('../../etc/passwd.xlsx')).toBe('passwd.xlsx')
    expect(sanitizeFileName('C:\\Users\\me\\batch.xlsx')).toBe('batch.xlsx')
    expect(sanitizeFileName('Recon_Template_ProviderA-USD_batch-clean.xlsx')).toBe(
      'Recon_Template_ProviderA-USD_batch-clean.xlsx',
    )
  })

  it('strips control characters and surrounding spaces, and cuts at 255 characters', () => {
    expect(sanitizeFileName('  ba\u0000tch\u001f.xlsx \n')).toBe('batch.xlsx')
    const long = `${'a'.repeat(300)}.xlsx`
    expect(sanitizeFileName(long)).toHaveLength(MAX_FILE_NAME_LENGTH)
  })

  it('falls back to a generic name when nothing is left', () => {
    expect(sanitizeFileName('')).toBe('upload')
    expect(sanitizeFileName('../')).toBe('upload')
  })
})

describe('assertXlsxName', () => {
  it('accepts .xlsx in any case', () => {
    expect(() => assertXlsxName('batch.xlsx')).not.toThrow()
    expect(() => assertXlsxName('BATCH.XLSX')).not.toThrow()
  })

  it.each(['batch.csv', 'batch.xls', 'batch.xlsm', 'batch', 'batch.xlsx.exe', '.xlsx'])(
    'rejects %s with UnsupportedFileTypeError naming the file',
    (fileName) => {
      let caught: unknown
      try {
        assertXlsxName(fileName)
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(UnsupportedFileTypeError)
      expect((caught as UnsupportedFileTypeError).details).toEqual({ fileName })
      expect((caught as UnsupportedFileTypeError).status).toBe(400)
    },
  )
})

describe('isOoxmlMagic', () => {
  it('recognises a zip local header and rejects an OLE container or short input', () => {
    expect(isOoxmlMagic(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]))).toBe(true)
    expect(isOoxmlMagic(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe(false)
    expect(isOoxmlMagic(new Uint8Array([0x50, 0x4b]))).toBe(false)
  })
})

describe('limits', () => {
  it('fixes 20 MiB per file and 10 files per request (README §4.2, design D3)', () => {
    expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024)
    expect(MAX_FILES_PER_REQUEST).toBe(10)
  })
})
