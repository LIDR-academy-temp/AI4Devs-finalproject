import { test, expect } from '@playwright/test'
import { loginWithCredentials, gotoAuthed, residentCredentials } from './helpers/auth'

const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip

describeSmoke('Smoke estado de cuenta', () => {
  test('login → finanzas/cuenta → resumen o vacío', async ({ page }) => {
    const { correo, password } = residentCredentials()
    test.skip(!password, 'Falta E2E_RESIDENT_PASSWORD o FASE1_SMOKE_PASSWORD')

    await loginWithCredentials(page, correo, password)
    await gotoAuthed(page, '/finanzas/cuenta')
    await expect(page.getByRole('heading', { name: 'Mi estado de cuenta' })).toBeVisible({
      timeout: 15_000,
    })

    const vacio = page.getByText('No tienes cuotas registradas.')
    const conCuotas = page.getByText('Total pendiente')
    await expect(vacio.or(conCuotas)).toBeVisible({ timeout: 15_000 })
  })
})
