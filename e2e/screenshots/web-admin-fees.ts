// Screenshots of the fee screens for the PR of web-admin-fees (design D11, task 10.2). Not a test: it is outside the
// features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs the app and the
// API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) on a fresh seed. Same protections as
// settlement-lifecycle: the password comes from the root .env at run time, is set from the page, the field is emptied
// right after signing in, there is no trace nor video, and nothing is captured before the screen is on display.
//
// It PROCESSES batch-clean first, as analyst, unless an earlier run left batch 123 processed: that shows the Summary
// of a processed attempt and puts the fees of ProviderA-USD in use (the seeded history does not reference its fees).
// Afterwards the database must be seeded again. The fee screens are only looked at: the 409 fee_overlap is refused by the API and every other dialog is
// cancelled, so no fee changes.
//
// Every screen is captured at 1280 and at 1024 px and measured at both: the run fails if the page scrolls sideways, a
// table scrolls inside its card, or an open dialog is wider or taller than what it shows.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const OUT = fileURLToPath(new URL('../../docs/wireframes/web-admin-fees/', import.meta.url))
const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const ACCOUNT = 'ProviderA-USD'
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
      // Half a pixel of slack: a panel against the right edge measures a fraction over it.
      if (box.left < -0.5 || box.right > window.innerWidth + 0.5) {
        found.push(
          `dialog outside the viewport sideways (${Math.round(box.left)}–${Math.round(box.right)} of ${window.innerWidth} px)`,
        )
      }
      // A sheet may scroll down inside itself; an alert dialog must show all of it.
      if (dialog.getAttribute('role') === 'alertdialog' && (box.top < 0 || box.bottom > window.innerHeight)) {
        found.push('dialog cut at the bottom')
      }
    }
    return found
  })
}

/** The measurements that found something; any of them makes the run fail. */
const problems: string[] = []

/**
 * Screens named on the command line (`pnpm screenshots:web-admin-fees summary-waiting-analyst`): only those are
 * captured and measured, and the other files stay as they are. Without names, every screen.
 */
const ONLY = process.argv.slice(2)

/**
 * Captures the screen at 1280 and at 1024 px, measures both, and leaves the page at 1280. A page is captured whole; with
 * a dialog open only the viewport is, as the dialog veils it.
 */
async function shot(page: Page, name: string, { dialog = false } = {}) {
  if (ONLY.length > 0 && !ONLY.includes(name)) return
  for (const size of WIDTHS) {
    await page.setViewportSize(size)
    // The layout settles after a resize (the sidebar and the tables reflow).
    await page.waitForTimeout(300)
    const file = size.width === 1280 ? name : `${name}-1024`
    await page.screenshot({ path: `${OUT}${file}.png`, fullPage: !dialog })
    const found = await overflows(page)
    console.log(`saved docs/wireframes/web-admin-fees/${file}.png · ${found.length === 0 ? 'fits' : found.join(', ')}`)
    if (found.length > 0) problems.push(`${file}: ${found.join(', ')}`)
  }
  await page.setViewportSize(WIDTHS[0])
}

async function cancelDialog(page: Page) {
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('alertdialog')).toBeHidden()
}

/** Global view from the menu, filtered to the transactional fees of Merchant A. */
async function globalFees(page: Page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Fees' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Fees · all accounts' })).toBeVisible()
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Kind').selectOption({ label: 'Transactional' })
  await expect(page).toHaveURL(/kind=transactional/)
  const table = page.getByRole('table', { name: 'Fees' })
  await expect(table.getByRole('row').nth(1)).toBeVisible()
  await expect(page.getByText('Loading fees…')).toBeHidden()
  return table
}

async function accountFees(page: Page) {
  const table = await globalFees(page)
  await table.getByRole('link', { name: ACCOUNT }).first().click()
  await expect(page.getByRole('heading', { level: 1, name: ACCOUNT })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Fees' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('table', { name: 'Fees of the account' }).getByRole('row').nth(1)).toBeVisible()
}

/**
 * Opens the Summary of batch 123 of ProviderA-USD: from Settlement List when an earlier run already processed it,
 * otherwise by processing batch-clean. Returns whether this run processed it.
 */
async function batch123Summary(page: Page): Promise<boolean> {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settlement List' }).click()
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Provider').selectOption({ label: 'Provider A' })
  await page.getByLabel('Account').selectOption({ label: ACCOUNT })
  const table = page.getByRole('table', { name: 'Settlements' })
  await expect(table.getByRole('row').nth(1)).toBeVisible()
  const attempt = table.getByRole('link', { name: /^Batch 123 · attempt/ }).first()
  if (await attempt.isVisible()) {
    await attempt.click()
    await expect(page.getByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeVisible()
    return false
  }
  await processBatchClean(page)
  return true
}

/** Uploads batch-clean to ProviderA-USD, maps, analyzes, validates and processes it as batch 123. */
async function processBatchClean(page: Page) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'New Reconciliation' }).click()
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Provider').selectOption({ label: 'Provider A' })
  await page.getByLabel('Account').selectOption({ label: ACCOUNT })
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop .xlsx files here or choose files' }).click()
  await (await chooser).setFiles(
    repositoryFile('data/samples/batch-clean/Recon_Template_ProviderA-USD_batch-clean.xlsx'),
  )
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
  await page.getByRole('region', { name: 'Decision' }).getByRole('link', { name: 'Settlement Review' }).click()
  await expect(page.getByRole('textbox', { name: 'Batch number' })).toHaveValue('123')
  await page.getByLabel('Settlement date').fill('2026-10-24')
  await page.getByRole('checkbox', { name: 'Assign these channels to this account as primary' }).check()
  const process = page.getByRole('button', { name: 'Process batch 123' })
  await expect(process).toBeEnabled()
  await process.click()
  await expect(page.getByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeVisible({ timeout: 60_000 })
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  let processed = false
  try {
    // analyst first, on a processed attempt: waiting for someone with payment.process. Processing batch-clean is also
    // what puts the fees of ProviderA-USD in use: the seeded history does not reference them.
    const analyst = await newPage(browser)
    await signIn(analyst, 'analyst')
    processed = await batch123Summary(analyst)
    await expect(analyst.getByText('Waiting for a user with payment permission to mark it as paid.')).toBeVisible()
    // The sections of the Summary arrive after the heading: a capture before them would be cut short.
    await analyst.waitForLoadState('networkidle')
    await shot(analyst, 'summary-waiting-analyst')

    // analyst: the page of the account, read only.
    await accountFees(analyst)
    await expect(analyst.getByRole('button', { name: 'Add fee' })).toHaveCount(0)
    await shot(analyst, 'account-fees-analyst')

    // admin: the global view, then the page of the account with Fees active in the menu.
    const admin = await newPage(browser)
    await signIn(admin, 'admin')
    await globalFees(admin)
    await shot(admin, 'fees-global')

    await accountFees(admin)
    const menuFees = admin.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Fees' })
    await expect(menuFees).toHaveAttribute('aria-current', 'page')
    await shot(admin, 'account-fees-admin')

    // Add fee: the empty form, then an MDR always → open over the seeded one: the API answers 409 fee_overlap.
    await admin.getByRole('button', { name: 'Add fee' }).click()
    const create = admin.getByRole('dialog', { name: 'Add fee' })
    await expect(create).toBeVisible()
    await shot(admin, 'add-fee', { dialog: true })
    await create.getByLabel('Fee type').selectOption({ label: 'MDR' })
    await create.getByLabel('Percentage (%)').fill('2.75')
    await create.getByRole('button', { name: 'Save fee' }).click()
    await expect(create.getByText('Overlaps another MDR fee:')).toBeVisible()
    await shot(admin, 'add-fee-overlap', { dialog: true })
    await cancelDialog(admin)

    // Edit of MDR, in use since the seeded history: only the description and the end date are editable.
    await admin.getByRole('button', { name: 'Edit MDR, always' }).click()
    const edit = admin.getByRole('dialog', { name: 'Edit fee · MDR' })
    await expect(edit.getByText('This fee has been applied to settlements')).toBeVisible()
    await expect(edit.getByLabel('always (no start date)')).toBeDisabled()
    await expect(edit.getByLabel('Percentage (%)')).toBeDisabled()
    await shot(admin, 'edit-in-use', { dialog: true })
    await cancelDialog(admin)

    // Change from date: a new percentage from tomorrow, not applied.
    await admin.getByRole('button', { name: 'Change from date: MDR, always' }).click()
    const change = admin.getByRole('dialog', { name: 'Change MDR from a date' })
    await change.getByLabel('Effective from').fill('2026-11-04')
    await change.getByLabel('Percentage (%)').fill('9.5')
    await expect(change.getByText('The current fee will end on 2026-11-03.')).toBeVisible()
    await shot(admin, 'change-from-date', { dialog: true })
    await cancelDialog(admin)

    // Close…: the minimum is the last applied event of MDR, from the API.
    await admin.getByRole('button', { name: 'Close MDR, always' }).click()
    const close = admin.getByRole('alertdialog', { name: 'Close MDR' })
    await expect(close.getByText(/^Applied up to \d{4}-\d{2}-\d{2}: the end date cannot be earlier\.$/)).toBeVisible()
    await shot(admin, 'close-minimum', { dialog: true })
    await cancelDialog(admin)

    // History of MDR: the chain of the type in the account.
    await admin.getByRole('button', { name: 'History of MDR, always' }).click()
    const history = admin.getByRole('dialog', { name: 'History · MDR' })
    await expect(history.getByRole('listitem').first()).toBeVisible()
    await shot(admin, 'history', { dialog: true })
    await admin.keyboard.press('Escape')
    await expect(history).toBeHidden()
  } finally {
    await browser.close()
    if (processed) console.log('batch-clean is now processed in the local database: seed it again with `pnpm db:seed`.')
  }
  // The screenshots stay on disk to look at, but a run with any problem is not one to commit.
  if (problems.length > 0) throw new Error(`Does not fit: ${problems.join('; ')}. Do not commit these screenshots.`)
}

await main()
