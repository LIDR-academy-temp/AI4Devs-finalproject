import { request } from '@playwright/test'
import { EMAIL_E2E, URL_E2E, compose, crearCuentaConfirmada } from './pila.ts'

export default async function preparacionGlobal() {
  try {
    // El worker de prueba queda saludable recién después de sembrar los 31 días del caso 1,
    // y cada prueba carga su situación en ese caso.
    compose('up', '--build', '-d', '--wait', '--wait-timeout', '300')
    // El administrador crea la cuenta ya confirmada. Ve los dos casos de prueba.
    const clave = crearCuentaConfirmada(EMAIL_E2E)

    const api = await request.newContext({ baseURL: URL_E2E })
    const acceso = await api.post('/api/v1/auth/login', {
      data: { email: EMAIL_E2E, contrasena: clave },
    })
    if (!acceso.ok()) {
      throw new Error(`No se pudo ingresar con la cuenta de prueba: ${acceso.status()}`)
    }
    await api.dispose()

    // Playwright hereda esta variable en los procesos que corren las pruebas.
    process.env.E2E_CLAVE = clave
  } catch (error) {
    // Si la preparación falla, Playwright no ejecuta el cierre global.
    compose('down', '-v')
    throw error
  }
}
