import { describe, expect, it } from 'vitest'
import { csvField, toCsv } from './csv.js'

// Spec settlement "Formato de los CSV" (design D5, gate P4): RFC 4180, comma, CRLF, UTF-8 without BOM.
describe('toCsv', () => {
  it('writes the header and the rows, every line ending in CRLF', () => {
    expect(
      toCsv(
        ['ID', 'Status'],
        [
          ['911545593909470', 'SUC'],
          ['911545598812004', 'CHB'],
        ],
      ),
    ).toBe('ID,Status\r\n911545593909470,SUC\r\n911545598812004,CHB\r\n')
  })

  it('starts with the header, without a byte order mark', () => {
    const body = toCsv(['ID', 'Status'], [['911545593909470', 'SUC']])
    expect(body.startsWith('ID,Status')).toBe(true)
    expect(body.charCodeAt(0)).not.toBe(0xfeff)
  })

  it('writes only the header when there are no rows', () => {
    expect(toCsv(['ID', 'Description'], [])).toBe('ID,Description\r\n')
  })

  it('keeps an empty cell empty', () => {
    expect(toCsv(['Line', 'Sign', 'Amount'], [['Amount payable', '', '33771.3600']])).toBe(
      'Line,Sign,Amount\r\nAmount payable,,33771.3600\r\n',
    )
  })

  it('keeps an amount with more digits than a double holds intact', () => {
    expect(toCsv(['Amount'], [['123456789012345.1234']])).toBe('Amount\r\n123456789012345.1234\r\n')
  })
})

describe('csvField', () => {
  it('leaves a plain value untouched, numeric ids and UUIDs included', () => {
    for (const value of ['911545593909470', '9115455939094701', '4f0c2d1e-9a7b-4c3d-8e6f-1a2b3c4d5e6f', 'Batch 123'])
      expect(csvField(value)).toBe(value)
  })

  it('quotes a value with a comma', () => {
    expect(csvField('Wire fee, October')).toBe('"Wire fee, October"')
  })

  it('quotes a value with a double quote and doubles it', () => {
    expect(csvField('The "monthly" fee')).toBe('"The ""monthly"" fee"')
  })

  it('quotes a value with a line break, CR or LF', () => {
    expect(csvField('line 1\nline 2')).toBe('"line 1\nline 2"')
    expect(csvField('line 1\r\nline 2')).toBe('"line 1\r\nline 2"')
    expect(csvField('a\rb')).toBe('"a\rb"')
  })

  it('does not quote leading signs, spaces or apostrophes that RFC 4180 does not require', () => {
    for (const value of ['-40.0000', ' padded ', "O'Brien", '=1+1']) expect(csvField(value)).toBe(value)
  })
})
