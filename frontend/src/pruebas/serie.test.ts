import { describe, expect, it } from 'vitest'
import type { Punto } from '../servicios/cliente'
import {
  armarSerie,
  formatearFechaHora,
  formatearNumero,
  horaLocal,
  rangoDeDias,
} from '../servicios/serie'

function punto(hora: string, valor: number | null = 1): Punto {
  return {
    medido_en: `2026-11-01T${hora}:00-03:00`,
    valor,
    calidad: valor === null ? 'FALTANTE' : 'OK',
  }
}

describe('armarSerie', () => {
  it('conserva los puntos consecutivos sin agregar nada', () => {
    const serie = armarSerie([punto('10:00', 1), punto('10:10', 2), punto('10:20', 3)])
    expect(serie.y).toEqual([1, 2, 3])
    expect(serie.x).toEqual(['2026-11-01 10:00', '2026-11-01 10:10', '2026-11-01 10:20'])
  })

  it('corta la línea cuando un registro nunca llegó, sin interpolar', () => {
    const serie = armarSerie([punto('10:00', 1), punto('11:00', 5)])
    expect(serie.y).toEqual([1, null, 5])
  })

  it('mantiene nulo un dato faltante', () => {
    const serie = armarSerie([punto('10:00', 1), punto('10:10', null), punto('10:20', 3)])
    expect(serie.y).toEqual([1, null, 3])
  })

  it('tolera un minuto de desvío sin considerarlo hueco', () => {
    expect(armarSerie([punto('10:00', 1), punto('10:11', 2)]).y).toEqual([1, 2])
    expect(armarSerie([punto('10:00', 1), punto('10:12', 2)]).y).toEqual([1, null, 2])
  })

  it('admite una serie vacía', () => {
    expect(armarSerie([])).toEqual({ x: [], y: [] })
  })
})

describe('fechas y números', () => {
  it('muestra la hora de Argentina sin depender del navegador', () => {
    expect(horaLocal('2026-11-01T22:40:00-03:00')).toBe('2026-11-01 22:40')
    expect(formatearFechaHora('2026-11-01T22:40:00-03:00')).toBe('01/11/2026 22:40')
  })

  it('usa el formato argentino y raya para lo faltante', () => {
    expect(formatearNumero(1003.5)).toBe('1.003,5')
    expect(formatearNumero(0)).toBe('0')
    expect(formatearNumero(null)).toBe('—')
  })

  it('calcula el rango hacia atrás desde ahora', () => {
    const ahora = new Date('2026-11-02T00:00:00Z')
    const { desde, hasta } = rangoDeDias(31, ahora)
    expect(hasta).toBe(ahora)
    expect(desde.toISOString()).toBe('2026-10-02T00:00:00.000Z')
  })
})
