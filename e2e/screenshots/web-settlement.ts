// Screenshots of Settlement Review and Settlement Summary for the PR of web-settlement (design D16, step 7). Not a
// test: it is outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it.
// It needs the app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) and runs headed, so the
// person can watch it. Same protections as the import smoke: the password comes from the root .env at run time, is
// set from the page, the field is emptied right after signing in, there is no trace nor video, and nothing is
// captured before Settlement Review is on screen. It processes batch-clean: afterwards the database must be seeded
// again.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('../../docs/wireframes/web-settlement/', import.meta.url))
const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

/** A batch number of ProviderA-USD with an active attempt in the seed (its history starts at 101). */
const TAKEN_BATCH_NO = '122'

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

/** Uploads batch-clean to ProviderA-USD, analyzes it, runs the validations and continues; returns its id. */
async function validatedBatchClean(page: Page, created: string[]): Promise<string> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'New Reconciliation' }).click()
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Provider').selectOption({ label: 'Provider A' })
  await page.getByLabel('Account').selectOption({ label: 'ProviderA-USD' })
  const creation = page.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/api\/v1\/accounts\/[^/]+\/imports$/.test(r.url()),
  )
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop .xlsx files here or choose files' }).click()
  await (await chooser).setFiles(
    repositoryFile('data/samples/batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'),
  )
  const { importId } = (await (await creation).json()) as { importId: string }
  created.push(importId)
  await page.getByRole('tab', { name: 'Mapping' }).click()
  await page.getByRole('button', { name: 'Confirm mapping' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Analyze' }).click()
  await expect(page.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
    timeout: 90_000,
  })
  await page.getByRole('button', { name: 'Run validations' }).click()
  await expect(page.getByRole('table', { name: 'Validation results' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue to settlement review' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('validated', { exact: true })).toBeVisible()
  return importId
}

/** Waits until the pre-summary shows the answer of the form as it is now. */
async function previewShown(page: Page) {
  const panel = page.getByRole('region', { name: 'Pre-summary' })
  await expect(panel.getByRole('table', { name: 'Amount payable' })).toBeVisible()
  await expect(panel.getByText('Updating the pre-summary…')).toBeHidden()
}

/** Whether the page scrolls sideways at the current width (it must not). */
async function overflows(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: true })
  console.log(`saved docs/wireframes/web-settlement/${name}.png`)
}

/** Cancels the imports this run created that are still open, so none stays half-way in the local database. */
async function cancelOpen(page: Page, created: string[]) {
  for (const importId of created) {
    try {
      await page.goto(`${BASE_URL}/imports/${importId}?step=analysis`)
      const cancel = page.getByRole('button', { name: 'Cancel import' })
      await page.getByRole('region', { name: 'Import' }).getByText('Status').waitFor()
      if (!(await cancel.isVisible())) continue
      await cancel.click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, cancel the import' }).click()
      await expect(page.getByRole('region', { name: 'Import' }).getByText('cancelled', { exact: true })).toBeVisible()
      console.log(`cancelled import ${importId}`)
    } catch (error) {
      console.log(`import ${importId} could not be cancelled: ${(error as Error).message.split('\n')[0]}`)
    }
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser: Browser = await chromium.launch({ headless: false })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  context.setDefaultTimeout(15_000)
  const page = await context.newPage()
  const created: string[] = []
  let processed = false
  try {
    await signIn(page)
    await validatedBatchClean(page, created)

    // Settlement Review of batch-clean: proposed number, date, the Other Fees rows and a percentage-only preset.
    await page.getByRole('region', { name: 'Decision' }).getByRole('link', { name: 'Settlement Review' }).click()
    const batchNo = page.getByRole('textbox', { name: 'Batch number' })
    await expect(batchNo).toHaveValue('123')
    await page.getByLabel('Settlement date').fill('2026-10-24')
    const addPreset = page.getByRole('combobox', { name: 'Add preset fee' })
    await expect(addPreset).toBeEnabled()
    await addPreset.selectOption({
      label: (await addPreset.locator('option', { hasText: 'Chargeback over 1%' }).textContent())!,
    })
    await page.getByRole('textbox', { name: 'Amount — Chargeback over 1%' }).fill('12.5000')
    await previewShown(page)
    await shot(page, 'settlement-review')
    console.log(`horizontal scroll at 1280 px: ${await overflows(page)}`)

    // A number with an active attempt, said in the field from the preview.
    await batchNo.fill(TAKEN_BATCH_NO)
    await expect(
      page.getByText(`Batch ${TAKEN_BATCH_NO} already has an active attempt for this account.`),
    ).toBeVisible()
    await shot(page, 'settlement-review-batch-taken')
    await batchNo.fill('123')
    await previewShown(page)

    // At 1024 px.
    await page.setViewportSize({ width: 1024, height: 768 })
    await shot(page, 'settlement-review-1024')
    console.log(`horizontal scroll at 1024 px: ${await overflows(page)}`)
    await page.setViewportSize({ width: 1280, height: 900 })

    // Confirm the channels, Process and the Summary of the attempt.
    await page.getByRole('checkbox', { name: 'Assign these channels to this account as primary' }).check()
    const processButton = page.getByRole('button', { name: 'Process batch 123' })
    await expect(processButton).toBeEnabled()
    await processButton.click()
    await expect(page.getByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeVisible({ timeout: 60_000 })
    processed = true
    await shot(page, 'settlement-summary')
    console.log(`horizontal scroll at 1280 px (Summary): ${await overflows(page)}`)
  } finally {
    if (!processed) await cancelOpen(page, created)
    await browser.close()
    if (processed) {
      console.log('batch-clean is now processed in the local database: seed it again with `pnpm db:seed`.')
    }
  }
}

await main()
