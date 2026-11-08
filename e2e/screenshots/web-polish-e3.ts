// Screenshots for the PR of web-polish-e3 (task 5.1): the label of the early release of the reserve (#125) in the
// Summary and in Movements, and Settlement List opened with an invalid status in the address (#110). Not a test: it
// is outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs
// the app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) and only reads the seeded batch 122
// of ProviderA-USD (paid): nothing is created, processed nor cancelled, so no batch number is used. The password comes
// from the root .env at run time, is set from the page and the field is emptied right after signing in; there is no
// trace nor video, and nothing is captured before the first screen after signing in.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('../../docs/wireframes/web-polish-e3/', import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

/** A seeded attempt of ProviderA-USD, paid. */
const SEEDED = 'Batch 122 · attempt 1'

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

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true })
  console.log(`saved docs/wireframes/web-polish-e3/${name}.png`)
}

/** Fails when the page still names the early release after a chargeback (#125). */
async function noChargebackLabel(page: Page, screen: string) {
  const text = await page.locator('main').innerText()
  const old = /released on chargeback/i.test(text)
  console.log(`"released on chargeback" on ${screen}: ${old}`)
  if (old) throw new Error(`${screen} still says "released on chargeback".`)
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser: Browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  context.setDefaultTimeout(15_000)
  const page = await context.newPage()
  try {
    await signIn(page)

    // Settlement List of ProviderA-USD, chosen from the menu so the address carries the account.
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settlement List' }).click()
    await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
    await page.getByLabel('Provider').selectOption({ label: 'Provider A' })
    await page.getByLabel('Account').selectOption({ label: 'ProviderA-USD' })
    const table = page.getByRole('table', { name: 'Settlements' })
    await expect(table.getByRole('link', { name: SEEDED })).toBeVisible()
    const listUrl = new URL(page.url())

    // #110: the same list with invalid values in the address loads every attempt, without an error.
    const invalid = new URL(listUrl)
    invalid.searchParams.set('status', 'foo')
    invalid.searchParams.set('dateField', 'foo')
    invalid.searchParams.set('from', '2026-02-30')
    invalid.searchParams.set('page', 'abc')
    await page.goto(invalid.toString())
    await expect(table.getByRole('link', { name: SEEDED })).toBeVisible()
    await expect(page.getByText('The settlements could not be loaded.')).toBeHidden()
    await expect(page.getByLabel('Status')).toHaveValue('')
    console.log(`list with status=foo: ${await page.getByText(/^Page 1 of \d+ · \d+ settlements$/).innerText()}`)
    await shot(page, 'settlement-list-invalid-status')

    // #125: the Summary of the seeded attempt, with the breakdown and the reserves block.
    await table.getByRole('link', { name: SEEDED }).click()
    await expect(page.getByRole('heading', { name: 'Settlement Summary · batch 122' })).toBeVisible()
    const payable = page.getByRole('table', { name: 'Amount payable' })
    await expect(payable.getByRole('row', { name: /Reserve released on adjustment/ })).toBeVisible()
    await expect(page.getByRole('table', { name: 'Reserves' }).getByText('Released on adjustment')).toBeVisible()
    await noChargebackLabel(page, 'the Summary')
    await shot(page, 'settlement-summary')

    // #125: Movements, cycle I, with the Reserves column.
    await page.getByRole('tab', { name: 'Movements' }).click()
    const cycleI = page.getByRole('toolbar', { name: 'Cycle' }).getByRole('button', { name: /^I \(/ })
    await cycleI.click()
    await expect(cycleI).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByLabel('Loading the movements…')).toBeHidden()
    const movements = page.getByRole('table', { name: 'Movements' })
    await expect(movements.getByRole('row').nth(1)).toBeVisible()
    const onAdjustment = await movements.getByText(/Released on adjustment/).count()
    console.log(`rows of Movements I showing "Released on adjustment": ${onAdjustment}`)
    await noChargebackLabel(page, 'Movements I')
    await shot(page, 'settlement-movements-i')
  } finally {
    await browser.close()
  }
}

await main()
