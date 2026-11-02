import { request } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { setTimeout as esperar } from 'node:timers/promises'
import { EMAIL_E2E, URL_E2E, compose } from './pila.ts'

/** Todos los escenarios salvo `Estación ajena` (110), que la cuenta no debe poder ver. */
const EQUIPOS_ASIGNADOS = [101, 102, 103, 104, 105, 106, 107, 108, 109]
const EQUIPO_AJENO = 110
const LIMITE_MS = 120_000

async function reintentar<T>(descripcion: string, intento: () => Promise<T | null>): Promise<T> {
  const limite = Date.now() + LIMITE_MS
  while (Date.now() < limite) {
    const resultado = await intento().catch(() => null)
    if (resultado !== null) {
      return resultado
    }
    await esperar(1000)
  }
  throw new Error(`Se agotó el tiempo esperando: ${descripcion}`)
}

function crearCuenta(): string {
  const salida = compose(
    'exec', '-T', 'api', 'python', '-m', 'app.administracion',
    'crear-usuario', '--email', EMAIL_E2E, '--nombre', 'Prueba E2E',
  )
  const clave = /se muestra una sola vez: (\S+)/.exec(salida)?.[1]
  if (!clave) {
    throw new Error('La administración no informó la clave de la cuenta de prueba')
  }
  return clave
}

function asignarEstacion(idEquipo: number) {
  compose(
    'exec', '-T', 'api', 'python', '-m', 'app.administracion',
    'asignar-estacion', '--email', EMAIL_E2E, '--id-equipo', String(idEquipo),
  )
}

function idDeEstacion(idEquipo: number): string {
  return compose(
    'exec', '-T', 'db', 'psql', '-U', 'weather_track', '-d', 'weather_track', '-tAc',
    `select id from estacion where id_equipo_sat2 = ${idEquipo}`,
  ).trim()
}

async function obtener(api: APIRequestContext, ruta: string) {
  const respuesta = await api.get(`/api/v1${ruta}`)
  return respuesta.ok() ? respuesta.json() : null
}

/** El ciclo y la carga corren en segundo plano: se espera a que hayan guardado los datos. */
async function esperarDatos(api: APIRequestContext) {
  const estaciones: { id: number; nombre: string }[] = await obtener(api, '/estaciones')
  for (const estacion of estaciones.filter((e) => e.nombre !== 'Fuente caída')) {
    await reintentar(`la recomendación de ${estacion.nombre}`, async () => {
      const { motivos } = await obtener(api, `/estaciones/${estacion.id}/recomendacion`)
      return motivos[0]?.codigo === 'SIN_MEDICIONES' ? null : true
    })
  }

  const conHistoricos = estaciones.find((e) => e.nombre === 'Con históricos')
  const { sensores } = await obtener(api, `/estaciones/${conHistoricos?.id}/condiciones-actuales`)
  const ultimo = sensores.at(-1).sensor_id
  const hasta = new Date()
  const desde = new Date(hasta.getTime() - 24 * 60 * 60 * 1000)
  const consulta = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() })
  await reintentar('la carga de históricos', async () => {
    const historico = await obtener(
      api,
      `/estaciones/${conHistoricos?.id}/sensores/${ultimo}/historico?${consulta}`,
    )
    return historico.resumen.cantidad > 0 ? true : null
  })
}

export default async function preparacionGlobal() {
  try {
    compose('up', '--build', '-d', '--wait', '--wait-timeout', '300')
    const clave = crearCuenta()
    // El worker sincroniza el catálogo al arrancar, apenas después de quedar saludable.
    await reintentar('el catálogo de estaciones', async () => {
      asignarEstacion(EQUIPOS_ASIGNADOS[0])
      return true
    })
    EQUIPOS_ASIGNADOS.slice(1).forEach(asignarEstacion)

    const api = await request.newContext({ baseURL: URL_E2E })
    const acceso = await api.post('/api/v1/auth/login', {
      data: { email: EMAIL_E2E, contrasena: clave },
    })
    if (!acceso.ok()) {
      throw new Error(`No se pudo ingresar con la cuenta de prueba: ${acceso.status()}`)
    }
    await esperarDatos(api)
    await api.dispose()

    // Playwright hereda estas variables en los procesos que corren las pruebas.
    process.env.E2E_CLAVE = clave
    process.env.E2E_ESTACION_AJENA = idDeEstacion(EQUIPO_AJENO)
  } catch (error) {
    // Si la preparación falla, Playwright no ejecuta el cierre global.
    compose('down', '-v')
    throw error
  }
}
