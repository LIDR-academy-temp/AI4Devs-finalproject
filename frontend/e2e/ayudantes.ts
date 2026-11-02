import { expect } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { EMAIL_E2E } from './pila.ts'

export const FECHA_Y_HORA = /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/
export const MINUTO_Y_MEDIO_MS = 90_000

export async function ingresar(page: Page) {
  await page.goto('/')
  await page.getByLabel('Correo').fill(EMAIL_E2E)
  await page.getByLabel('Contraseña').fill(process.env.E2E_CLAVE ?? '')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: 'Elija una estación' })).toBeVisible()
}

export async function abrirEstacion(page: Page, nombre: string) {
  await ingresar(page)
  await page.getByRole('link', { name: nombre, exact: true }).click()
  await expect(page.getByRole('heading', { name: nombre, exact: true })).toBeVisible()
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
