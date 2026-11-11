import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ESTACION, abrir, simularApi } from './ayudantes'
import type { Rutas } from './ayudantes'

// Valores ficticios: nunca credenciales reales de SAT2.
const URL_SAT2 = 'https://sat2.ejemplo.invalid/api'
const ADMIN = 'admin@campo.example'

function cuenta(esAdministrador: boolean) {
  return {
    email: esAdministrador ? ADMIN : 'ana@campo.example',
    nombre: 'Ana',
    apellido: 'Pérez',
    organizacion: null,
    telefono: null,
    localidad: 'Pergamino',
    provincia: 'Buenos Aires',
    acepta_novedades: false,
    terminos_version: '2026-11',
    es_administrador: esAdministrador,
  }
}

const SIN_CONFIGURACION = {
  configuracion_guardada: false,
  puede_guardar: true,
  modo: 'real',
  cargada_en: null,
  cargada_por: null,
  ultimo_ciclo: null,
  cambios: [],
}

const GUARDADA = {
  ...SIN_CONFIGURACION,
  configuracion_guardada: true,
  cargada_en: '2026-11-08T12:00:00Z',
  cargada_por: ADMIN,
  ultimo_ciclo: { resultado: 'EXITO', finalizado_en: '2026-11-08T12:10:00Z' },
  cambios: [
    { ocurrido_en: '2026-11-08T12:00:00Z', email: ADMIN },
    { ocurrido_en: '2026-11-07T15:30:00Z', email: 'otro@campo.example' },
  ],
}

const ESTADO_BIEN = {
  controles: [
    { tipo: 'DATOS_VIEJOS', objeto: 'INTA Pergamino', estado: 'OK', detalle: 'Última lectura hace 3 minutos.' },
    { tipo: 'CICLOS_FALLIDOS', objeto: 'INTA Pergamino', estado: 'OK', detalle: 'Los ciclos recientes terminaron bien.' },
    { tipo: 'DISCO_CASI_LLENO', objeto: '', estado: 'OK', detalle: 'Sin alertas de espacio en el disco de la base.' },
    { tipo: 'FUERZA_BRUTA', objeto: '', estado: 'OK', detalle: '0 ingresos fallidos en 15 minutos.' },
  ],
  worker: { estado: 'ACTIVO', ultimo_ciclo_en: '2026-11-11T15:00:00Z' },
  alertas: [],
  base_tamano_bytes: 157_286_400,
}

function rutas(esAdministrador: boolean, extra: Rutas = {}): Rutas {
  return {
    'GET /administracion/estado': { cuerpo: ESTADO_BIEN },
    'GET /estaciones': { cuerpo: [ESTACION] },
    'GET /estaciones/1/condiciones-actuales': { estado: 503, cuerpo: { codigo: 'X', mensaje: 'Sin datos.' } },
    'GET /estaciones/1/recomendacion': { estado: 503, cuerpo: { codigo: 'X', mensaje: 'Sin datos.' } },
    'GET /salud': { cuerpo: { estado: 'ok', modo: 'real' } },
    'GET /cuenta': { cuerpo: cuenta(esAdministrador) },
    ...extra,
  }
}

async function completar(direccion = URL_SAT2) {
  const usuario = userEvent.setup()
  await usuario.type(await screen.findByLabelText('Dirección de SAT2'), direccion)
  await usuario.type(screen.getByLabelText('Usuario de SAT2'), 'usuario-ficticio')
  await usuario.type(screen.getByLabelText('Contraseña de SAT2'), 'contrasena-ficticia')
  await usuario.type(screen.getByLabelText('Su contraseña de Weather Track'), 'una frase larga de prueba')
  return usuario
}

describe('opción de administración', () => {
  it('no aparece para una cuenta común, y la página no existe', async () => {
    const llamadas = simularApi(rutas(false))
    abrir('/administracion')

    expect(await screen.findByText('Esta página no existe.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
    expect(llamadas.some((llamada) => llamada.includes('/administracion'))).toBe(false)
  })

  it('no aparece si no se pudo saber el rol', async () => {
    const sinCuenta = rutas(false)
    delete sinCuenta['GET /cuenta']
    simularApi(sinCuenta)
    abrir('/administracion')

    expect(await screen.findByText('Esta página no existe.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument()
  })

  it('aparece para el administrador y abre la pantalla', async () => {
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION } }))
    abrir('/')

    await userEvent.setup().click(await screen.findByRole('link', { name: 'Administración' }))

    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument()
  })

  it('aparece al ingresar como administrador', async () => {
    // Sin sesión al abrir; después del ingreso, las estaciones responden. Un 401 después del
    // ingreso cerraría la sesión, como en la aplicación real.
    let sesionAbierta = false
    simularApi({
      ...rutas(true, { 'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION } }),
      'GET /estaciones': () =>
        sesionAbierta
          ? { cuerpo: [ESTACION] }
          : { estado: 401, cuerpo: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión ausente o vencida.' } },
      'POST /auth/login': () => {
        sesionAbierta = true
        return { cuerpo: { email: ADMIN, nombre: 'Ana', es_administrador: true } }
      },
    })
    abrir('/acceso')
    const usuario = userEvent.setup()
    await usuario.type(await screen.findByLabelText('Correo'), ADMIN)
    await usuario.type(screen.getByLabelText('Contraseña'), 'una frase larga de prueba')
    await usuario.click(screen.getByRole('button', { name: 'Ingresar' }))

    const enlace = await screen.findByRole('link', { name: 'Administración' })
    expect(enlace).toHaveAttribute('href', '/administracion')
    // Sigue visible después de que la pantalla de la estación consultó la API.
    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Administración' })).toBeInTheDocument()
  })
})

describe('pantalla de administración', () => {
  it('sin configuración guardada explica que se usan las variables del servidor', async () => {
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION } }))
    abrir('/administracion')

    const estado = await screen.findByRole('region', { name: 'Conexión con SAT2' })
    expect(estado).toHaveTextContent('No hay una configuración guardada')
    expect(estado).toHaveTextContent('la ingesta usa las variables del servidor')
    expect(screen.getByRole('button', { name: 'Guardar la configuración' })).toBeEnabled()
  })

  it('muestra quién y cuándo cargó la configuración, el último ciclo y los cambios', async () => {
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: GUARDADA } }))
    abrir('/administracion')

    const estado = await screen.findByRole('region', { name: 'Conexión con SAT2' })
    expect(estado).toHaveTextContent(`Cargada el 08/11/2026 09:00 por ${ADMIN}`)
    expect(estado).toHaveTextContent('Último ciclo: terminó bien el 08/11/2026 09:10')
    const cambios = within(screen.getByRole('region', { name: 'Últimos cambios' })).getAllByRole('listitem')
    expect(cambios.map((cambio) => cambio.textContent)).toEqual([
      `08/11/2026 09:00, ${ADMIN}`,
      '07/11/2026 12:30, otro@campo.example',
    ])
  })

  it('nunca muestra valores guardados en el formulario', async () => {
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: GUARDADA } }))
    abrir('/administracion')

    expect(await screen.findByLabelText('Dirección de SAT2')).toHaveValue('')
    expect(screen.getByLabelText('Usuario de SAT2')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña de SAT2')).toHaveValue('')
    expect(screen.getByLabelText('Contraseña de SAT2')).toHaveAttribute('type', 'password')
  })

  it('avisa un último ciclo con error', async () => {
    const conError = { ...GUARDADA, ultimo_ciclo: { resultado: 'ERROR', finalizado_en: '2026-11-08T12:10:00Z' } }
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: conError } }))
    abrir('/administracion')

    expect(await screen.findByRole('region', { name: 'Conexión con SAT2' })).toHaveTextContent(
      'Último ciclo: terminó con error el 08/11/2026 09:10',
    )
  })

  it('en un modo sin SAT2 aclara que la configuración se usa en modo real', async () => {
    simularApi(
      rutas(true, { 'GET /administracion/sat2': { cuerpo: { ...SIN_CONFIGURACION, modo: 'simulado' } } }),
    )
    abrir('/administracion')

    expect(await screen.findByRole('region', { name: 'Conexión con SAT2' })).toHaveTextContent(
      'El modo actual, simulado, no consulta SAT2',
    )
  })

  it('sin clave pública en el servidor no deja guardar', async () => {
    simularApi(
      rutas(true, { 'GET /administracion/sat2': { cuerpo: { ...SIN_CONFIGURACION, puede_guardar: false } } }),
    )
    abrir('/administracion')

    expect(await screen.findByRole('alert')).toHaveTextContent('Falta configurar en el servidor')
    expect(screen.getByRole('button', { name: 'Guardar la configuración' })).toBeDisabled()
  })

  it('guarda la configuración, vacía el formulario y muestra el estado nuevo', async () => {
    let enviado: unknown
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION },
        'PUT /administracion/sat2': (cuerpo) => {
          enviado = cuerpo
          return { cuerpo: GUARDADA }
        },
      }),
    )
    abrir('/administracion')
    const usuario = await completar()

    await usuario.click(screen.getByRole('button', { name: 'Guardar la configuración' }))

    expect(await screen.findByText(/^Configuración guardada. La ingesta la usa desde el próximo ciclo/)).toBeInTheDocument()
    expect(enviado).toEqual({
      url_base: URL_SAT2,
      usuario: 'usuario-ficticio',
      clave: 'contrasena-ficticia',
      contrasena_actual: 'una frase larga de prueba',
    })
    for (const etiqueta of ['Dirección de SAT2', 'Usuario de SAT2', 'Contraseña de SAT2', 'Su contraseña de Weather Track']) {
      expect(screen.getByLabelText(etiqueta)).toHaveValue('')
    }
    expect(screen.getByRole('region', { name: 'Conexión con SAT2' })).toHaveTextContent(`por ${ADMIN}`)
  })

  it('en un modo sin SAT2 aclara al guardar que se usará en modo real', async () => {
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: { ...SIN_CONFIGURACION, modo: 'prueba' } },
        'PUT /administracion/sat2': { cuerpo: { ...GUARDADA, modo: 'prueba' } },
      }),
    )
    abrir('/administracion')
    const usuario = await completar()

    await usuario.click(screen.getByRole('button', { name: 'Guardar la configuración' }))

    expect(await screen.findByText(/Se usará cuando el servidor funcione en modo real/)).toBeInTheDocument()
  })

  it('advierte una dirección sin cifrado', async () => {
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION } }))
    abrir('/administracion')
    const usuario = userEvent.setup()

    await usuario.type(await screen.findByLabelText('Dirección de SAT2'), 'http://sat2.ejemplo.invalid')

    expect(screen.getByLabelText('Dirección de SAT2')).toHaveAccessibleDescription(
      expect.stringContaining('viajarían sin cifrar'),
    )
  })

  it('muestra junto al campo el error de la contraseña del administrador', async () => {
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION },
        'PUT /administracion/sat2': {
          estado: 400,
          cuerpo: {
            codigo: 'CONTRASENA_INCORRECTA',
            mensaje: 'La contraseña no es correcta.',
            campos: { contrasena_actual: 'La contraseña no es correcta.' },
          },
        },
      }),
    )
    abrir('/administracion')
    const usuario = await completar()

    await usuario.click(screen.getByRole('button', { name: 'Guardar la configuración' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Su contraseña de Weather Track')).toHaveAccessibleDescription(
        expect.stringContaining('La contraseña no es correcta.'),
      ),
    )
    expect(screen.getByLabelText('Su contraseña de Weather Track')).toHaveValue('')
    expect(screen.getByLabelText('Dirección de SAT2')).toHaveValue(URL_SAT2)
  })

  it('muestra junto al campo un error de validación', async () => {
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION },
        'PUT /administracion/sat2': {
          estado: 422,
          cuerpo: { codigo: 'SOLICITUD_INVALIDA', mensaje: 'La solicitud no es válida.', campos: { url_base: 'Revise este dato.' } },
        },
      }),
    )
    abrir('/administracion')
    const usuario = await completar('https://sat2 mal')

    await usuario.click(screen.getByRole('button', { name: 'Guardar la configuración' }))

    await waitFor(() =>
      expect(screen.getByLabelText('Dirección de SAT2')).toHaveAccessibleDescription(
        expect.stringContaining('Revise este dato.'),
      ),
    )
  })
})

describe('estado del sistema', () => {
  it('muestra cada control con texto, el worker y el tamaño de la base', async () => {
    simularApi(rutas(true, { 'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION } }))
    abrir('/administracion')

    const panel = await screen.findByRole('region', { name: 'Estado del sistema' })
    const controles = within(await within(panel).findByRole('list', { name: 'Controles' })).getAllByRole('listitem')
    expect(controles.map((c) => c.textContent)).toEqual([
      'Datos viejos en INTA Pergamino: bien. Última lectura hace 3 minutos.',
      'Ciclos con error en INTA Pergamino: bien. Los ciclos recientes terminaron bien.',
      'Disco de la base: bien. Sin alertas de espacio en el disco de la base.',
      'Accesos por fuerza bruta: bien. 0 ingresos fallidos en 15 minutos.',
    ])
    expect(panel).toHaveTextContent('Proceso de ingesta: activo, último ciclo el 11/11/2026 12:00.')
    expect(panel).toHaveTextContent('Tamaño de la base: 150 MB.')
    expect(within(panel).getByText('Todavía no hubo alertas.')).toBeInTheDocument()
  })

  it('marca los controles en alerta y el worker sin actividad', async () => {
    const enAlerta = {
      ...ESTADO_BIEN,
      controles: [
        { tipo: 'DATOS_VIEJOS', objeto: 'INTA Pergamino', estado: 'ALERTA', detalle: 'Última lectura hace 47 minutos.' },
      ],
      worker: { estado: 'SIN_ACTIVIDAD', ultimo_ciclo_en: '2026-11-11T14:00:00Z' },
      alertas: [
        {
          tipo: 'DATOS_VIEJOS',
          objeto: 'INTA Pergamino',
          abierta_en: '2026-11-11T14:30:00Z',
          cerrada_en: null,
          detalle: 'Última lectura hace 47 minutos.',
        },
        {
          tipo: 'FUERZA_BRUTA',
          objeto: '',
          abierta_en: '2026-11-10T10:00:00Z',
          cerrada_en: '2026-11-10T10:30:00Z',
          detalle: '25 ingresos fallidos en 15 minutos.',
        },
      ],
    }
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION },
        'GET /administracion/estado': { cuerpo: enAlerta },
      }),
    )
    abrir('/administracion')

    const panel = await screen.findByRole('region', { name: 'Estado del sistema' })
    expect(await within(panel).findByRole('list', { name: 'Controles' })).toHaveTextContent(
      'Datos viejos en INTA Pergamino: en alerta. Última lectura hace 47 minutos.',
    )
    expect(panel).toHaveTextContent('Proceso de ingesta: sin actividad desde el 11/11/2026 11:00.')
    const historial = within(within(panel).getByRole('list', { name: 'Últimas alertas' })).getAllByRole('listitem')
    expect(historial.map((a) => a.textContent)).toEqual([
      'Datos viejos en INTA Pergamino, desde el 11/11/2026 11:30, sigue abierta. Última lectura hace 47 minutos.',
      'Accesos por fuerza bruta, del 10/11/2026 07:00 al 10/11/2026 07:30. 25 ingresos fallidos en 15 minutos.',
    ])
  })

  it('en modo prueba explica que no hay ciclos', async () => {
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION },
        'GET /administracion/estado': {
          cuerpo: { ...ESTADO_BIEN, worker: { estado: 'MODO_PRUEBA', ultimo_ciclo_en: null } },
        },
      }),
    )
    abrir('/administracion')

    const panel = await screen.findByRole('region', { name: 'Estado del sistema' })
    expect(await within(panel).findByText('Proceso de ingesta: en modo prueba no ejecuta ciclos.')).toBeInTheDocument()
  })

  it('si no se puede leer el estado, el resto de la pantalla sigue', async () => {
    simularApi(
      rutas(true, {
        'GET /administracion/sat2': { cuerpo: SIN_CONFIGURACION },
        'GET /administracion/estado': { estado: 500, cuerpo: { codigo: 'ERROR', mensaje: 'Falló.' } },
      }),
    )
    abrir('/administracion')

    expect(await screen.findByRole('region', { name: 'Conexión con SAT2' })).toBeInTheDocument()
    expect(await within(screen.getByRole('region', { name: 'Estado del sistema' })).findByText('Falló.')).toBeInTheDocument()
  })
})
