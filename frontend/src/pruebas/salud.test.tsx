import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONDICIONES, ESTACION, RECOMENDACION, abrir, simularApi } from './ayudantes'

const HISTORICO = {
  estacion_id: 1,
  sensor_id: 6,
  unidad: '°C',
  desde: '2026-11-01T00:00:00-03:00',
  hasta: '2026-11-01T23:59:00-03:00',
  puntos: [],
  resumen: { maximo: null, minimo: null, promedio: null, cantidad: 0 },
}

function simular(condiciones: object = CONDICIONES) {
  simularApi({
    'GET /estaciones': { cuerpo: [ESTACION] },
    'GET /estaciones/1/recomendacion': { cuerpo: RECOMENDACION },
    'GET /estaciones/1/condiciones-actuales': { cuerpo: condiciones },
    'GET /estaciones/1/sensores/6/historico': { cuerpo: HISTORICO },
  })
}

function franja() {
  return screen.findByRole('region', { name: 'Salud de la estación' })
}

describe('salud de la estación', () => {
  it.each([
    ['EN_VIVO', 'En vivo', 'estado-apto'],
    ['CON_DEMORAS', 'Con demoras', 'estado-precaucion'],
    ['CAIDO', 'Caído', 'estado-no-aplicar'],
    ['MODO_PRUEBA', 'Modo prueba', 'estado-neutro'],
  ])('%s muestra su texto y su color', async (salud, texto, clase) => {
    simular({ ...CONDICIONES, salud })
    abrir('/estaciones/1')

    const seccion = await franja()

    expect(seccion).toHaveClass(clase)
    expect(within(seccion).getByText(texto)).toBeInTheDocument()
  })

  it('muestra el último intento con su resultado y el último dato de SAT2', async () => {
    simular({
      ...CONDICIONES,
      salud: 'CON_DEMORAS',
      ultimo_intento: { en: '2026-11-01T22:51:00-03:00', resultado: 'ERROR' },
    })
    abrir('/estaciones/1')

    const seccion = await franja()

    expect(seccion).toHaveTextContent('Último intento de ingesta01/11/2026 22:51, terminó con error')
    expect(seccion).toHaveTextContent('Último dato de SAT201/11/2026 22:40')
  })

  it('sin ciclos ni datos lo dice', async () => {
    simular({ ...CONDICIONES, salud: 'CAIDO', ultimo_intento: null, medido_en: null })
    abrir('/estaciones/1')

    const seccion = await franja()

    expect(seccion).toHaveTextContent('Sin ciclos todavía')
    expect(seccion).toHaveTextContent('Sin datos')
  })

  it('aparece también en el detalle de un sensor', async () => {
    simular({ ...CONDICIONES, salud: 'CAIDO' })
    abrir('/estaciones/1/sensores/6')

    expect(within(await franja()).getByText('Caído')).toBeInTheDocument()
  })
})

describe('reloj de la estación', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    // 22:30:30 en Argentina (UTC−3), sin importar la zona del equipo que corre la prueba.
    vi.setSystemTime(new Date('2026-11-02T01:30:30Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('muestra la hora de Argentina y avanza al cambiar el minuto', async () => {
    simular()
    abrir('/estaciones/1')

    const seccion = await franja()
    expect(seccion).toHaveTextContent('Hora actual (Argentina, UTC−3)01/11/2026 22:30')

    await act(() => vi.advanceTimersByTimeAsync(30_000))

    expect(seccion).toHaveTextContent('Hora actual (Argentina, UTC−3)01/11/2026 22:31')
  })
})
