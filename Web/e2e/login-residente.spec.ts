import { test, expect } from '@playwright/test'
import { loginWithCredentials, gotoAuthed, residentCredentials } from './helpers/auth'

const describeSmoke =
  process.env.E2E_SMOKE === '1' ? test.describe : test.describe.skip

describeSmoke('Smoke login residente', () => {
  test('login → inicio con saludo', async ({ page }) => {
    const { correo, password } = residentCredentials()
    test.skip(!password, 'Falta E2E_RESIDENT_PASSWORD o FASE1_SMOKE_PASSWORD')

    await loginWithCredentials(page, correo, password)
    await gotoAuthed(page, '/')

    await expect(page.locator('.cq-portal-home-welcome h1')).toContainText(
      /Buenos días|Buenas tardes|Buenas noches/,
      { timeout: 15_000 },
    )
  })
})
