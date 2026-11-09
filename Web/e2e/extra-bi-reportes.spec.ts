import { test, expect } from '@playwright/test'
import { describeSmoke } from './helpers/smoke'
import { adminCredentials, gotoAuthed, loginWithCredentials } from './helpers/auth'

/** Bonus Entrega 3: panel BI-RPT en reportes admin (lectura + carga). */
describeSmoke('Smoke extra BI reportes', () => {
  test('login → admin/reportes → pestaña Tendencias BI panel cargado', async ({ page }) => {
    const { correo, password } = adminCredentials()
    test.skip(!password, 'Falta FASE1_SMOKE_PASSWORD en fase1-smoke.env')

    await loginWithCredentials(page, correo, password)
    await gotoAuthed(page, '/admin/reportes')
    await expect(page.getByRole('heading', { name: 'Reportes' })).toBeVisible({
      timeout: 15_000,
    })

    await page.getByRole('tab', { name: 'Morosos' }).click()
    await page.getByRole('tab', { name: 'Tendencias BI' }).click()

    await expect(page.getByRole('heading', { name: 'Tendencias BI', level: 2 })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible()

    await expect(page.getByText('Calculando tendencias…')).toBeHidden({ timeout: 25_000 })

    const panelReady = page
      .locator('.cq-bi-kpi-strip, .cq-bi-trends canvas, .alert')
      .first()
    await expect(panelReady).toBeVisible({ timeout: 10_000 })
  })
})
