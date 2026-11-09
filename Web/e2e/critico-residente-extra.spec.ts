import { test, expect } from '@playwright/test'
import { describeSmoke } from './helpers/smoke'
import { loginWithCredentials, gotoAuthed, residentCredentials } from './helpers/auth'

describeSmoke('Smoke crítico residente (extra)', () => {
  test('login → comunicados, tickets, perfil, áreas', async ({ page }) => {
    const { correo, password } = residentCredentials()
    test.skip(!password, 'Falta E2E_RESIDENT_PASSWORD en fase1-smoke.env')

    await loginWithCredentials(page, correo, password)
    await gotoAuthed(page, '/anuncios')
    await expect(page.getByRole('heading', { name: 'Comunicados' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/tickets')
    await expect(page.getByRole('heading', { name: 'Mis tickets' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/perfil')
    await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/areas-comunes')
    await expect(page.getByRole('heading', { name: 'Áreas comunes y reservaciones' })).toBeVisible({
      timeout: 15_000,
    })
  })
})
