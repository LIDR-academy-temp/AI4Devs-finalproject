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
  test('consulta de 7 y 31 días con gráfico y resumen', async ({ page }) => {
    const bloqueos = vigilarPoliticaDeContenido(page)
    await abrirDetalle(page)

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

    await page.getByRole('button', { name: 'Últimos 31 días' }).click()

    await expect(page.getByRole('img', { name: /últimos 31 días/ })).toBeVisible()
    await expect.poll(() => registros(page)).toBeGreaterThan(deSieteDias)
    expect(bloqueos).toEqual([])
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
