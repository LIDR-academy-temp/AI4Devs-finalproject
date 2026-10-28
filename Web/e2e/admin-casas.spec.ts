import { test, expect } from '@playwright/test'

const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip

describeSmoke('Smoke admin casas', () => {
  test('login → admin/casas → crear casa', async ({ page }) => {
    const correo = process.env.E2E_ADMIN_CORREO ?? 'admin@local'
    const password = process.env.E2E_ADMIN_PASSWORD ?? process.env.FASE1_SMOKE_PASSWORD ?? ''

    test.skip(!password, 'Falta E2E_ADMIN_PASSWORD o FASE1_SMOKE_PASSWORD')

    const uniqueNum = `E2E-${Date.now()}`

    await page.goto('/login')
    await page.getByLabel('Correo').fill(correo)
    await page.getByLabel('Contraseña').fill(password)
    await page.getByRole('button', { name: 'Entrar' }).click()

    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })

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
