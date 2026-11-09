import type { Page } from '@playwright/test'

export async function loginWithCredentials(
  page: Page,
  correo: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(correo)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  const loginError = page.getByText(
    /Credenciales inválidas|Demasiados intentos|No se pudo iniciar sesión/i,
  )
  const loginOk = page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20_000 })
  const loginRejected = loginError.waitFor({ state: 'visible', timeout: 20_000 }).then(async () => {
    const msg = (await loginError.first().textContent()) ?? ''
    if (/Demasiados intentos/i.test(msg)) {
      throw new Error('Rate limit login (429): espera ~1 minuto y reintenta Invoke-E2ESmoke.ps1.')
    }
    throw new Error(
      'Login rechazado por la API. Revisa correo/clave o E2E_RESIDENT_* en fase1-smoke.env.',
    )
  })

  await Promise.race([loginOk, loginRejected])
}

/** Tras login, navega y espera RefreshToken (JWT en memoria + cookie rt). */
export async function gotoAuthed(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 25_000 })
}

export function adminCredentials(): { correo: string; password: string } {
  const correo = process.env.E2E_ADMIN_CORREO ?? 'admin@local'
  const password =
    process.env.E2E_ADMIN_PASSWORD ?? process.env.FASE1_SMOKE_PASSWORD ?? ''
  return { correo, password }
}

export function residentCredentials(): { correo: string; password: string } {
  const correo = process.env.E2E_RESIDENT_CORREO ?? 'a@cq500.local'
  const password =
    process.env.E2E_RESIDENT_PASSWORD ?? process.env.FASE1_SMOKE_PASSWORD ?? ''
  return { correo, password }
}
