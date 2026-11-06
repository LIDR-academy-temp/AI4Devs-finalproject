// Screenshots of the Analysis step with the guardrails of #92, for the PR of web-analysis-guardrails (design D7). Not a
// test: it is outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It
// needs the app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`). Same protections as
// web-ambiguous-rows: the password comes from the root .env at run time, is set from the page, the field is emptied
// right after signing in, there is no trace nor video, and nothing is captured before the screen is on display.
//
// It creates two imports as analyst through the screens and intercepts nothing: batch-wrong-account in ProviderA-USD
// (every row unmatched by id_format, so the breakdown and the wrong account notice) and batch-blocked in ProviderB-Main
// (RAM-01 is a channel of another provider). Neither is validated nor processed, so no batch number is used, and both
// are cancelled with a reason at the end, so the run can repeat without seeding. It never uses batch-clean (#111). Every
// screen is captured and measured at 1280 and at 1024 px: the run fails if the page scrolls sideways or a table scrolls
// inside its card (the rows table of Analysis included, #132).
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const FOLDER = 'docs/wireframes/web-analysis-guardrails/'
const OUT = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const sample = (path: string) => fileURLToPath(new URL(`../../data/samples/${path}`, import.meta.url))
const WRONG_ACCOUNT = sample('batch-wrong-account/Recon_Template_ProviderA-USD_batch-wrong-account.xlsx')
const BLOCKED = sample('batch-blocked/Recon_Template_ProviderB-Main_batch-blocked.xlsx')
const CLEANUP_REASON = 'Screenshots of web-analysis-guardrails: cleanup'

/** The oracle of the sample: the counter and its breakdown are checked against it, not against a number written here. */
const expected = JSON.parse(readFileSync(sample('batch-wrong-account/expected.json'), 'utf8')) as {
  rows: { unmatched: number; unmatchedByReason: { id_format: number } }
}

const WRONG_ACCOUNT_TEXT = 'The IDs do not fit any gateway of this account: the files may belong to another account.'
const OTHER_PROVIDER_NOTE = 'Channel of another provider: its rows are not processed in this account'

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
      if (px <= 0) continue
      const which = table.querySelector('table[aria-label="Rows"]') ? 'rows table' : 'table'
      found.push(`${which} ${px} px wider than its card`)
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
    if (found.length > 0) problems.push(`${name} at ${size.width} px: ${found.join(', ')}`)
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

/** Cancels an import from its own page with a reason; `already` when it is not cancellable any more. */
async function cancelImport(page: Page, importId: string, reason: string): Promise<'cancelled' | 'already'> {
  await page.goto(`${BASE_URL}/imports/${importId}`)
  const header = page.getByRole('region', { name: 'Import' })
  await expect(header).toBeVisible()
  const button = page.getByRole('button', { name: 'Cancel import' })
  if ((await button.count()) === 0) return 'already'
  await button.click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByLabel('Reason').fill(reason)
  await dialog.getByRole('button', { name: 'Yes, cancel the import' }).click()
  await expect(header.getByText('cancelled', { exact: true })).toBeVisible()
  return 'cancelled'
}

/** Creates an import of one file in the account, confirms the proposed mapping and analyzes it, through the screens. */
async function analyzeFile(page: Page, provider: string, account: string, file: string) {
  await mainNav(page, 'New Reconciliation')
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Provider').selectOption({ label: provider })
  await page.getByLabel('Account').selectOption({ label: account })
  await dropFile(page, file, true)
  await expect(page).toHaveURL(/\/imports\/[0-9a-f-]{36}/)
  await page.getByRole('tab', { name: 'Mapping' }).click()
  await page.getByRole('button', { name: 'Confirm mapping' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Analyze' }).click()
  await expect(page.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
    timeout: 90_000,
  })
  await expect(page.getByRole('table', { name: 'Rows' })).toBeVisible()
  await page.waitForLoadState('networkidle')
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  try {
    const analyst = await newPage(browser)
    await signIn(analyst, 'analyst')

    // batch-wrong-account in ProviderA-USD: the breakdown says every row is id_format, and the notice says why.
    await analyzeFile(analyst, 'Provider A', 'ProviderA-USD', WRONG_ACCOUNT)
    const unmatched = analyst.getByRole('region', { name: 'Unmatched' })
    await expect(unmatched).toContainText(String(expected.rows.unmatched))
    const reasons = unmatched.getByRole('list', { name: 'Unmatched by reason' }).getByRole('listitem')
    await expect(reasons).toHaveCount(1)
    await expect(reasons.first()).toHaveText(
      new RegExp(`^ID does not fit any gateway\\s*${expected.rows.unmatchedByReason.id_format}$`),
    )
    await expect(analyst.getByRole('region', { name: 'Wrong account?' })).toHaveText(WRONG_ACCOUNT_TEXT)
    await expect(analyst.getByRole('region', { name: 'Channels to review' })).toHaveCount(0)
    await shot(analyst, 'wrong-account')

    // The unmatched rows, from the link of the counter: the reason of each row is the one of the breakdown.
    await unmatched.getByRole('link', { name: 'Show unmatched rows' }).click()
    await expect(analyst).toHaveURL(/match=unmatched/)
    await expect(
      analyst.getByRole('table', { name: 'Rows' }).getByText('ID does not fit any gateway', { exact: false }).first(),
    ).toBeVisible()
    await analyst.waitForLoadState('networkidle')
    await shot(analyst, 'wrong-account-rows')

    // batch-blocked in ProviderB-Main: RAM-01 belongs to another provider, with the note of the API.
    await analyzeFile(analyst, 'Provider B', 'ProviderB-Main', BLOCKED)
    const ram01 = analyst
      .getByRole('region', { name: 'Channels to review' })
      .getByRole('listitem')
      .filter({ hasText: 'RAM-01' })
    await expect(ram01).toContainText('RAM-01 belongs to another provider')
    await expect(ram01).toContainText(OTHER_PROVIDER_NOTE)
    await expect(ram01).not.toContainText('is primary in')
    await expect(analyst.getByRole('region', { name: 'Wrong account?' })).toHaveCount(0)
    await shot(analyst, 'other-provider-channel')
  } finally {
    // Whatever happened, nothing created here stays open.
    if (created.length > 0) {
      const cleaner = await newPage(browser)
      try {
        await signIn(cleaner, 'analyst')
        for (const importId of created) {
          const outcome = await cancelImport(cleaner, importId, CLEANUP_REASON)
          console.log(`${importId} ${outcome === 'already' ? 'was already closed' : 'cancelled'}`)
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
