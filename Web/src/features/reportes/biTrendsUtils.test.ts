import { describe, expect, it } from 'vitest'
import {
  biHasVisibleTrend,
  formatBiPeriodLabel,
  latestSnapshot,
  morosidadPct,
  normalizeBiSnapshot,
  normalizeBiSnapshots,
} from './biTrendsUtils'

describe('biTrendsUtils', () => {
  it('normalizeBiSnapshot acepta PascalCase', () => {
    const s = normalizeBiSnapshot({
      Fecha: '2026-01-15',
      TicketsAbiertos: 2,
      CasasOcupadas: 10,
      ResidentesMorosos: 1,
    })
    expect(s.fecha).toBe('2026-01-15')
    expect(s.ticketsAbiertos).toBe(2)
  })

  it('normalizeBiSnapshots ignora no-array', () => {
    expect(normalizeBiSnapshots(null)).toEqual([])
  })

  it('morosidadPct redondea', () => {
    expect(morosidadPct({ casasOcupadas: 4, residentesMorosos: 1 } as never)).toBe(25)
    expect(morosidadPct({ casasOcupadas: 0, residentesMorosos: 1 } as never)).toBe(0)
  })

  it('latestSnapshot ordena por fecha', () => {
    const a = { fecha: '2026-01-01' } as never
    const b = { fecha: '2026-02-01' } as never
    expect(latestSnapshot([a, b])?.fecha).toBe('2026-02-01')
  })

  it('biHasVisibleTrend detecta actividad', () => {
    expect(
      biHasVisibleTrend([
        {
          ticketsAbiertos: 0,
          ticketsCerrados: 0,
          ingresosMXN: 0,
          egresosMXN: 0,
          residentesMorosos: 0,
          tiempoMedioResolucionHoras: 0,
        } as never,
      ]),
    ).toBe(false)
    expect(
      biHasVisibleTrend([
        {
          ticketsAbiertos: 1,
          ticketsCerrados: 0,
          ingresosMXN: 0,
          egresosMXN: 0,
          residentesMorosos: 0,
          tiempoMedioResolucionHoras: 0,
        } as never,
      ]),
    ).toBe(true)
  })

  it('formatBiPeriodLabel formatea es-MX', () => {
    expect(formatBiPeriodLabel('2026-03-01')).toMatch(/2026/)
  })
})
