import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import {
  abrirSituacion,
  exigirSinDesplazamientoHorizontal,
  tarjeta,
  vigilarPoliticaDeContenido,
} from './ayudantes.ts'

async function abrirDetalle(page: Page) {
  await abrirSituacion(page, 'con_historicos')
  await tarjeta(page, 'Temp Amb. a 2 Mts').click()
  await expect(page.getByRole('heading', { name: 'Temp Amb. a 2 Mts' })).toBeVisible()
}

async function registros(page: Page): Promise<number> {
  const texto = await page.locator('.resumen div', { hasText: 'Registros' }).locator('dd').innerText()
  return Number(texto.replaceAll('.', ''))
}

test.describe('HU3: revisar el comportamiento histórico', () => {
  test('consulta de Semana y Mes con gráfico y resumen', async ({ page }) => {
    const bloqueos = vigilarPoliticaDeContenido(page)
    await abrirDetalle(page)
    // Abre en Día, las últimas 24 horas.
    await expect(page.getByRole('img', { name: /Temp Amb. a 2 Mts: últimas 24 horas/ })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Día' })).toHaveAttribute('aria-pressed', 'true')

    await page.getByRole('button', { name: 'Semana' }).click()
    const grafico = page.getByRole('img', { name: /Temp Amb. a 2 Mts: últimos 7 días/ })
    // La fuente simulada tiene huecos: la línea se corta en varios tramos, sin interpolar.
    await expect.poll(() => grafico.locator('.scatterlayer .js-line').count()).toBeGreaterThan(1)
    for (const medida of ['Máximo', 'Mínimo', 'Promedio', 'Registros']) {
      await expect(page.locator('.resumen dt', { hasText: medida })).toBeVisible()
    }
    // El valor centinela de la fuente no debe entrar en el resumen.
    await expect(page.locator('.resumen')).not.toContainText('999')
    const deSieteDias = await registros(page)
    expect(deSieteDias).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Mes' }).click()

    await expect(page.getByRole('img', { name: /últimos 31 días/ })).toBeVisible()
    await expect.poll(() => registros(page)).toBeGreaterThan(deSieteDias)
    expect(bloqueos).toEqual([])
  })

  test('rango manual con calendario, limitado al último año y a hoy', async ({ page }) => {
    await abrirDetalle(page)
    await page.getByRole('button', { name: 'Elegir fechas' }).click()
    const desde = page.getByLabel('Desde')
    const hasta = page.getByLabel('Hasta')
    const hoy = await hasta.getAttribute('max')
    expect(await desde.getAttribute('min')).toBe(`${Number(hoy!.slice(0, 4)) - 1}${hoy!.slice(4)}`)

    // Los últimos tres días completos más hoy, que tienen datos simulados.
    const inicio = new Date(Date.parse(`${hoy}T12:00:00-03:00`) - 3 * 86_400_000)
    const fechaInicio = inicio.toISOString().slice(0, 10)
    await desde.fill(fechaInicio)
    await page.getByRole('button', { name: 'Ver el período' }).click()
    const [anio, mes, dia] = fechaInicio.split('-')
    await expect(page.getByRole('img', { name: new RegExp(`del ${dia}/${mes}/${anio}`) })).toBeVisible()
    await expect.poll(() => registros(page)).toBeGreaterThan(0)

    // Más de un mes no se consulta.
    const viejo = new Date(Date.parse(`${hoy}T12:00:00-03:00`) - 40 * 86_400_000).toISOString().slice(0, 10)
    await desde.fill(viejo)
    await page.getByRole('button', { name: 'Ver el período' }).click()
    await expect(page.getByText(/hasta el mismo día del mes siguiente/)).toBeVisible()
  })

  test.describe('a 360 píxeles', () => {
    test.use({ viewport: { width: 360, height: 800 } })

    test('el detalle no tiene desplazamiento horizontal', async ({ page }) => {
      await abrirDetalle(page)
      await expect(page.locator('.scatterlayer .js-line').first()).toBeVisible()
      await exigirSinDesplazamientoHorizontal(page)
    })
  })
})
