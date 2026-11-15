import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONDICIONES, ESTACION, RECOMENDACION, abrir, simularApi } from './ayudantes'
import type { Rutas, Simulada } from './ayudantes'

const RUTA = '/estaciones/1'
const SESION = { 'GET /estaciones': { cuerpo: [ESTACION] } }

function rutas(recomendacion: object = RECOMENDACION, condiciones: object = CONDICIONES): Rutas {
  return {
    ...SESION,
    'GET /estaciones/1/recomendacion': { cuerpo: recomendacion },
    'GET /estaciones/1/condiciones-actuales': { cuerpo: condiciones },
  }
}

function bloque() {
  return screen.findByRole('region', { name: 'Recomendación de aplicación' })
}

function sensorCon(cambios: object) {
  return { ...CONDICIONES, sensores: [{ ...CONDICIONES.sensores[0], ...cambios }] }
}

describe('estados de la recomendación', () => {
  it.each([
    ['APTO', 'Apto para aplicar', '✓', 'estado-apto'],
    ['PRECAUCION', 'Precaución', '!', 'estado-precaucion'],
    ['RIESGO_DERIVA', 'Riesgo de deriva', '▲', 'estado-riesgo'],
    ['NO_APLICAR', 'No aplicar', '✕', 'estado-no-aplicar'],
  ])('%s muestra texto, ícono, color, índice y aviso', async (estado, texto, icono, clase) => {
    simularApi(rutas({ ...RECOMENDACION, estado, indice: 42.5, delta_t_c: 1.5 }))
    abrir(RUTA)

    const seccion = await bloque()

    expect(seccion).toHaveClass(clase)
    expect(seccion).toHaveTextContent(texto)
    expect(seccion).toHaveTextContent(icono)
    expect(seccion).toHaveTextContent('42,5')
    expect(seccion).toHaveTextContent('1,5 °C')
    expect(seccion).toHaveTextContent('01/11/2026 22:40')
    expect(seccion).toHaveTextContent('Recomendación orientativa')
    expect(seccion).toHaveTextContent('Método TIS-1.1')
  })

  it('con datos insuficientes no muestra índice ni sugiere aplicar', async () => {
    simularApi(
      rutas({
        ...RECOMENDACION,
        estado: 'DATOS_INSUFICIENTES',
        indice: null,
        delta_t_c: null,
        inversion_detectada: null,
        motivos: [
          { codigo: 'DATOS_DESACTUALIZADOS', detalle: 'La última medición tiene 45 minutos.' },
        ],
      }),
    )
    abrir(RUTA)

    const seccion = await bloque()

    expect(seccion).toHaveClass('estado-neutro')
    expect(seccion).toHaveTextContent('Datos insuficientes')
    expect(seccion).toHaveTextContent('La última medición tiene 45 minutos.')
    expect(seccion).toHaveTextContent('Recomendación orientativa')
    expect(seccion).not.toHaveTextContent('Índice TIS')
    expect(seccion).not.toHaveTextContent(/apto/i)
  })

  it('un estado desconocido no se presenta como favorable', async () => {
    simularApi(rutas({ ...RECOMENDACION, estado: 'OTRO' }))
    abrir(RUTA)
    expect(await bloque()).toHaveTextContent('Datos insuficientes')
  })

  it('muestra todos los motivos', async () => {
    simularApi(
      rutas({
        ...RECOMENDACION,
        estado: 'NO_APLICAR',
        indice: 66,
        motivos: [
          { codigo: 'INVERSION_DETECTADA', detalle: 'Hay inversión.' },
          { codigo: 'DATO_SOSPECHOSO', detalle: 'Lecturas sospechosas.' },
          { codigo: 'INDICE_ELEVADO', detalle: 'Índice alto.' },
        ],
      }),
    )
    abrir(RUTA)
    const motivos = within(await bloque()).getByRole('list', { name: 'Motivos' })
    expect(within(motivos).getAllByRole('listitem').map((m) => m.textContent)).toEqual([
      'Hay inversión.',
      'Lecturas sospechosas.',
      'Índice alto.',
    ])
  })
})

describe('tarjetas de sensores', () => {
  it('muestra valor y unidad, sin marcas si el dato es válido', async () => {
    simularApi(rutas())
    abrir(RUTA)
    const tarjeta = await screen.findByRole('link', { name: /Temp Amb/ })
    expect(tarjeta).toHaveTextContent('20,3')
    expect(tarjeta).toHaveTextContent('°C')
    expect(tarjeta).not.toHaveTextContent('sospechoso')
    expect(tarjeta).not.toHaveTextContent('alarma')
    expect(tarjeta).toHaveAttribute('href', '/estaciones/1/sensores/6')
  })

  it('un dato faltante se marca y no muestra valor', async () => {
    simularApi(rutas())
    abrir(RUTA)
    const tarjeta = await screen.findByRole('link', { name: /Anemómetro/ })
    expect(tarjeta).toHaveTextContent('—')
    expect(tarjeta).toHaveTextContent('Sin dato válido')
    expect(tarjeta).toHaveClass('tarjeta-faltante')
  })

  it('un dato sospechoso conserva el valor y muestra la advertencia', async () => {
    simularApi(rutas(RECOMENDACION, sensorCon({ valor: 0, calidad: 'SOSPECHOSO' })))
    abrir(RUTA)
    const tarjeta = await screen.findByRole('link', { name: /Temp Amb/ })
    expect(tarjeta).toHaveTextContent('0')
    expect(tarjeta).toHaveTextContent('Dato sospechoso')
    expect(tarjeta).toHaveClass('tarjeta-sospechosa')
  })

  it('una alarma se destaca sin cambiar la recomendación', async () => {
    simularApi(rutas(RECOMENDACION, sensorCon({ alarma: true })))
    abrir(RUTA)
    const tarjeta = await screen.findByRole('link', { name: /Temp Amb/ })
    expect(tarjeta).toHaveTextContent('En alarma')
    expect(tarjeta).toHaveClass('tarjeta-alarma')
    expect(await bloque()).toHaveTextContent('Apto para aplicar')
  })
})

describe('avisos de la fuente de datos', () => {
  it('avisa si falló la conexión con la fuente e informa la última ingesta', async () => {
    simularApi(rutas(RECOMENDACION, { ...CONDICIONES, ultima_ingesta_con_error: true }))
    abrir(RUTA)
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('Sin conexión con la fuente de datos')
    expect(aviso).toHaveTextContent('01/11/2026 22:41')
  })

  it('no muestra el aviso si la fuente responde', async () => {
    simularApi(rutas())
    abrir(RUTA)
    await bloque()
    expect(screen.queryByText(/Sin conexión con la fuente/)).not.toBeInTheDocument()
  })

  it('avisa si los datos están desactualizados', async () => {
    simularApi(rutas(RECOMENDACION, { ...CONDICIONES, estado_datos: 'DESACTUALIZADO' }))
    abrir(RUTA)
    expect(await screen.findByText('Los datos están desactualizados.')).toBeInTheDocument()
  })
})

describe('actualización automática', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-11-02T01:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function avanzar(milisegundos: number) {
    await act(() => vi.advanceTimersByTimeAsync(milisegundos))
  }

  it('consulta cada 60 segundos y muestra los datos nuevos sin recargar', async () => {
    let actual = RECOMENDACION
    const llamadas = simularApi({
      ...rutas(),
      'GET /estaciones/1/recomendacion': () => ({ cuerpo: actual }),
    })
    abrir(RUTA)
    expect(await bloque()).toHaveTextContent('Apto para aplicar')
    const contar = () => llamadas.filter((l) => l.endsWith('/recomendacion')).length
    expect(contar()).toBe(1)

    actual = { ...RECOMENDACION, estado: 'NO_APLICAR', indice: 70 }
    await avanzar(59_000)
    expect(contar()).toBe(1)
    await avanzar(1_000)

    expect(contar()).toBe(2)
    expect(await bloque()).toHaveTextContent('No aplicar')
  })

  it('informa la hora de la última actualización en hora de Argentina', async () => {
    simularApi(rutas())
    abrir(RUTA)
    expect(await screen.findByText(/Última actualización de la pantalla: 22:30/)).toBeInTheDocument()
  })

  it('tras una falla de red el estado anterior deja de presentarse como vigente', async () => {
    let fallar = false
    const respuesta = (cuerpo: object) => (): Simulada => {
      if (fallar) {
        throw new TypeError('sin red')
      }
      return { cuerpo }
    }
    simularApi({
      ...SESION,
      'GET /estaciones/1/recomendacion': respuesta(RECOMENDACION),
      'GET /estaciones/1/condiciones-actuales': respuesta(CONDICIONES),
    })
    abrir(RUTA)
    expect(await bloque()).toHaveTextContent('Apto para aplicar')

    fallar = true
    await avanzar(60_000)

    const seccion = await bloque()
    expect(seccion).toHaveClass('estado-neutro')
    expect(seccion).not.toHaveClass('estado-apto')
    expect(within(seccion).getByText('Sin conexión')).toBeInTheDocument()
    expect(within(seccion).queryByText('Índice TIS')).not.toBeInTheDocument()
    expect(within(seccion).getByRole('alert')).toHaveTextContent(
      'puede no estar vigente. Último estado conocido: Apto para aplicar',
    )
  })

  it('se recupera cuando vuelve la conexión', async () => {
    let fallar = true
    const llamadas = simularApi({
      ...SESION,
      'GET /estaciones/1/recomendacion': () => {
        if (fallar) {
          throw new TypeError('sin red')
        }
        return { cuerpo: RECOMENDACION }
      },
      'GET /estaciones/1/condiciones-actuales': { cuerpo: CONDICIONES },
    })
    abrir(RUTA)
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión')
    expect(llamadas).toContain('GET /estaciones/1/recomendacion')

    fallar = false
    await avanzar(60_000)
    expect(await bloque()).toHaveTextContent('Apto para aplicar')
  })

  it('deja de consultar al salir de la pantalla', async () => {
    const llamadas = simularApi(rutas())
    const { unmount } = abrir(RUTA)
    await bloque()
    unmount()
    const antes = llamadas.length
    await avanzar(180_000)
    expect(llamadas.length).toBe(antes)
  })

  it('actualiza al volver a primer plano', async () => {
    const llamadas = simularApi(rutas())
    abrir(RUTA)
    await bloque()
    const contar = () => llamadas.filter((l) => l.endsWith('/recomendacion')).length
    expect(contar()).toBe(1)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(contar()).toBe(2)
  })
})
