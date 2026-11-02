import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { ProveedorDeSesion } from '../servicios/sesion'

vi.mock('../componentes/GraficoSerie', () => ({
  GraficoSerie: ({ puntos, titulo }: { puntos: unknown[]; titulo: string }) => (
    <div role="img" aria-label={titulo}>
      {puntos.length} puntos
    </div>
  ),
}))

interface Simulada {
  estado?: number
  cuerpo?: unknown
}

type Rutas = Record<string, Simulada | (() => Simulada | Promise<Simulada>)>

const ESTACION = { id: 1, nombre: 'Estación Norte', latitud: '-34', longitud: '-60' }
const OTRA = { id: 2, nombre: 'Estación Sur', latitud: '-35', longitud: '-61' }
const NO_AUTENTICADO = {
  estado: 401,
  cuerpo: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión ausente o vencida.' },
}

const CONDICIONES = {
  estacion_id: 1,
  estacion_nombre: 'Estación Norte',
  medido_en: '2026-11-01T22:40:00-03:00',
  antiguedad_segundos: 120,
  estado_datos: 'VIGENTE',
  ultima_ingesta_exitosa_en: '2026-11-01T22:41:00-03:00',
  ultima_ingesta_con_error: false,
  sensores: [
    {
      sensor_id: 6,
      nombre: 'Temp Amb. a 2 Mts',
      magnitud: 'TEMPERATURA',
      altura_m: 2,
      valor: 20.3,
      unidad: '°C',
      calidad: 'OK',
      alarma: false,
    },
    {
      sensor_id: 9,
      nombre: 'Anemómetro',
      magnitud: 'VIENTO_VELOCIDAD',
      altura_m: null,
      valor: null,
      unidad: 'km/h',
      calidad: 'FALTANTE',
      alarma: null,
    },
  ],
}

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

function simularApi(rutas: Rutas) {
  const llamadas: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, opciones?: RequestInit) => {
      const clave = `${opciones?.method ?? 'GET'} ${url.split('?')[0].replace('/api/v1', '')}`
      llamadas.push(`${clave}${url.includes('?') ? `?${url.split('?')[1]}` : ''}`)
      const entrada = rutas[clave]
      if (!entrada) {
        throw new TypeError(`Sin respuesta simulada: ${clave}`)
      }
      const { estado = 200, cuerpo } = typeof entrada === 'function' ? await entrada() : entrada
      return new Response(estado === 204 ? null : JSON.stringify(cuerpo), { status: estado })
    }),
  )
  return llamadas
}

function abrir(ruta = '/') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ProveedorDeSesion>
        <App />
      </ProveedorDeSesion>
    </MemoryRouter>,
  )
}

async function completarAcceso(contrasena = 'clave') {
  const usuario = userEvent.setup()
  await usuario.type(await screen.findByLabelText('Correo'), 'a@b.example')
  await usuario.type(screen.getByLabelText('Contraseña'), contrasena)
  return usuario
}

describe('acceso', () => {
  it('sin sesión muestra la pantalla de acceso y no ofrece registrarse', async () => {
    simularApi({ 'GET /estaciones': NO_AUTENTICADO })
    abrir()
    expect(await screen.findByRole('button', { name: 'Ingresar' })).toBeInTheDocument()
    expect(screen.queryByText(/registr/i)).not.toBeInTheDocument()
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
    })
    abrir()
    const usuario = await completarAcceso()
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Elija una estación' })).toBeInTheDocument()
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
      'GET /estaciones/1/condiciones-actuales': () => {
        vencida = true
        return NO_AUTENTICADO
      },
    })
    const usuario = userEvent.setup()
    abrir()
    await usuario.click(await screen.findByRole('link', { name: 'Estación Norte' }))
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

describe('selección de estación', () => {
  it('con una sola estación la abre directamente', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [ESTACION] },
      'GET /estaciones/1/condiciones-actuales': { cuerpo: CONDICIONES },
    })
    abrir()
    expect(await screen.findByRole('heading', { name: 'Estación Norte' })).toBeInTheDocument()
    expect(screen.queryByText('Elija una estación')).not.toBeInTheDocument()
  })

  it('con varias estaciones permite elegir', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [ESTACION, OTRA] },
      'GET /estaciones/2/condiciones-actuales': {
        cuerpo: { ...CONDICIONES, estacion_id: 2, estacion_nombre: 'Estación Sur' },
      },
    })
    const usuario = userEvent.setup()
    abrir()
    await usuario.click(await screen.findByRole('link', { name: 'Estación Sur' }))
    expect(await screen.findByRole('heading', { name: 'Estación Sur' })).toBeInTheDocument()
  })

  it('sin estaciones lo informa', async () => {
    simularApi({ 'GET /estaciones': { cuerpo: [] } })
    abrir()
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No tiene estaciones asignadas'),
    )
  })

  it('una estación ajena muestra el mensaje de la API y ningún dato', async () => {
    simularApi({
      'GET /estaciones': { cuerpo: [ESTACION] },
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
    expect(screen.getByRole('button', { name: 'Últimos 7 días' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('consulta 31 días al elegir ese rango', async () => {
    const llamadas = simularApi(rutasDetalle())
    const usuario = userEvent.setup()
    abrir('/estaciones/1/sensores/6')
    await screen.findByText('29,5')
    await usuario.click(screen.getByRole('button', { name: 'Últimos 31 días' }))

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
