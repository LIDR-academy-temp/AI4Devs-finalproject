import { describe, it, expect } from 'vitest'
import { isDiaCompleto } from './reservasCalendarioUtils'

describe('reservasCalendarioUtils', () => {
  it('M-5: reserva >= 23h se trata como día completo', () => {
    expect(isDiaCompleto('2026-10-28T00:00:00', '2026-10-28T23:30:00')).toBe(true)
    expect(isDiaCompleto('2026-10-28T10:00:00', '2026-10-28T12:00:00')).toBe(false)
  })
})
