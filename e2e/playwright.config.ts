// Local smoke of the import flow (design D11): Gherkin through playwright-bdd against the app and API the person
// starts with `pnpm db:up`, `pnpm db:seed` and `pnpm dev`. No webServer and no CI job yet (Entrega 3).
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

// SEED_PASSWORD comes from the .env at the repository root, read at run time and never written anywhere.
const rootEnv = fileURLToPath(new URL('../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: 'steps/**/*.ts',
})

export default defineConfig({
  testDir,
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    // Well below the test timeout, so a step that hangs fails while its finally and the cleanup still have time.
    actionTimeout: 15_000,
    navigationTimeout: 15_000,
    // No trace nor video: they would keep what is typed on the login form.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } }],
})
