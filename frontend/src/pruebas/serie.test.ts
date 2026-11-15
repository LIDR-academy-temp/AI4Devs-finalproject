import { describe, expect, it } from 'vitest'
import type { Punto } from '../servicios/cliente'
import {
  armarSerie,
  formatearFechaHora,
  formatearNumero,
  fechaDeArgentina,
  horaLocal,
  primerDiaPermitido,
  rangoDeDias,
  rangoManual,
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

describe('rangos del calendario', () => {
  // 12:00 del 5 de noviembre de 2026 en Argentina.
  const AHORA = new Date('2026-11-05T15:00:00Z')

  it('la fecha es la de Argentina, no la del navegador ni la de UTC', () => {
    expect(fechaDeArgentina(new Date('2026-11-06T02:00:00Z'))).toBe('2026-11-05')
    expect(fechaDeArgentina(new Date('2026-11-06T03:00:00Z'))).toBe('2026-11-06')
  })

  it.each([
    ['2026-11-05T15:00:00Z', '2025-11-05'],
    ['2028-02-29T15:00:00Z', '2027-02-28'],
  ])('a las %s el primer día permitido es %s', (ahora, primero) => {
    expect(primerDiaPermitido(new Date(ahora))).toBe(primero)
  })

  it('va de las 00:00 del inicio a las 23:59:59 del fin, en Argentina', () => {
    const resultado = rangoManual('2026-10-01', '2026-10-07', AHORA)
    expect(resultado).toEqual({
      rango: {
        desde: new Date('2026-10-01T03:00:00Z'),
        hasta: new Date('2026-10-08T02:59:59.999Z'),
      },
    })
  })

  it('si termina hoy, termina ahora', () => {
    expect(rangoManual('2026-11-01', '2026-11-05', AHORA)).toEqual({
      rango: { desde: new Date('2026-11-01T03:00:00Z'), hasta: AHORA },
    })
  })

  it.each([
    ['2025-11-05', '2025-11-05'],
    ['2026-10-06', '2026-11-05'],
    // Un mes de calendario: hasta el mismo día del mes siguiente (weather-track-historicos-sin-huecos).
    ['2026-10-05', '2026-11-05'],
    ['2026-10-01', '2026-11-01'],
    ['2026-11-05', '2026-11-05'],
  ])('acepta del %s al %s', (desde, hasta) => {
    expect(rangoManual(desde, hasta, AHORA)).toHaveProperty('rango')
  })

  it.each([
    ['2025-11-04', '2025-11-10', 'desde', 'un año'],
    ['2026-11-01', '2026-11-06', 'hasta', 'futura'],
    ['2026-11-06', '2026-11-07', 'hasta', 'futura'],
    ['2026-10-10', '2026-10-09', 'hasta', 'anterior'],
    ['2026-10-04', '2026-11-05', 'hasta', 'mismo día del mes siguiente'],
    ['2026-10-01', '2026-11-02', 'hasta', 'del 1/10 al 1/11'],
    ['', '2026-11-05', 'desde', 'inicio'],
    ['2026-11-01', '', 'hasta', 'fin'],
  ])('rechaza del %s al %s en el campo %s', (desde, hasta, campo, texto) => {
    const resultado = rangoManual(desde, hasta, AHORA)
    expect(resultado).toMatchObject({ campo })
    expect('error' in resultado && resultado.error).toContain(texto)
  })
})
