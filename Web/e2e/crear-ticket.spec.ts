import { test, expect } from '@playwright/test'
import { loginWithCredentials, gotoAuthed, residentCredentials } from './helpers/auth'

const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip

describeSmoke('Smoke crear ticket', () => {
  test('login → nuevo ticket → enviar incidencia', async ({ page }) => {
    const { correo, password } = residentCredentials()
    test.skip(!password, 'Falta E2E_RESIDENT_PASSWORD o FASE1_SMOKE_PASSWORD')

    const titulo = `E2E ticket ${Date.now()}`

    await loginWithCredentials(page, correo, password)
    await gotoAuthed(page, '/tickets/nuevo')
    await expect(page.getByRole('heading', { name: 'Nuevo ticket' })).toBeVisible({
      timeout: 15_000,
    })

    const categoria = page.locator('#ticket-categoria')
    await expect(categoria.locator('option')).not.toHaveCount(1, { timeout: 15_000 })
    await categoria.selectOption({ index: 1 })

    await page.locator('#ticket-titulo').fill(titulo)
    await page.locator('#ticket-descripcion').fill(`Descripción smoke ${titulo}`)

    await page.getByRole('button', { name: 'Enviar incidencia' }).click()

    const listado = page.waitForURL(/\/tickets\/?$/, { timeout: 25_000 })
    const formError = page
      .getByRole('alert')
      .waitFor({ state: 'visible', timeout: 25_000 })
      .then(async () => {
        const msg = (await page.getByRole('alert').textContent()) ?? 'error desconocido'
        throw new Error(`Crear ticket rechazado: ${msg}`)
      })
    await Promise.race([listado, formError])
    await expect(page.getByText(titulo, { exact: false })).toBeVisible({ timeout: 15_000 })
  })
})
