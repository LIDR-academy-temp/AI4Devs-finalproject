import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  CONDICIONES,
  ESTACION,
  INACTIVA,
  NO_AUTENTICADO,
  OTRA,
  RECOMENDACION,
  abrir,
  simularApi,
} from './ayudantes'
import type { Simulada } from './ayudantes'
import { fechaDeArgentina, formatearFecha, primerDiaPermitido } from '../servicios/serie'

vi.mock('../componentes/GraficoSerie', () => ({
  GraficoSerie: ({ puntos, titulo }: { puntos: unknown[]; titulo: string }) => (
    <div role="img" aria-label={titulo}>
      {puntos.length} puntos
    </div>
  ),
}))

function historico(cantidad: number) {
  return {
    sensor_id: 6,
    unidad: '°C',
    desde: '2026-10-25T00:00:00-03:00',
    hasta: '2026-11-01T00:00:00-03:00',
    resumen:
      cantidad > 0
        ? { maximo: 29.5, minimo: 13, promedio: 20.91, cantidad }
        : { maximo: null, minimo: null, promedio: null, cantidad: 0 },
    puntos: cantidad > 0 ? [{ medido_en: '2026-10-25T00:00:00-03:00', valor: 20, calidad: 'OK' }] : [],
  }
}

async function completarAcceso(contrasena = 'clave') {
  const usuario = userEvent.setup()
  await usuario.type(await screen.findByLabelText('Correo'), 'a@b.example')
  await usuario.type(screen.getByLabelText('Contraseña'), contrasena)
  return usuario
}

describe('acceso', () => {
  it('sin sesión muestra la pantalla de acceso con registro y recupero', async () => {
    simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir()
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Crear una cuenta' })).toHaveAttribute('href', '/registro')
    expect(screen.getByRole('link', { name: '¿Olvidó su contraseña?' })).toHaveAttribute('href', '/recuperar')
    expect(screen.queryByRole('link', { name: /confirmación/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('con credenciales válidas entra a la aplicación', async () => {
    let conSesion = false
    simularApi({
      'GET /estaciones': () =>
        conSesion ? { cuerpo: [ESTACION, OTRA] } : NO_AUTENTICADO,
      'POST /auth/login': () => {
        conSesion = true
        return { cuerpo: { email: 'a@b.example', nombre: 'A' } }
      },
      'GET /estaciones/1/recomendacion': { cuerpo: RECOMENDACION },
      'GET /estaciones/1/condiciones-actuales': { cuerpo: CONDICIONES },
    })
    abrir()
    const usuario = await completarAcceso()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Estación Norte' })).toBeInTheDocument()
  })

  it('muestra el error genérico y borra la contraseña', async () => {
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/login': {
        estado: 401,
        cuerpo: { codigo: 'CREDENCIALES_INVALIDAS', mensaje: 'Correo o contraseña incorrectos.' },
      },
    })
    abrir()
    const usuario = await completarAcceso()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.')
    expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  })

  it('informa el bloqueo por demasiados intentos', async () => {
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/login': {
        estado: 429,
        cuerpo: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos.' },
      },
    })
    abrir()
    const usuario = await completarAcceso()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos.')
  })

  it('informa la falta de conexión', async () => {
    simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir()
    const usuario = await completarAcceso()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión con el servidor.')
  })

  it('deshabilita el botón mientras envía', async () => {
    let responder: (valor: Simulada) => void = () => undefined
    simularApi({
      'GET /estaciones': NO_AUTENTICADO,
      'POST /auth/login': () => new Promise<Simulada>((resolver) => (responder = resolver)),
    })
    abrir()
    const usuario = await completarAcceso()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled()
    responder({ estado: 401, cuerpo: { codigo: 'X', mensaje: 'Error.' } })
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeEnabled()
  })

  it('la sesión vencida lleva a la pantalla de acceso con un aviso', async () => {
    let vencida = false
    simularApi({
      'GET /estaciones': () => (vencida ? NO_AUTENTICADO : { cuerpo: [ESTACION, OTRA] }),
      'GET /estaciones/1/recomendacion': NO_AUTENTICADO,
      'GET /estaciones/1/condiciones-actuales': () => {
        vencida = true
        return NO_AUTENTICADO
      },
    })
    abrir()
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Su sesión venció')
  })

  it('al salir cierra la sesión y vuelve al acceso', async () => {
    const llamadas = simularApi({
      'GET /estaciones': { cuerpo: [ESTACION, OTRA] },
      'POST /auth/logout': { estado: 204 },
    })
    const usuario = userEvent.setup()
    abrir()
    await usuario.click(await screen.findByRole('button', { name: 'Salir' }))
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(llamadas).toContain('POST /auth/logout')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

const RUTAS_NORTE = {
  'GET /estaciones/1/recomendacion': { cuerpo: RECOMENDACION },
  'GET /estaciones/1/condiciones-actuales': { cuerpo: CONDICIONES },
}

const CONDICIONES_INACTIVA = {
  ...CONDICIONES,
  estacion_id: 3,
  estacion_nombre: 'Estación Oeste',
  activa: false,
  inactiva_desde: '2026-10-30T09:00:00-03:00',
}

describe('selección de estación', () => {
  it('con una sola estación la abre y el selector la muestra como única opción', async () => {
    simularApi({ 'GET /estaciones': { cuerpo: [ESTACION] }, ...RUTAS_NORTE })
    abrir()
    expect(await screen.findByRole('heading', { name: 'Estación Norte' })).toBeInTheDocument()
    const selector = screen.getByRole('combobox', { name: 'Estación' })
    expect(selector).toHaveValue('1')
    expect(within(selector).getAllByRole('option')).toHaveLength(1)
  })

  it('con varias estaciones abre la primera activa y permite elegir otra', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [INACTIVA, ESTACION, OTRA] },
      ...RUTAS_NORTE,
      'GET /estaciones/2/recomendacion': { cuerpo: { ...RECOMENDACION, estacion_id: 2 } },
      'GET /estaciones/2/condiciones-actuales': {
        cuerpo: { ...CONDICIONES, estacion_id: 2, estacion_nombre: 'Estación Sur' },
      },
    })
    const usuario = userEvent.setup()
    abrir()
    expect(await screen.findByRole('heading', { name: 'Estación Norte' })).toBeInTheDocument()
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Estación' }), 'Estación Sur')
    expect(await screen.findByRole('heading', { name: 'Estación Sur' })).toBeInTheDocument()
  })

  it('marca las estaciones inactivas en el selector', async () => {
    simularApi({ 'GET /estaciones': { cuerpo: [ESTACION, INACTIVA] }, ...RUTAS_NORTE })
    abrir()
    await screen.findByRole('heading', { name: 'Estación Norte' })
    expect(
      screen.getByRole('option', { name: 'Estación Oeste (Equipo inactivo)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Estación Norte' })).toBeInTheDocument()
  })

  it('sin estaciones lo informa', async () => {
    simularApi({ 'GET /estaciones': { cuerpo: [] } })
    abrir()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Aún no se recibieron estaciones de la fuente de datos',
      ),
    )
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('una estación ajena muestra el mensaje de la API y ningún dato', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [ESTACION] },
      'GET /estaciones/7/recomendacion': {
        estado: 403,
        cuerpo: { codigo: 'SIN_ACCESO', mensaje: 'No tiene acceso a esta estación.' },
      },
      'GET /estaciones/7/condiciones-actuales': {
        estado: 403,
        cuerpo: { codigo: 'SIN_ACCESO', mensaje: 'No tiene acceso a esta estación.' },
      },
    })
    abrir('/estaciones/7')
    expect(await screen.findByRole('alert')).toHaveTextContent('No tiene acceso a esta estación.')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('muestra los sensores con valor y unidad, y raya si falta el dato', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [ESTACION] },
      'GET /estaciones/1/recomendacion': { cuerpo: RECOMENDACION },
      'GET /estaciones/1/condiciones-actuales': { cuerpo: CONDICIONES },
    })
    abrir('/estaciones/1')
    const temperatura = await screen.findByRole('link', { name: /Temp Amb/ })
    expect(temperatura).toHaveTextContent('20,3')
    expect(temperatura).toHaveTextContent('°C')
    const viento = screen.getByRole('link', { name: /Anemómetro/ })
    expect(viento).toHaveTextContent('—')
    expect(viento).toHaveTextContent('km/h')
  })
})

describe('detalle e históricos', () => {
  function rutasDetalle(cantidad = 1008) {
    return {
      'GET /estaciones': { cuerpo: [ESTACION] },
      'GET /estaciones/1/condiciones-actuales': { cuerpo: CONDICIONES },
      'GET /estaciones/1/sensores/6/historico': { cuerpo: historico(cantidad) },
    }
  }

  it('muestra el valor actual, el resumen y el gráfico de 7 días', async () => {
    simularApi(rutasDetalle())
    abrir('/estaciones/1/sensores/6')
    expect(await screen.findByRole('heading', { name: 'Temp Amb. a 2 Mts' })).toBeInTheDocument()
    expect(await screen.findByText('29,5')).toBeInTheDocument()
    expect(screen.getByText('20,91')).toBeInTheDocument()
    expect(screen.getByText('1.008')).toBeInTheDocument()
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Temp Amb. a 2 Mts: últimos 7 días, en °C',
    )
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('consulta 31 días al elegir Mes', async () => {
    const llamadas = simularApi(rutasDetalle())
    const usuario = userEvent.setup()
    abrir('/estaciones/1/sensores/6')
    await screen.findByText('29,5')
    await usuario.click(screen.getByRole('button', { name: 'Mes' }))

    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAccessibleName(
        'Temp Amb. a 2 Mts: últimos 31 días, en °C',
      ),
    )
    const consultas = llamadas
      .filter((l) => l.includes('/historico'))
      .map((l) => new URLSearchParams(l.split('?')[1]))
    const dias = consultas.map(
      (c) => (Date.parse(c.get('hasta')!) - Date.parse(c.get('desde')!)) / 86_400_000,
    )
    expect(dias[0]).toBeCloseTo(7)
    expect(dias.at(-1)).toBeCloseTo(31)
  })

  it('consulta las últimas 24 horas al elegir Día', async () => {
    const llamadas = simularApi(rutasDetalle())
    const usuario = userEvent.setup()
    abrir('/estaciones/1/sensores/6')
    await screen.findByText('29,5')
    await usuario.click(screen.getByRole('button', { name: 'Día' }))
    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAccessibleName(
        'Temp Amb. a 2 Mts: últimas 24 horas, en °C',
      ),
    )
    const ultima = new URLSearchParams(llamadas.filter((l) => l.includes('/historico')).at(-1)!.split('?')[1])
    expect((Date.parse(ultima.get('hasta')!) - Date.parse(ultima.get('desde')!)) / 3_600_000).toBeCloseTo(24)
  })

  it('consulta un rango manual de días completos en hora de Argentina', async () => {
    const llamadas = simularApi(rutasDetalle())
    const usuario = userEvent.setup()
    abrir('/estaciones/1/sensores/6')
    await screen.findByText('29,5')
    await usuario.click(screen.getByRole('button', { name: 'Elegir fechas' }))
    const hace = (dias: number) => fechaDeArgentina(new Date(Date.now() - dias * 86_400_000))
    const desde = screen.getByLabelText('Desde')
    expect(desde).toHaveAttribute('min', primerDiaPermitido(new Date()))
    expect(desde).toHaveAttribute('max', fechaDeArgentina(new Date()))
    fireEvent.change(desde, { target: { value: hace(10) } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: hace(4) } })
    await usuario.click(screen.getByRole('button', { name: 'Ver el período' }))

    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAccessibleName(
        `Temp Amb. a 2 Mts: del ${formatearFecha(hace(10))} al ${formatearFecha(hace(4))}, en °C`,
      ),
    )
    const ultima = new URLSearchParams(llamadas.filter((l) => l.includes('/historico')).at(-1)!.split('?')[1])
    expect(new Date(ultima.get('desde')!)).toEqual(new Date(`${hace(10)}T00:00:00-03:00`))
    expect(new Date(ultima.get('hasta')!)).toEqual(new Date(`${hace(4)}T23:59:59.999-03:00`))
  })

  it.each([
    ['más de 31 días', 40, 0, 'Hasta', '31 días'],
    ['el fin antes del inicio', 3, 5, 'Hasta', 'anterior'],
    ['más de un año atrás', 400, 390, 'Desde', 'un año'],
  ])('un rango manual con %s se explica y no se consulta', async (_caso, inicio, fin, campo, texto) => {
    const llamadas = simularApi(rutasDetalle())
    const usuario = userEvent.setup()
    abrir('/estaciones/1/sensores/6')
    await screen.findByText('29,5')
    const antes = llamadas.length
    await usuario.click(screen.getByRole('button', { name: 'Elegir fechas' }))
    const hace = (dias: number) => fechaDeArgentina(new Date(Date.now() - dias * 86_400_000))
    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: hace(inicio) } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: hace(fin) } })
    await usuario.click(screen.getByRole('button', { name: 'Ver el período' }))
    expect(screen.getByLabelText(campo)).toHaveAccessibleDescription(new RegExp(texto))
    expect(llamadas.slice(antes).filter((l) => l.includes('/historico'))).toEqual([])
  })

  it('avisa cuando el período no tiene datos válidos', async () => {
    simularApi(rutasDetalle(0))
    abrir('/estaciones/1/sensores/6')
    expect(await screen.findByText('No hay datos válidos en este período.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('informa si falla la consulta de históricos', async () => {
    simularApi({
      ...rutasDetalle(),
      'GET /estaciones/1/sensores/6/historico': {
        estado: 500,
        cuerpo: { codigo: 'ERROR', mensaje: 'Falló.' },
      },
    })
    abrir('/estaciones/1/sensores/6')
    expect(await screen.findByRole('alert')).toHaveTextContent('Falló.')
  })

  it('tiene un enlace para volver a la estación', async () => {
    simularApi(rutasDetalle())
    abrir('/estaciones/1/sensores/6')
    expect(await screen.findByRole('link', { name: /Volver/ })).toHaveAttribute(
      'href',
      '/estaciones/1',
    )
  })
})

describe('equipo inactivo', () => {
  it('muestra la leyenda y sus sensores, sin recomendación ni tarjetas', async () => {
    const llamadas = simularApi({
      'GET /estaciones': { cuerpo: [ESTACION, INACTIVA] },
      'GET /estaciones/3/condiciones-actuales': { cuerpo: CONDICIONES_INACTIVA },
    })
    abrir('/estaciones/3')
    expect(await screen.findByRole('heading', { name: 'Estación Oeste' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Equipo inactivo - solo históricos')
    expect(screen.getByRole('status')).toHaveTextContent('30/10/2026 09:00')
    const sensores = screen.getByRole('list', { name: 'Sensores' })
    expect(within(sensores).getByRole('link', { name: 'Temp Amb. a 2 Mts' })).toHaveAttribute(
      'href',
      '/estaciones/3/sensores/6',
    )
    expect(
      screen.queryByRole('region', { name: 'Recomendación de aplicación' }),
    ).not.toBeInTheDocument()
    expect(within(sensores).queryByText(/20,3/)).not.toBeInTheDocument()
    expect(llamadas).not.toContain('GET /estaciones/3/recomendacion')
  })

  it('lleva al histórico del sensor', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [INACTIVA] },
      'GET /estaciones/3/condiciones-actuales': { cuerpo: CONDICIONES_INACTIVA },
      'GET /estaciones/3/sensores/6/historico': { cuerpo: historico(12) },
    })
    const usuario = userEvent.setup()
    abrir()
    await usuario.click(await screen.findByRole('link', { name: 'Temp Amb. a 2 Mts' }))
    expect(await screen.findByRole('img')).toHaveAccessibleName(
      'Temp Amb. a 2 Mts: últimos 7 días, en °C',
    )
  })
})

describe('avisos del modo de datos', () => {
  it.each([
    ['simulado', 'Datos simulados'],
    ['prueba', 'Modo de prueba'],
  ])('en modo %s avisa en todas las pantallas', async (modo, texto) => {
    simularApi({
      'GET /salud': { cuerpo: { estado: 'ok', modo } },
      'GET /estaciones': NO_AUTENTICADO,
    })
    abrir()
    expect(await screen.findByRole('note')).toHaveTextContent(texto)
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
  })

  it('en modo real no muestra ningún aviso', async () => {
    simularApi({
      'GET /salud': { cuerpo: { estado: 'ok', modo: 'real' } },
      'GET /estaciones': { cuerpo: [ESTACION] },
      ...RUTAS_NORTE,
    })
    abrir()
    await screen.findByRole('heading', { name: 'Estación Norte' })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})
