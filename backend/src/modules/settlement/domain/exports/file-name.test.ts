import { describe, expect, it } from 'vitest'
import { exportFileName, safeAccountName } from './file-name.js'

// Spec settlement "Exports", scenarios "Nombre del archivo por intento" and "Nombre de cuenta con caracteres fuera de la
// lista blanca" (design D8): an ASCII name, no filename* needed.
describe('safeAccountName', () => {
  it('keeps the seeded names', () => {
    for (const name of ['ProviderA-USD', 'ProviderA-EUR', 'ProviderC-Alt']) expect(safeAccountName(name)).toBe(name)
  })

  it('turns every run of characters outside [A-Za-z0-9-] into one underscore', () => {
    expect(safeAccountName('Provider X / EU')).toBe('Provider_X_EU')
    expect(safeAccountName('Café  Pagos')).toBe('Caf_Pagos')
    expect(safeAccountName('a__b')).toBe('a_b')
    expect(safeAccountName('a"b\\c')).toBe('a_b_c')
  })

  it('trims underscores and hyphens at both ends', () => {
    expect(safeAccountName('  -Provider X- ')).toBe('Provider_X')
    expect(safeAccountName('Ñandú Pay')).toBe('and_Pay')
  })

  it('falls back to "account" when nothing is left', () => {
    for (const name of ['', '   ', '///', '-_-', 'ÑÑ']) expect(safeAccountName(name)).toBe('account')
  })
})

describe('exportFileName', () => {
  it('names the file by attempt: <account>_B<batchNo>_A<attemptNo>_<type>.csv', () => {
    expect(exportFileName('ProviderA-USD', 118, 2, 'reserves')).toBe('ProviderA-USD_B118_A2_reserves.csv')
    expect(exportFileName('ProviderA-USD', 123, 1, 'transactions')).toBe('ProviderA-USD_B123_A1_transactions.csv')
    expect(exportFileName('Provider X / EU', 5, 1, 'summary')).toBe('Provider_X_EU_B5_A1_summary.csv')
  })

  it('answers only ASCII without quotes or backslashes', () => {
    expect(exportFileName('Ünïcødé "quoted" \\ name', 1, 1, 'summary')).toMatch(/^[A-Za-z0-9_-]+\.csv$/)
  })
})
