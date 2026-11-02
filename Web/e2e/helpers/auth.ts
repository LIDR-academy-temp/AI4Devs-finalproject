import type { Page } from '@playwright/test'

export async function loginWithCredentials(
  page: Page,
  correo: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(correo)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
}

export function adminCredentials(): { correo: string; password: string } {
  const correo = process.env.E2E_ADMIN_CORREO ?? 'admin@local'
  const password =
    process.env.E2E_ADMIN_PASSWORD ?? process.env.FASE1_SMOKE_PASSWORD ?? ''
  return { correo, password }
}

export function residentCredentials(): { correo: string; password: string } {
  const correo = process.env.E2E_RESIDENT_CORREO ?? 'residente@local'
  const password =
    process.env.E2E_RESIDENT_PASSWORD ?? process.env.FASE1_SMOKE_PASSWORD ?? ''
  return { correo, password }
}
