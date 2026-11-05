// Screenshots of In Progress, the cancel with a reason and the readiness of a file added after confirming, for the PR
// of import-in-progress (design D10, task 11.1). Not a test: it is outside the features of playwright-bdd, so
// `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs the app and the API the person starts
// (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`). Same protections as web-admin-matching: the password comes from the root
// .env at run time, is set from the page, the field is emptied right after signing in, there is no trace nor video,
// and nothing is captured before the screen is on display.
//
// It creates three imports as analyst, through the screens: batch-split part1 in ProviderA-USD (left uploaded), the
// legacy file in ProviderC-Alt confirmed and then given batch-split part2 (mapped, with sheets to confirm), and both
// parts of batch-split in ProviderA-USD analyzed. It never uses batch-clean nor validates (#111): validating depends on
// the history. At the end every import it created is cancelled with a reason, so the run can repeat without seeding.
//
// Every screen is captured at 1280 and at 1024 px and measured at both: the run fails if the page scrolls sideways, a
// table scrolls inside its card, or an open dialog is wider or taller than what it shows.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const FOLDER = 'docs/wireframes/import-in-progress/'
const OUT = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const sample = (path: string) => fileURLToPath(new URL(`../../data/samples/${path}`, import.meta.url))
const PART1 = sample('batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx')
const PART2 = sample('batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx')
const LEGACY = sample('legacy-provider/Legacy_ProviderC-Alt_batch.xlsx')
const CLEANUP_REASON = 'Screenshots of import-in-progress: cleanup'

const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 1024, height: 768 },
] as const

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

async function signIn(page: Page, userName: string) {
  const password = process.env.SEED_PASSWORD
  if (!password) throw new Error('SEED_PASSWORD is not set: copy .env.example to .env at the repository root.')
  await page.goto(`${BASE_URL}/login`)
  await page.getByLabel('User name').fill(userName)
  await setPassword(page, password)
  try {
    await page.getByRole('button', { name: 'Sign in' }).click()
  } finally {
    await clearPassword(page)
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

async function newPage(browser: Browser) {
  const context = await browser.newContext({ viewport: WIDTHS[0] })
  context.setDefaultTimeout(15_000)
  return context.newPage()
}

/** What does not fit at the current width: the page sideways, a table inside its card, an open dialog. */
async function overflows(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = []
    const pagePx = document.documentElement.scrollWidth - window.innerWidth
    if (pagePx > 0) found.push(`page ${pagePx} px wider`)
    for (const table of document.querySelectorAll<HTMLElement>('[data-slot="table-container"]')) {
      const px = table.scrollWidth - table.clientWidth
      if (px > 0) found.push(`table ${px} px wider than its card`)
    }
    for (const dialog of document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')) {
      const box = dialog.getBoundingClientRect()
      if (dialog.scrollWidth > dialog.clientWidth) found.push('dialog scrolls sideways')
      if (box.left < -0.5 || box.right > window.innerWidth + 0.5) found.push('dialog outside the viewport sideways')
      if (box.top < 0 || box.bottom > window.innerHeight) found.push('dialog cut at the bottom')
    }
    return found
  })
}

/** The measurements that found something; any of them makes the run fail. */
const problems: string[] = []

/** Captures the screen at 1280 and at 1024 px, measures both, and leaves the page at 1280. */
async function shot(page: Page, name: string, { dialog = false } = {}) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size)
    // The layout settles after a resize (the sidebar and the tables reflow).
    await page.waitForTimeout(300)
    const file = size.width === 1280 ? name : `${name}-1024`
    await page.screenshot({ path: `${OUT}${file}.png`, fullPage: !dialog })
    const found = await overflows(page)
    console.log(`saved ${FOLDER}${file}.png · ${found.length === 0 ? 'fits' : found.join(', ')}`)
    if (found.length > 0) problems.push(`${file}: ${found.join(', ')}`)
  }
  await page.setViewportSize(WIDTHS[0])
}

const mainNav = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click()

/** Imports created by this run, cancelled at the end. */
const created: string[] = []

/** Chooses a file in the drop zone of Upload Files and waits for the answer that stores it. */
async function dropFile(page: Page, file: string, creates: boolean) {
  const answer = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      (creates ? /\/api\/v1\/accounts\/[^/]+\/imports$/ : /\/api\/v1\/imports\/[^/]+\/files$/).test(response.url()),
  )
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop .xlsx files here or choose files' }).click()
  await (await chooser).setFiles(file)
  const response = await answer
  expect(response.ok(), `upload of ${file}`).toBe(true)
  if (creates) created.push(((await response.json()) as { importId: string }).importId)
  await expect(page.getByRole('listitem', { name: file.split(/[\\/]/).at(-1) })).toBeVisible()
}

/** New Reconciliation in merchant › provider › account with one file: lands on the new import. */
async function newImport(page: Page, merchant: string, provider: string, account: string, file: string) {
  await mainNav(page, 'New Reconciliation')
  await page.getByLabel('Merchant').selectOption({ label: merchant })
  await page.getByLabel('Provider').selectOption({ label: provider })
  await page.getByLabel('Account').selectOption({ label: account })
  await dropFile(page, file, true)
  await expect(page).toHaveURL(/\/imports\/[0-9a-f-]{36}/)
}

async function confirmMapping(page: Page) {
  await page.getByRole('tab', { name: 'Mapping' }).click()
  await page.getByRole('button', { name: 'Confirm mapping' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
}

/** In Progress from the menu, optionally with filters in the address, its list loaded. */
async function inProgress(page: Page, search = '') {
  if (search) await page.goto(`${BASE_URL}/reconciliations/in-progress?${search}`)
  else await mainNav(page, 'In Progress')
  await expect(page.getByRole('heading', { level: 1, name: 'In Progress' })).toBeVisible()
  await page.waitForLoadState('networkidle')
}

/** The row of an import in the list: the one whose Resume leads to it. */
const rowOf = (page: Page, importId: string) =>
  page.getByRole('row').filter({ has: page.locator(`a[href="/imports/${importId}"]`) })

/**
 * Cancels from In Progress with a reason; optionally captures the dialog with the reason written. An import that is
 * not in the list is looked up in its own page: `already` when it says cancelled, `missing` otherwise, which the
 * cleanup reports to cancel by hand (review-diff B1).
 */
async function cancelFromList(
  page: Page,
  importId: string,
  reason: string,
  capture?: string,
): Promise<'cancelled' | 'already' | 'missing'> {
  await inProgress(page, 'mine=true')
  const row = rowOf(page, importId)
  if ((await row.count()) === 0) {
    await page.goto(`${BASE_URL}/imports/${importId}`)
    const header = page.getByRole('region', { name: 'Import' })
    const cancelled = await header
      .getByText('cancelled', { exact: true })
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    return cancelled ? 'already' : 'missing'
  }
  await row.getByRole('button', { name: 'Cancel' }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByLabel('Reason').fill(reason)
  if (capture) await shot(page, capture, { dialog: true })
  await dialog.getByRole('button', { name: 'Yes, cancel the import' }).click()
  await expect(dialog).toBeHidden()
  await expect(rowOf(page, importId)).toHaveCount(0)
  return 'cancelled'
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  try {
    const analyst = await newPage(browser)
    await signIn(analyst, 'analyst')

    // 1. batch-split part1 in ProviderA-USD, left uploaded.
    await newImport(analyst, 'Merchant A', 'Provider A', 'ProviderA-USD', PART1)
    const uploaded = created.at(-1) as string

    // 2. The legacy file in ProviderC-Alt, confirmed, then batch-split part2 added: its sheets wait for confirmation.
    await newImport(analyst, 'Merchant B', 'Provider C', 'ProviderC-Alt', LEGACY)
    await confirmMapping(analyst)
    await analyst.getByRole('tab', { name: 'Files' }).click()
    await dropFile(analyst, PART2, false)
    await analyst.getByRole('tab', { name: 'Mapping' }).click()
    const readiness = analyst.getByRole('status', { name: 'Readiness' })
    await expect(readiness.getByText(/confirmation: The mapping of sheet/).first()).toBeVisible()
    await expect(analyst.getByRole('button', { name: 'Analyze' })).toBeDisabled()
    await shot(analyst, 'readiness-unconfirmed')

    // 3. Both parts of batch-split in ProviderA-USD, analyzed.
    await newImport(analyst, 'Merchant A', 'Provider A', 'ProviderA-USD', PART1)
    await dropFile(analyst, PART2, false)
    await confirmMapping(analyst)
    await analyst.getByRole('button', { name: 'Analyze' }).click()
    await expect(analyst.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
      timeout: 90_000,
    })

    // In Progress: every open import of the scope, then filtered by status and Only mine.
    await inProgress(analyst)
    await expect(analyst.getByRole('table', { name: 'Imports in progress' })).toBeVisible()
    await shot(analyst, 'in-progress')
    await inProgress(analyst, 'status=mapped&mine=true')
    await expect(rowOf(analyst, created[1] as string)).toBeVisible()
    await shot(analyst, 'in-progress-filtered')
    await inProgress(analyst, 'merchantId=1&providerId=102&status=validated&mine=true')
    if (await analyst.getByText('No imports in progress.').isVisible()) await shot(analyst, 'in-progress-empty')
    else console.log('skipped in-progress-empty: analyst has a validated import of Provider B')

    // Cancel from the list with a reason: the dialog is captured with the reason written.
    await cancelFromList(analyst, uploaded, 'Duplicate upload of part1', 'cancel-dialog')
  } finally {
    // Whatever happened, nothing created here stays open.
    if (created.length > 0) {
      const cleaner = await newPage(browser)
      try {
        await signIn(cleaner, 'analyst')
        const missing: string[] = []
        for (const importId of created) {
          const outcome = await cancelFromList(cleaner, importId, CLEANUP_REASON)
          if (outcome === 'already') console.log(`${importId} was already cancelled`)
          if (outcome === 'missing') missing.push(importId)
        }
        if (missing.length > 0) {
          console.log(`cleanup failed, cancel these imports by hand: ${missing.join(', ')} (not in In Progress)`)
        }
      } catch (error) {
        console.log(`cleanup failed, cancel these imports by hand: ${created.join(', ')} (${(error as Error).message})`)
      }
    }
    await browser.close()
  }
  // The screenshots stay on disk to look at, but a run with any problem is not one to commit.
  if (problems.length > 0) throw new Error(`Does not fit: ${problems.join('; ')}. Do not commit these screenshots.`)
}

await main()
