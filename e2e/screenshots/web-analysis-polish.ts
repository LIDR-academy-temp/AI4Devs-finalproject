// Screenshots of the Analysis step after web-analysis-polish (#157, design D7), for its PR. Not a test: it is outside the
// features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs the app and the API
// the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`). Same protections as web-analysis-guardrails: the
// password comes from the root .env at run time, is set from the page, the field is emptied right after signing in,
// there is no trace nor video, and nothing is captured before the screen is on display.
//
// It creates three imports as analyst through the screens, one after the other, each cancelled with a reason once
// captured: batch-issues in ProviderB-Main (analyzed and validated: the header of Validations, its tooltip and the
// rows), batch-wrong-account in ProviderA-USD (rows with UUIDs) and batch-split in ProviderA-USD (both files). None is
// processed, so no batch number is used, and the run can repeat without seeding. It never uses batch-clean (#111).
// On batch-split it also puts, in the page only, a long sheet and a 150-character file name in the first row, and then
// intercepts GET rows to add one synthetic ambiguous row in front (as web-ambiguous-rows does: no sample has ambiguous
// rows), to look at the focus ring of its last Choose against the file name. Choose is never pressed.
//
// Every screen is captured and measured at 1280 and at 1024 px. The run fails if the page scrolls sideways, a table
// scrolls inside its card, an ID takes more than one line at 1280 px, the file of a row takes more than one line,
// overlaps the text of another cell or of its sheet or leaves the table, the long synthetic name is not cut, the
// ranges card is not centred or the three counter cards are not in one row. The overflow of the page and of each
// table, and the margin of the rows table at 1024 px, are printed always, for the PR.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const FOLDER = 'docs/wireframes/web-analysis-polish/'
const OUT = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const sample = (path: string) => fileURLToPath(new URL(`../../data/samples/${path}`, import.meta.url))
const ISSUES = sample('batch-issues/Recon_Template_ProviderB-Main_batch-issues.xlsx')
const WRONG_ACCOUNT = sample('batch-wrong-account/Recon_Template_ProviderA-USD_batch-wrong-account.xlsx')
const PART1 = sample('batch-split/Recon_Template_ProviderA-USD_batch-split_part1.xlsx')
const PART2 = sample('batch-split/Recon_Template_ProviderA-USD_batch-split_part2.xlsx')
const CLEANUP_REASON = 'Screenshots of web-analysis-polish: cleanup'

const LONG_SHEET = 'Transactions approved by issuer'
/** 154 characters: longer than the row at 1280 px. */
const LONG_FILE = `Recon_Template_ProviderA-USD_${'very_long_name_'.repeat(8)}.xlsx`
const SYNTHETIC_ROW_NO = 9999
const SYNTHETIC_ID = '999999999999901'

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

type Measure = { found: string[]; report: string[] }

/**
 * Everything measured at the current width (design D7). `found` makes the run fail; `report` is printed always.
 * `synthetic`: the first row carries the long sheet and file name, which must be cut.
 */
async function measure(page: Page, synthetic: boolean): Promise<Measure> {
  return page.evaluate((synthetic) => {
    const found: string[] = []
    const report: string[] = []
    const overlap = (a: DOMRect, b: DOMRect) =>
      Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 &&
      Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5
    /** The boxes of the text under an element, line by line: what a reader sees, not the boxes of its elements. */
    const textBoxes = (root: Element) => {
      const boxes: DOMRect[] = []
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      while (walker.nextNode()) {
        const node = walker.currentNode
        if (!node.textContent?.trim()) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        boxes.push(...range.getClientRects())
      }
      return boxes
    }
    const lines = (element: Element | null | undefined) =>
      new Set([...(element?.getClientRects() ?? [])].map((box) => Math.round(box.top))).size

    // 1. The page and each table inside its card.
    const pagePx = document.documentElement.scrollWidth - window.innerWidth
    report.push(`page ${pagePx > 0 ? `${pagePx} px wider` : 'fits'}`)
    if (pagePx > 0) found.push(`page ${pagePx} px wider`)
    for (const container of document.querySelectorAll<HTMLElement>('[data-slot="table-container"]')) {
      const name = container.querySelector('table')?.getAttribute('aria-label') ?? 'table'
      const px = container.scrollWidth - container.clientWidth
      report.push(`${name} ${px > 0 ? `${px} px wider than its card` : 'fits'}`)
      if (px > 0) found.push(`${name} ${px} px wider than its card`)
    }

    const rows = document.querySelector<HTMLTableElement>('table[aria-label="Rows"]')
    if (rows) {
      const container = rows.closest<HTMLElement>('[data-slot="table-container"]')!
      // 2. The margin of the rows table: its narrowest width against its card (web-rows-table-compact D2).
      const width = rows.style.width
      rows.style.width = 'min-content'
      const minContent = rows.getBoundingClientRect().width
      rows.style.width = width
      report.push(`rows table margin ${Math.round(container.clientWidth - minContent)} px`)

      // An ID with hyphens may wrap only where the width is short (web-analysis-guardrails D8).
      const idColumn = [...rows.tHead!.rows[0]!.cells].findIndex((th) => th.textContent === 'ID')
      if (idColumn === -1) found.push('rows table without an ID column: its IDs were not measured')
      if (window.innerWidth >= 1280) {
        const wrapped = [...rows.tBodies[0]!.rows].filter((tr) => lines(tr.cells[idColumn]?.firstElementChild) > 1)
        if (wrapped.length > 0) found.push(`${wrapped.length} IDs of the rows table on more than one line`)
      }

      // 3. The file of each row: one line, over no text of the row, inside the table (design D5).
      const box = container.getBoundingClientRect()
      let oneLine = 0
      for (const tr of rows.tBodies[0]!.rows) {
        const first = tr.cells[0]!
        const file = first.querySelector<HTMLElement>('span[title]')
        if (!file) {
          found.push('a row without its file')
          continue
        }
        const fileBox = file.getBoundingClientRect()
        if (lines(file) !== 1)
          found.push(`the file of row "${tr.cells[idColumn]?.textContent}" on ${lines(file)} lines`)
        else oneLine++
        if (fileBox.left < box.left - 0.5 || fileBox.right > box.right + 0.5) {
          found.push(`the file of row "${tr.cells[idColumn]?.textContent}" leaves the table`)
        }
        const others = [first.firstElementChild!.firstElementChild!, ...[...tr.cells].slice(1)]
        const over = others.some((element) => textBoxes(element).some((text) => overlap(text, fileBox)))
        if (over) found.push(`the file of row "${tr.cells[idColumn]?.textContent}" overlaps the text of the row`)
      }
      report.push(`${oneLine} files in one line`)

      // 4. The long synthetic name is cut with an ellipsis.
      if (synthetic) {
        const file = rows.tBodies[0]!.rows[0]!.cells[0]!.querySelector<HTMLElement>('span[title]')!
        if (file.scrollWidth <= file.clientWidth) found.push('the long synthetic file name is not cut')
        else report.push('long synthetic file name cut with an ellipsis')
      }
    }

    // Secondary (design D7): the ranges card centred, and the three counter cards in one row from sm.
    const ranges = document.querySelector('table[aria-label="Date ranges used by the validations"]')
    const card = ranges?.closest<HTMLElement>('[data-slot="card"]')
    if (card?.parentElement) {
      const outer = card.parentElement.getBoundingClientRect()
      const inner = card.getBoundingClientRect()
      const left = inner.left - outer.left
      const right = outer.right - inner.right
      report.push(`ranges card gaps ${Math.round(left)} / ${Math.round(right)} px`)
      if (Math.abs(left - right) > 1) found.push(`ranges card not centred (${Math.round(left)} / ${Math.round(right)})`)
    }
    const counters = document.querySelector('section[aria-label="Informative counters"]')
    const cards = counters ? [...counters.querySelectorAll<HTMLElement>(':scope > div > section')] : []
    if (cards.length > 0 && window.innerWidth >= 640) {
      const tops = new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top)))
      if (cards.length !== 3 || tops.size !== 1) found.push(`${cards.length} counter cards on ${tops.size} rows`)
    }
    return { found, report }
  }, synthetic)
}

/** The measurements that found something; any of them makes the run fail. */
const problems: string[] = []

/** Captures the screen at 1280 and at 1024 px, measures both, and leaves the page at 1280. */
async function shot(
  page: Page,
  name: string,
  { synthetic = false, prepare }: { synthetic?: boolean; prepare?: () => Promise<void> } = {},
) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size)
    // The layout settles after a resize (the sidebar and the tables reflow).
    await page.waitForTimeout(300)
    // What the resize may have undone, such as an open tooltip, is set again before the capture.
    await prepare?.()
    const file = size.width === 1280 ? name : `${name}-1024`
    await page.screenshot({ path: `${OUT}${file}.png`, fullPage: true })
    const { found, report } = await measure(page, synthetic)
    console.log(
      `saved ${FOLDER}${file}.png · ${report.join(' · ')}${found.length > 0 ? ` · FOUND ${found.join(', ')}` : ''}`,
    )
    if (found.length > 0) problems.push(`${name} at ${size.width} px: ${found.join(', ')}`)
  }
  await page.setViewportSize(WIDTHS[0])
}

const mainNav = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click()

/** Imports created by this run, cancelled once captured; whatever is left is cancelled at the end. */
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
  await page.unrouteAll({ behavior: 'ignoreErrors' })
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

/** Cancels the last import created and takes it off the list of what is left. */
async function cancelLast(page: Page) {
  const importId = created.pop()!
  console.log(
    `${importId} ${(await cancelImport(page, importId, CLEANUP_REASON)) === 'already' ? 'was already closed' : 'cancelled'}`,
  )
}

/** Creates an import with the files in the account, confirms the proposed mapping and analyzes it, by the screens. */
async function analyzeFiles(page: Page, provider: string, account: string, files: string[]) {
  await mainNav(page, 'New Reconciliation')
  await page.getByLabel('Merchant').selectOption({ label: 'Merchant A' })
  await page.getByLabel('Provider').selectOption({ label: provider })
  await page.getByLabel('Account').selectOption({ label: account })
  await dropFile(page, files[0]!, true)
  await expect(page).toHaveURL(/\/imports\/[0-9a-f-]{36}/)
  for (const file of files.slice(1)) await dropFile(page, file, false)
  await page.getByRole('tab', { name: 'Mapping' }).click()
  await page.getByRole('button', { name: 'Confirm mapping' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Analyze' }).click()
  await expect(page.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
    timeout: 90_000,
  })
  await expect(page.getByRole('table', { name: 'Rows' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  return created.at(-1)!
}

interface RowItem {
  fileId: string
  fileName: string
  sheetId: string
  sheetName: string
  [key: string]: unknown
}

/** The synthetic ambiguous row of web-ambiguous-rows, in the sheet and file of a real row of the import. */
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
        gatewayName: 'Gateway Numeric',
        transactionId: '990000001',
        channelId: 1001,
        channelName: 'RAM-01',
        statusId: 2,
        statusName: 'Successful',
        amount: '42.1000',
      },
      {
        gatewayId: 99,
        gatewayName: 'Gateway Shared',
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

/** GET rows of the import answers the real first page with the synthetic ambiguous row in front. */
async function injectAmbiguousRow(page: Page, importId: string) {
  await page.route(`**/api/v1/imports/${importId}/rows?*`, async (route) => {
    const response = await route.fetch()
    const body = (await response.json()) as { items: RowItem[]; total: number; page: number; pageSize: number }
    const real = body.items[0]
    if (real && body.page === 1) {
      body.items = [syntheticRow(real) as unknown as RowItem, ...body.items].slice(0, body.pageSize)
      body.total += 1
    }
    await route.fulfill({ response, json: body })
  })
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  try {
    const analyst = await newPage(browser)
    await signIn(analyst, 'analyst')

    // batch-issues in ProviderB-Main, validated: the ranges centred, the counter cards and the tooltip of one of them.
    await analyzeFiles(analyst, 'Provider B', 'ProviderB-Main', [ISSUES])
    await analyst.getByRole('button', { name: 'Run validations' }).click()
    await expect(analyst.getByRole('table', { name: 'Validation results' })).toBeVisible({ timeout: 90_000 })
    await expect(analyst.getByRole('table', { name: 'Date ranges used by the validations' })).toBeVisible()
    await analyst.waitForLoadState('networkidle')
    await analyst.getByRole('region', { name: 'Validations' }).scrollIntoViewIfNeeded()
    await shot(analyst, 'validations-header')
    // With the keyboard: the focus on the info button opens its tooltip.
    const about = analyst.getByRole('button', { name: 'About Pending in range' })
    const openTooltip = async () => {
      // Out and back in, so the focus opens it again if the resize closed it.
      await about.blur()
      await about.focus()
      await expect(analyst.getByRole('tooltip')).toContainText('Pending on the gateway')
    }
    await openTooltip()
    await shot(analyst, 'validations-tooltip', { prepare: openTooltip })
    await analyst.keyboard.press('Escape')
    await expect(analyst.getByRole('tooltip')).toHaveCount(0)
    await analyst.getByRole('table', { name: 'Rows' }).scrollIntoViewIfNeeded()
    await shot(analyst, 'issues-rows')
    await cancelLast(analyst)

    // batch-wrong-account in ProviderA-USD: UUIDs that wrap after their hyphens at 1024 px, above the file.
    await analyzeFiles(analyst, 'Provider A', 'ProviderA-USD', [WRONG_ACCOUNT])
    await analyst.getByRole('table', { name: 'Rows' }).scrollIntoViewIfNeeded()
    await shot(analyst, 'wrong-account-rows')
    await cancelLast(analyst)

    // batch-split in ProviderA-USD, both files: two lines a row, with the name of each file.
    const split = await analyzeFiles(analyst, 'Provider A', 'ProviderA-USD', [PART1, PART2])
    await analyst.getByRole('table', { name: 'Rows' }).scrollIntoViewIfNeeded()
    await shot(analyst, 'split-rows')

    // In the page only: a long legacy sheet and a file name longer than the row, in the first row.
    await analyst.evaluate(
      ([sheet, file]) => {
        const first =
          document.querySelector<HTMLTableElement>('table[aria-label="Rows"]')!.tBodies[0]!.rows[0]!.cells[0]!
        first.querySelector('span')!.textContent = sheet
        const name = first.querySelector<HTMLElement>('span[title]')!
        name.textContent = file
        name.title = file
      },
      [LONG_SHEET, LONG_FILE],
    )
    await shot(analyst, 'split-synthetic', { synthetic: true })

    // A synthetic ambiguous row in front, and the focus on its last Choose from the keyboard.
    await injectAmbiguousRow(analyst, split)
    await analyst.goto(`${BASE_URL}/imports/${split}?step=analysis`)
    const first = analyst.getByRole('table', { name: 'Rows' }).getByRole('row').nth(1)
    await expect(first).toContainText(SYNTHETIC_ID)
    const chooses = first.getByRole('button')
    await expect(chooses).toHaveCount(2)
    await analyst.waitForLoadState('networkidle')
    await chooses.first().focus()
    await analyst.keyboard.press('Tab')
    await expect(chooses.last()).toBeFocused()
    await shot(analyst, 'split-ambiguous-focus')
    await cancelLast(analyst)
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
