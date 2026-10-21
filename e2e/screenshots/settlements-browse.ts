// Screenshots of Settlement List and the Movements tab for the PR of settlements-browse (tasks 9.4, 9.5). Not a test:
// it is outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It
// needs the app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) and batch-clean already
// processed as batch 123 of ProviderA-USD (`pnpm test:api` or `pnpm screenshots:web-settlement` do it). It only reads:
// nothing is created, processed nor cancelled. Same protections as web-settlement: the password comes from the root
// .env at run time, is set from the page, the field is emptied right after signing in, there is no trace nor video,
// and nothing is captured before Settlement List is on screen.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('../../docs/wireframes/settlements-browse/', import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

/** The attempt batch-clean leaves on ProviderA-USD: the newest of the account, pending payment. */
const PROCESSED = 'Batch 123 · attempt 1'

/** Sets the value of the password field from the page, so no log carries it. */
async function setPassword(page: Page, value: string) {
  await page.getByLabel('Password').evaluate((input, text) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

/** Empties the password field, whatever happened to the click. */
async function clearPassword(page: Page) {
  await page
    .evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="password"]')
      if (!input) return
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    .catch(() => {})
}

async function signIn(page: Page) {
  const password = process.env.SEED_PASSWORD
  if (!password) throw new Error('SEED_PASSWORD is not set: copy .env.example to .env at the repository root.')
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel('User name').fill('analyst')
  await setPassword(page, password)
  try {
    await page.getByRole('button', { name: 'Sign in' }).click()
  } finally {
    await clearPassword(page)
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

/**
 * Whether the page scrolls sideways at the current width, or a table scrolls inside its card and hides some figures
 * (neither must happen).
 */
async function overflows(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth > window.innerWidth ||
      [...document.querySelectorAll<HTMLElement>('[data-slot="table-container"]')].some(
        (container) => container.scrollWidth > container.clientWidth,
      ),
  )
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true })
  console.log(`saved docs/wireframes/settlements-browse/${name}.png`)
}

/** The measurements that found a horizontal scroll or a clipped table; any of them makes the run fail. */
const overflowing: string[] = []

/** Reports the overflow check at 1280 and at 1024 px, keeps the failing ones, and leaves the page at 1280. */
async function checkWidths(page: Page, screen: string) {
  for (const width of [1280, 1024]) {
    await page.setViewportSize(width === 1280 ? { width, height: 900 } : { width, height: 768 })
    const overflow = await overflows(page)
    console.log(`horizontal scroll or clipped table at ${width} px (${screen}): ${overflow}`)
    if (overflow) overflowing.push(`${screen} at ${width} px`)
  }
  await page.setViewportSize({ width: 1280, height: 900 })
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser: Browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  context.setDefaultTimeout(15_000)
  const page = await context.newPage()
  try {
    await signIn(page)

    // Settlement List of ProviderA-USD from the menu: batch 123 first, then the 22 seeded ones over two pages.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settlement List' }).click()
    await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
    await page.getByLabel('Provider').selectOption({ label: 'Provider A' })
    await page.getByLabel('Account').selectOption({ label: 'ProviderA-USD' })
    const table = page.getByRole('table', { name: 'Settlements' })
    await expect(table).toBeVisible()
    if (!(await table.getByRole('link', { name: PROCESSED }).isVisible())) {
      throw new Error('Batch 123 is not in the list: process batch-clean first (`pnpm test:api` does it).')
    }
    await expect(page.getByText('Page 1 of 2 · 23 settlements')).toBeVisible()
    await shot(page, 'settlement-list')
    await page.setViewportSize({ width: 1024, height: 768 })
    await shot(page, 'settlement-list-1024')
    await page.setViewportSize({ width: 1280, height: 900 })
    await checkWidths(page, 'Settlement List')

    // The Movements tab of batch 123: cycle E, then cycle I with the fees of its first row open, at 1280 and 1024 px.
    await table.getByRole('link', { name: PROCESSED }).click()
    await expect(page.getByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeVisible()
    await page.getByRole('tab', { name: 'Movements' }).click()
    const movements = page.getByRole('table', { name: 'Movements' })
    await expect(movements.getByRole('row').nth(1)).toBeVisible()
    await shot(page, 'settlement-movements-e')
    await checkWidths(page, 'Movements E')

    const cycleI = page.getByRole('toolbar', { name: 'Cycle' }).getByRole('button', { name: /^I \(/ })
    await cycleI.click()
    await expect(cycleI).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Loading the movements…')).toBeHidden()
    await expect(movements.getByRole('row').nth(1)).toBeVisible()
    const fees = movements.getByRole('button', { name: /^\d+ fees?$/ }).first()
    if (await fees.isVisible()) await fees.click()
    await shot(page, 'settlement-movements-i')
    await page.setViewportSize({ width: 1024, height: 768 })
    await shot(page, 'settlement-movements-i-1024')
    await page.setViewportSize({ width: 1280, height: 900 })
    await checkWidths(page, 'Movements I')
  } finally {
    await browser.close()
  }
  // The screenshots stay on disk to look at, but a run with any overflow is not one to commit.
  if (overflowing.length > 0) {
    throw new Error(`Horizontal scroll or clipped table: ${overflowing.join(', ')}. Do not commit these screenshots.`)
  }
}

await main()
