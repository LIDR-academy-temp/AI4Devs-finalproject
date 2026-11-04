import { request } from '@playwright/test'
import { setTimeout as esperar } from 'node:timers/promises'
import { EMAIL_E2E, EMAIL_E2E_DOS, URL_E2E, compose, sql } from './pila.ts'

/**
 * La cuenta principal ve solo "Caso de prueba - 1", donde cada prueba carga su situación, y así el
 * caso 2 sirve para probar el acceso denegado. La segunda cuenta ve los dos casos, para el selector.
 */
const EQUIPO_CASO_1 = 1
const EQUIPO_CASO_2 = 2
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

function crearCuenta(email = EMAIL_E2E): string {
  const salida = compose(
    'exec', '-T', 'api', 'python', '-m', 'app.administracion',
    'crear-usuario', '--email', email, '--nombre', 'Prueba E2E',
  )
  const clave = /se muestra una sola vez: (\S+)/.exec(salida)?.[1]
  if (!clave) {
    throw new Error('La administración no informó la clave de la cuenta de prueba')
  }
  return clave
}

function asignarEstacion(idEquipo: number, email = EMAIL_E2E) {
  compose(
    'exec', '-T', 'api', 'python', '-m', 'app.administracion',
    'asignar-estacion', '--email', email, '--id-equipo', String(idEquipo),
  )
}

function idDeEstacion(idEquipo: number): string {
  return sql(`select id from estacion where id_equipo_sat2 = ${idEquipo}`)
}

export default async function preparacionGlobal() {
  try {
    // El worker de prueba queda saludable recién después de sembrar los 31 días del caso 1.
    compose('up', '--build', '-d', '--wait', '--wait-timeout', '300')
    const clave = crearCuenta()
    await reintentar('el caso de prueba 1', async () => {
      asignarEstacion(EQUIPO_CASO_1)
      return true
    })
    const claveDos = crearCuenta(EMAIL_E2E_DOS)
    asignarEstacion(EQUIPO_CASO_1, EMAIL_E2E_DOS)
    asignarEstacion(EQUIPO_CASO_2, EMAIL_E2E_DOS)

    const api = await request.newContext({ baseURL: URL_E2E })
    const acceso = await api.post('/api/v1/auth/login', {
      data: { email: EMAIL_E2E, contrasena: clave },
    })
    if (!acceso.ok()) {
      throw new Error(`No se pudo ingresar con la cuenta de prueba: ${acceso.status()}`)
    }
    await api.dispose()

    // Playwright hereda estas variables en los procesos que corren las pruebas.
    process.env.E2E_CLAVE = clave
    process.env.E2E_CLAVE_DOS = claveDos
    process.env.E2E_CASO_2 = idDeEstacion(EQUIPO_CASO_2)
  } catch (error) {
    // Si la preparación falla, Playwright no ejecuta el cierre global.
    compose('down', '-v')
    throw error
  }
}
