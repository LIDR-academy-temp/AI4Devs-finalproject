// Screenshots of the resolution of ambiguous rows, for the PR of web-ambiguous-rows (design D6, task 4.1). Not a test:
// it is outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It
// needs the app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`). Same protections as
// import-in-progress: the password comes from the root .env at run time, is set from the page, the field is emptied
// right after signing in, there is no trace nor video, and nothing is captured before the screen is on display.
//
// The seed produces no ambiguous rows, so GET rows is intercepted with page.route: the real answer gets one synthetic
// ambiguous row in front (sheet and file of the first real row, an ID and transactions that do not exist in the seed,
// one candidate of the user's merchant and one of another merchant). Nothing else is intercepted: the import, its
// validation run and its review are real, which is why the Ambiguous counter says 0. The dialog is always closed with
// Keep, never confirmed (the PATCH of a synthetic row would answer 404).
//
// It creates one import as analyst through the screens (batch-split, both parts, in ProviderA-USD), analyzes it,
// validates it and continues, and at the end cancels it with a reason, so the run can repeat without seeding. It never
// uses batch-clean (#111). Every screen is captured at 1280 px and measured at 1280 and 1024 px: the run fails if the
// page scrolls sideways, a table scrolls inside its card, or an open dialog is wider or taller than what it shows. One
// exception until #132: at 1024 px the rows table of Analysis is wider than its card even without the synthetic row,
// so there it is logged as a known overflow and no 1024 px screenshot is saved. Once #132 is fixed, that exception goes
// and the run fails at 1024 px again.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const FOLDER = 'docs/wireframes/web-ambiguous-rows/'
const OUT = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const sample = (path: string) => fileURLToPath(new URL(`../../data/samples/${path}`, import.meta.url))
const PART1 = sample('batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx')
const PART2 = sample('batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx')
const CLEANUP_REASON = 'Screenshots of web-ambiguous-rows: cleanup'

const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 1024, height: 768 },
] as const

/** The synthetic ambiguous row: an ID and transactions that are not in the seed. */
const SYNTHETIC_ROW_NO = 9999
const SYNTHETIC_ID = '999999999999901'
const OWN_GATEWAY = 'Gateway Numeric'
const OTHER_GATEWAY = 'Gateway Shared'

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

/**
 * What does not fit at the current width: the page sideways, a table inside its card, an open dialog. The rows table
 * of Analysis is reported apart (`rowsTable`), so that its known overflow at 1024 px (#132) can be told from the rest.
 */
async function overflows(page: Page): Promise<{ found: string[]; rowsTable: string | null }> {
  return page.evaluate(() => {
    const found: string[] = []
    let rowsTable: string | null = null
    const pagePx = document.documentElement.scrollWidth - window.innerWidth
    if (pagePx > 0) found.push(`page ${pagePx} px wider`)
    for (const table of document.querySelectorAll<HTMLElement>('[data-slot="table-container"]')) {
      const px = table.scrollWidth - table.clientWidth
      if (px <= 0) continue
      if (table.querySelector('table[aria-label="Rows"]')) rowsTable = `rows table ${px} px wider than its card`
      else found.push(`table ${px} px wider than its card`)
    }
    for (const dialog of document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"]')) {
      const box = dialog.getBoundingClientRect()
      if (dialog.scrollWidth > dialog.clientWidth) found.push('dialog scrolls sideways')
      if (box.left < -0.5 || box.right > window.innerWidth + 0.5) found.push('dialog outside the viewport sideways')
      if (box.top < 0 || box.bottom > window.innerHeight) found.push('dialog cut at the bottom')
    }
    return { found, rowsTable }
  })
}

/** The measurements that found something; any of them makes the run fail. */
const problems: string[] = []

/**
 * Captures the screen at 1280 px and measures it at 1280 and 1024 px, leaving the page at 1280. At 1024 px the rows
 * table is a known overflow until #132: logged, not a problem, and no screenshot is saved at that width.
 */
async function shot(page: Page, name: string, { dialog = false } = {}) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size)
    // The layout settles after a resize (the sidebar and the tables reflow).
    await page.waitForTimeout(300)
    const wide = size.width === 1280
    if (wide) await page.screenshot({ path: `${OUT}${name}.png`, fullPage: !dialog })
    const { found, rowsTable } = await overflows(page)
    const label = wide ? `saved ${FOLDER}${name}.png` : `measured ${name} at ${size.width} px`
    const known = !wide && rowsTable ? ` · known (#132): ${rowsTable}` : ''
    const failing = wide && rowsTable ? [...found, rowsTable] : found
    console.log(`${label} · ${failing.length === 0 ? 'fits' : failing.join(', ')}${known}`)
    if (failing.length > 0) problems.push(`${name} at ${size.width} px: ${failing.join(', ')}`)
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

interface RowItem {
  fileId: string
  fileName: string
  sheetId: string
  sheetName: string
  [key: string]: unknown
}

/** The synthetic ambiguous row, in the sheet and file of a real row of the import. */
function syntheticRow(real: RowItem) {
  return {
    fileId: real.fileId,
    fileName: real.fileName,
    sheetId: real.sheetId,
    sheetName: real.sheetName,
    rowNo: SYNTHETIC_ROW_NO,
    cycle: 'E',
    matchResult: 'ambiguous',
    reason: null,
    transactionIdRaw: SYNTHETIC_ID,
    transactionId: null,
    gatewayId: null,
    statusRaw: null,
    statusId: 2,
    statusName: 'Successful',
    amount: '42.1000',
    currency: 'USD',
    excludeAmount: false,
    ignore: false,
    warnings: [],
    candidates: [
      {
        gatewayId: 1,
        gatewayName: OWN_GATEWAY,
        transactionId: '990000001',
        channelId: 1001,
        channelName: 'RAM-01',
        statusId: 2,
        statusName: 'Successful',
        amount: '42.1000',
      },
      {
        gatewayId: 99,
        gatewayName: OTHER_GATEWAY,
        transactionId: '990000002',
        channelId: null,
        channelName: null,
        statusId: null,
        statusName: null,
        amount: null,
        outOfScope: true,
      },
    ],
    transaction: null,
    rawData: { ID: SYNTHETIC_ID, Amount: '42.1', Currency: 'USD' },
  }
}

/**
 * The only interception (design D6): GET rows of the import answers the real page, with the synthetic ambiguous row in
 * front on the first page without a filter or with `match=ambiguous`. The sheet and file come from the first real row
 * the import answered.
 */
async function injectAmbiguousRow(page: Page, importId: string) {
  let real: RowItem | null = null
  await page.route(`**/api/v1/imports/${importId}/rows?*`, async (route) => {
    const response = await route.fetch()
    const body = (await response.json()) as { items: RowItem[]; total: number; page: number; pageSize: number }
    real ??= body.items[0] ?? null
    const match = new URL(route.request().url()).searchParams.get('match')
    if (real && body.page === 1 && (match === null || match === 'ambiguous')) {
      // The page keeps its size: the last real row moves to the next page, as the API would order it.
      body.items = [syntheticRow(real) as unknown as RowItem, ...body.items].slice(0, body.pageSize)
      body.total += 1
    }
    await route.fulfill({ response, json: body })
  })
}

/** The Analysis step of the import with the rows on screen and the synthetic row's buttons there. */
async function openAnalysis(page: Page, importId: string, sheetName: string) {
  await page.goto(`${BASE_URL}/imports/${importId}?step=analysis`)
  await expect(page.getByRole('table', { name: 'Rows' })).toBeVisible()
  await expect(chooseButton(page, OWN_GATEWAY, sheetName)).toBeVisible()
  await page.waitForLoadState('networkidle')
}

const chooseButton = (page: Page, gateway: string, sheetName: string) =>
  page.getByRole('button', { name: `Choose ${gateway} for row ${SYNTHETIC_ROW_NO} of ${sheetName}` })

/** Opens the confirmation of the own candidate, captures it and closes it with Keep. */
async function captureDialog(page: Page, sheetName: string, name: string, warns: boolean) {
  await chooseButton(page, OWN_GATEWAY, sheetName).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  const warning = dialog.getByText('The current validation run is discarded', { exact: false })
  if (warns) await expect(warning).toBeVisible()
  else await expect(warning).toHaveCount(0)
  await shot(page, name, { dialog: true })
  await dialog.getByRole('button', { name: 'Keep' }).click()
  await expect(dialog).toBeHidden()
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

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  try {
    const analyst = await newPage(browser)
    await signIn(analyst, 'analyst')

    // batch-split, both parts, in ProviderA-USD: uploaded, confirmed and analyzed through the screens.
    await mainNav(analyst, 'New Reconciliation')
    await analyst.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
    await analyst.getByLabel('Provider').selectOption({ label: 'Provider A' })
    await analyst.getByLabel('Account').selectOption({ label: 'ProviderA-USD' })
    await dropFile(analyst, PART1, true)
    await expect(analyst).toHaveURL(/\/imports\/[0-9a-f-]{36}/)
    await dropFile(analyst, PART2, false)
    await analyst.getByRole('tab', { name: 'Mapping' }).click()
    await analyst.getByRole('button', { name: 'Confirm mapping' }).click()
    await expect(analyst.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
    await analyst.getByRole('button', { name: 'Analyze' }).click()
    await expect(analyst.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
      timeout: 90_000,
    })
    const importId = created.at(-1) as string

    // Before the synthetic row: what the rows table measures on its own (#132), logged to tell it apart from what the
    // candidates add. Not a problem of this run.
    for (const size of WIDTHS) {
      await analyst.setViewportSize(size)
      await analyst.waitForTimeout(300)
      const { rowsTable } = await overflows(analyst)
      console.log(`baseline ${size.width} px without the synthetic row · ${rowsTable ?? 'rows table fits'}`)
    }
    await analyst.setViewportSize(WIDTHS[0])

    // The synthetic row lands in the sheet of the first real row; its name is read from the screen.
    await injectAmbiguousRow(analyst, importId)
    await analyst.goto(`${BASE_URL}/imports/${importId}?step=analysis`)
    const first = analyst.getByRole('table', { name: 'Rows' }).getByRole('row').nth(1)
    await expect(first).toContainText(SYNTHETIC_ID)
    const sheetName = (await first.getByRole('cell').first().locator('span').first().textContent()) ?? ''

    // Analyzed, no run yet: the row with Choose, and the confirmation without the run warning.
    await openAnalysis(analyst, importId, sheetName)
    await expect(analyst.getByText('No validation run yet.')).toBeVisible()
    await shot(analyst, 'ambiguous-row')
    await captureDialog(analyst, sheetName, 'resolve-dialog-no-run', false)

    // A real run: the confirmation warns that it is discarded.
    await analyst.getByRole('button', { name: 'Run validations' }).click()
    await expect(analyst.getByText('No validation run yet.')).toBeHidden({ timeout: 90_000 })
    await captureDialog(analyst, sheetName, 'resolve-dialog', true)

    // Continue: validated, Choose disabled with the reason.
    const continueButton = analyst.getByRole('button', { name: 'Continue to settlement review' })
    if (await continueButton.isDisabled()) {
      throw new Error('Continue is disabled: the run of batch-split is blocked in this database (#111). Seed again.')
    }
    const reviewed = analyst.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/imports\/[^/]+\/review$/.test(response.url()),
    )
    await continueButton.click()
    expect((await reviewed).ok(), 'review of the run').toBe(true)
    await openAnalysis(analyst, importId, sheetName)
    await expect(analyst.getByRole('region', { name: 'Import' }).getByText('validated', { exact: true })).toBeVisible()
    await expect(chooseButton(analyst, OWN_GATEWAY, sheetName)).toBeDisabled()
    await expect(
      analyst.getByText('Run the validations again to choose a gateway: the import goes back to Analyzed.'),
    ).toBeVisible()
    await shot(analyst, 'ambiguous-row-validated')
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
