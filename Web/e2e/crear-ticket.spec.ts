import { test, expect } from '@playwright/test'
import { loginWithCredentials, residentCredentials } from './helpers/auth'

const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip

describeSmoke('Smoke crear ticket', () => {
  test('login → nuevo ticket → enviar incidencia', async ({ page }) => {
    const { correo, password } = residentCredentials()
    test.skip(!password, 'Falta E2E_RESIDENT_PASSWORD o FASE1_SMOKE_PASSWORD')

    const titulo = `E2E ticket ${Date.now()}`

    await loginWithCredentials(page, correo, password)

    await page.goto('/tickets/nuevo')
    await expect(page.getByRole('heading', { name: 'Nuevo ticket' })).toBeVisible({
      timeout: 15_000,
    })

    const categoria = page.locator('select').first()
    await expect(categoria.locator('option')).not.toHaveCount(1, { timeout: 15_000 })
    await categoria.selectOption({ index: 1 })

    await page.getByLabel('Título').fill(titulo)
    await page.getByLabel('Descripción').fill(`Descripción smoke ${titulo}`)

    await page.getByRole('button', { name: 'Enviar incidencia' }).click()

    await page.waitForURL(/\/tickets\/?$/, { timeout: 15_000 })
    await expect(page.getByText(titulo, { exact: false })).toBeVisible({ timeout: 15_000 })
  })
})
