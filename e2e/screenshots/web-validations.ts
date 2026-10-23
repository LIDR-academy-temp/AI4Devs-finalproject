// Screenshots of Analysis & Validations for the PR of web-validations (design D13, step 7). Not a test: it is outside
// the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs the app and
// the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) and runs headed, so the person can watch it.
// Same protections as the import smoke: the password comes from the root .env at run time, is set from the page,
// the field is emptied right after signing in, there is no trace nor video, and nothing is captured before an import
// is on screen.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Locator, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('../../docs/wireframes/web-validations/', import.meta.url))
const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

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

/** Uploads a sample to ProviderB-Main, confirms the proposal, analyzes and runs the validations; returns its id. */
async function analyzedWithRun(page: Page, sample: string, created: string[]): Promise<string> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'New Reconciliation' }).click()
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Provider').selectOption({ label: 'Provider B' })
  await page.getByLabel('Account').selectOption({ label: 'ProviderB-Main' })
  const creation = page.waitForResponse(
    (r) => r.request().method() === 'POST' && /\/api\/v1\/accounts\/[^/]+\/imports$/.test(r.url()),
  )
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop .xlsx files here or choose files' }).click()
  await (await chooser).setFiles(repositoryFile(`data/samples/${sample}/Recon_Template_ProviderB-Main_${sample}.xlsx`))
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
  return importId
}

/** Whether the page scrolls sideways at the current width (design D14: it must not). */
async function overflows(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
}

/** Waits for the animations and transitions inside an element to finish (a drawer sliding in, a switch moving). */
async function settled(element: Locator) {
  await element.evaluate((node) => Promise.all(node.getAnimations({ subtree: true }).map((a) => a.finished)))
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT}${name}.png` })
  console.log(`saved docs/wireframes/web-validations/${name}.png`)
}

/** Cancels the imports this run created, so none stays open in the local database. */
async function cancelAll(page: Page, created: string[]) {
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
  try {
    await signIn(page)

    // batch-issues: the eight validations.
    await analyzedWithRun(page, 'batch-issues', created)
    await page.getByRole('region', { name: 'Validations' }).scrollIntoViewIfNeeded()
    await shot(page, 'batch-issues-validations')
    console.log(`horizontal scroll at 1280 px: ${await overflows(page)}`)

    // The duplicate with its history, after including its second occurrence; also at 1024 px (design D14).
    await page.getByRole('button', { name: 'Duplicate in batch' }).click()
    await page.getByRole('table', { name: 'Findings' }).getByRole('button', { name: '441706751475644' }).click()
    const drawer = page.getByRole('dialog')
    await drawer.getByRole('switch', { name: /row 338$/ }).click()
    await expect(drawer.getByText(/^Changed by analyst · /)).toBeVisible()
    await settled(drawer)
    await shot(page, 'batch-issues-duplicate-drawer')
    await page.setViewportSize({ width: 1024, height: 768 })
    await shot(page, 'batch-issues-duplicate-drawer-1024')
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    console.log(`horizontal scroll at 1024 px: ${await overflows(page)}`)
    await page.setViewportSize({ width: 1280, height: 900 })

    // A missing finding: the range of its cycle and status and why it is missing (ui-polish design D18).
    await page.getByRole('button', { name: 'Missing in range' }).click()
    await page.getByRole('table', { name: 'Findings' }).locator('[data-issue-button]').first().click()
    await expect(drawer.getByText(/^Batch range \(/)).toBeVisible()
    await settled(drawer)
    await shot(page, 'batch-issues-missing-drawer')
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()

    // Continue, run again and the invalidated review.
    await page.getByRole('button', { name: 'Continue to settlement review' }).click()
    await expect(page.getByRole('region', { name: 'Import' }).getByText('validated', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Run again' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Run again' }).click()
    const notice = page.getByRole('region', { name: 'Review invalidated' })
    await expect(notice).toBeVisible()
    await notice.scrollIntoViewIfNeeded()
    await shot(page, 'batch-issues-invalidated-review')

    // batch-blocked: Continue disabled with its reason.
    await analyzedWithRun(page, 'batch-blocked', created)
    const decision = page.getByRole('region', { name: 'Decision' })
    await expect(decision.getByRole('button', { name: 'Continue to settlement review' })).toBeDisabled()
    await decision.scrollIntoViewIfNeeded()
    await shot(page, 'batch-blocked-continue-disabled')
  } finally {
    await cancelAll(page, created)
    await browser.close()
  }
}

await main()
