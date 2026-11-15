import { defineConfig, devices } from '@playwright/test'
import { URL_E2E } from './e2e/pila.ts'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/preparacion-global.ts',
  globalTeardown: './e2e/cierre-global.ts',
  forbidOnly: true,
  // Todas las pruebas cargan su situación en el mismo caso de prueba: no pueden correr a la vez.
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: URL_E2E,
    locale: 'es-AR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
