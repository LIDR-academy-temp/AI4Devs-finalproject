import { describe, expect, it } from 'vitest'
import { candidatesFor, type GatewayFormat, idLengthWarning, normalizeSourceId } from './normalize-source-id.js'

// README §1.2 "Identidad" and spec "Normalización del ID por formato del gateway", "Longitud del ID numérico",
// "IDs con pérdida de precisión no se cruzan", "Filas sin ID se ignoran" (design D4).
const NUMERIC: GatewayFormat = { gatewayId: 1, idFormat: 'numeric' }
const UUID: GatewayFormat = { gatewayId: 2, idFormat: 'uuid' }
const NUMERIC_TOO: GatewayFormat = { gatewayId: 9001, idFormat: 'numeric' }

describe('normalizeSourceId', () => {
  it('numeric: trims, keeps digits only and drops leading zeros', () => {
    expect(normalizeSourceId(' 00252570479111759 ', 'numeric')).toBe('252570479111759')
    expect(normalizeSourceId('000', 'numeric')).toBe('0')
    expect(normalizeSourceId('4512308877', 'numeric')).toBe('4512308877')
  })

  it('numeric: anything that is not only digits does not fit', () => {
    expect(normalizeSourceId('12-34', 'numeric')).toBeNull()
    expect(normalizeSourceId('1.2345678901234567E16', 'numeric')).toBeNull()
    expect(normalizeSourceId('df14616d-4b26-4ffb-9984-72717ebff6a6', 'numeric')).toBeNull()
    expect(normalizeSourceId('', 'numeric')).toBeNull()
  })

  it('uuid: strips braces, lowercases and requires the 8-4-4-4-12 form', () => {
    expect(normalizeSourceId('{DF14616D-4B26-4FFB-9984-72717EBFF6A6}', 'uuid')).toBe(
      'df14616d-4b26-4ffb-9984-72717ebff6a6',
    )
    expect(normalizeSourceId(' df14616d-4b26-4ffb-9984-72717ebff6a6 ', 'uuid')).toBe(
      'df14616d-4b26-4ffb-9984-72717ebff6a6',
    )
  })

  it('uuid: never completes a shape that is not a UUID (32 hex without dashes, digits only)', () => {
    expect(normalizeSourceId('df14616d4b264ffb998472717ebff6a6', 'uuid')).toBeNull()
    expect(normalizeSourceId('252570479111759', 'uuid')).toBeNull()
    expect(normalizeSourceId('{df14616d-4b26-4ffb-9984-72717ebff6a6', 'uuid')).toBeNull()
  })
})

describe('idLengthWarning', () => {
  it('flags a numeric id outside 12–17 digits and nothing else', () => {
    expect(idLengthWarning('4512308877', 'numeric')).toBe(true)
    expect(idLengthWarning('12345678901', 'numeric')).toBe(true)
    expect(idLengthWarning('123456789012', 'numeric')).toBe(false)
    expect(idLengthWarning('252570479111759', 'numeric')).toBe(false)
    expect(idLengthWarning('4260465812403708', 'numeric')).toBe(false)
    expect(idLengthWarning('12345678901234567', 'numeric')).toBe(false)
    expect(idLengthWarning('123456789012345678', 'numeric')).toBe(true)
    expect(idLengthWarning('df14616d-4b26-4ffb-9984-72717ebff6a6', 'uuid')).toBe(false)
  })
})

describe('candidatesFor', () => {
  it('produces one candidate per gateway whose format the id fits', () => {
    expect(candidatesFor('252570479111759', false, [NUMERIC, UUID])).toEqual({
      kind: 'candidates',
      candidates: [{ gatewayId: 1, sourceTransactionId: '252570479111759' }],
      idLength: false,
    })
    expect(candidatesFor('{DF14616D-4B26-4FFB-9984-72717EBFF6A6}', false, [NUMERIC, UUID])).toEqual({
      kind: 'candidates',
      candidates: [{ gatewayId: 2, sourceTransactionId: 'df14616d-4b26-4ffb-9984-72717ebff6a6' }],
      idLength: false,
    })
  })

  it('produces two candidates when two gateways share the format (the ambiguous case)', () => {
    expect(candidatesFor('252570479111759', false, [NUMERIC, UUID, NUMERIC_TOO])).toEqual({
      kind: 'candidates',
      candidates: [
        { gatewayId: 1, sourceTransactionId: '252570479111759' },
        { gatewayId: 9001, sourceTransactionId: '252570479111759' },
      ],
      idLength: false,
    })
  })

  it('carries the length warning for a numeric id outside 12–17 digits', () => {
    expect(candidatesFor('4512308877', false, [NUMERIC])).toMatchObject({ kind: 'candidates', idLength: true })
  })

  it('never looks up a cell that lost precision in the file', () => {
    expect(candidatesFor('12345678901234567', true, [NUMERIC, UUID])).toEqual({
      kind: 'unmatched',
      reason: 'lossy_numeric_id',
    })
  })

  it('ignores an empty id (the global row rule), even when flagged lossy', () => {
    expect(candidatesFor('', false, [NUMERIC])).toEqual({ kind: 'ignored', reason: 'empty_id' })
    expect(candidatesFor('   ', false, [NUMERIC])).toEqual({ kind: 'ignored', reason: 'empty_id' })
  })

  it('reports no_gateways when the account resolves to none, and id_format when nothing fits', () => {
    expect(candidatesFor('252570479111759', false, [])).toEqual({ kind: 'unmatched', reason: 'no_gateways' })
    expect(candidatesFor('df14616d-4b26-4ffb-9984-72717ebff6a6', false, [NUMERIC])).toEqual({
      kind: 'unmatched',
      reason: 'id_format',
    })
  })
})
