import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { EMAIL_E2E, EMAIL_E2E_DOS, cargarSituacion } from './pila.ts'

export const FECHA_Y_HORA = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/
export const MINUTO_Y_MEDIO_MS = 90_000
export const CASO_1 = 'Caso de prueba - 1'

export const CASO_2 = 'Caso de prueba - 2'

/** Las dos cuentas abren primero el caso 1, la primera estación activa. */
async function ingresarCon(page: Page, email: string, clave: string) {
  await page.goto('/')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(clave)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: CASO_1, exact: true })).toBeVisible()
}

/** La cuenta principal solo ve el caso 1. */
export async function ingresar(page: Page) {
  await ingresarCon(page, EMAIL_E2E, process.env.E2E_CLAVE ?? '')
}

/** La segunda cuenta ve los dos casos. */
export async function ingresarConDosCasos(page: Page) {
  await ingresarCon(page, EMAIL_E2E_DOS, process.env.E2E_CLAVE_DOS ?? '')
}

/** Carga la situación en el caso 1 y lo abre. */
export async function abrirSituacion(page: Page, clave: string) {
  cargarSituacion(clave)
  await ingresar(page)
}

export function bloqueDeEstado(page: Page): Locator {
  return page.getByRole('region', { name: 'Recomendación de aplicación' })
}

export function motivos(page: Page): Locator {
  return page.getByRole('list', { name: 'Motivos' })
}

export function tarjeta(page: Page, sensor: string): Locator {
  return page.getByRole('link', { name: new RegExp(`^${sensor}`) })
}

/** Devuelve la lista, que debe quedar vacía, de lo que la política de contenido bloqueó. */
export function vigilarPoliticaDeContenido(page: Page): string[] {
  const bloqueos: string[] = []
  page.on('console', (mensaje) => {
    if (/Content Security Policy/i.test(mensaje.text())) {
      bloqueos.push(mensaje.text())
    }
  })
  return bloqueos
}

export async function exigirSinDesplazamientoHorizontal(page: Page) {
  const { ancho, contenido } = await page.evaluate(() => ({
    ancho: window.innerWidth,
    contenido: document.documentElement.scrollWidth,
  }))
  expect(contenido).toBeLessThanOrEqual(ancho)
}
