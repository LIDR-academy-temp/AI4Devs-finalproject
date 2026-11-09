import { test, expect } from '@playwright/test'
import { describeSmoke } from './helpers/smoke'
import { adminCredentials, gotoAuthed, loginWithCredentials } from './helpers/auth'

describeSmoke('Smoke crítico admin (extra)', () => {
  test('login → tickets gestión, anuncios admin y aviso NTF', async ({ page }) => {
    const { correo, password } = adminCredentials()
    test.skip(!password, 'Falta FASE1_SMOKE_PASSWORD en fase1-smoke.env')

    await loginWithCredentials(page, correo, password)
    await gotoAuthed(page, '/admin/tickets')
    await expect(page.getByRole('heading', { name: 'Gestión de tickets' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/admin/anuncios')
    await expect(page.getByRole('heading', { name: 'Anuncios' })).toBeVisible({
      timeout: 15_000,
    })

    await page.goto('/admin/notificaciones/aviso')
    await expect(page.getByRole('heading', { name: 'Aviso general' })).toBeVisible({
      timeout: 15_000,
    })
  })
})
