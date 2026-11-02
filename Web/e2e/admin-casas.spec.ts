import { test, expect } from '@playwright/test'
import { adminCredentials, loginWithCredentials } from './helpers/auth'

const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip

describeSmoke('Smoke admin casas', () => {
  test('login → admin/casas → crear casa', async ({ page }) => {
    const { correo, password } = adminCredentials()

    test.skip(!password, 'Falta E2E_ADMIN_PASSWORD o FASE1_SMOKE_PASSWORD')

    const uniqueNum = `E2E-${Date.now()}`

    await loginWithCredentials(page, correo, password)

    await page.goto('/admin/casas')
    await expect(page.getByRole('heading', { name: 'Casas' })).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Nueva casa' }).click()
    await expect(page.getByRole('heading', { name: 'Nueva casa' })).toBeVisible()

    await page.locator('#numero').fill(uniqueNum)
    await page.locator('#direccion').fill(`Calle smoke ${uniqueNum}`)

    await page.getByRole('button', { name: 'Crear casa' }).click()

    await expect(page.getByText(uniqueNum, { exact: false })).toBeVisible({ timeout: 15_000 })
  })
})
