// Screenshots of the account and channel screens for the PR of web-admin-accounts (design D11, task 10.2). Not a test:
// it is outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs
// the app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) on a fresh seed. Same protections as
// web-admin-fees: the password comes from the root .env at run time, is set from the page, the field is emptied right
// after signing in, there is no trace nor video, and nothing is captured before the screen is on display.
//
// It CREATES one account under Provider C, named with the bruno- prefix so the integration tests ignore it
// (admin-accounts D9), copying the fees of ProviderC-USD, and leaves it closed. Afterwards the database must be seeded
// again. The 409 account_name_taken is refused by the API and the Edit sheet is cancelled, so no other account changes.
//
// Every screen is captured at 1280 and at 1024 px and measured at both: the run fails if the page scrolls sideways, a
// table scrolls inside its card, or an open dialog is wider or taller than what it shows.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Locator, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const FOLDER = 'docs/wireframes/web-admin-accounts/'
const OUT = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const ACCOUNT = 'ProviderA-USD'
const NEW_ACCOUNT = 'bruno-ProviderC-EUR'
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
      // A sheet or the New account dialog may scroll down inside itself; an alert dialog must show all of it.
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
 * Screens named on the command line (`pnpm screenshots:web-admin-accounts edit-sheet`): only those are captured and
 * measured, and the other files stay as they are. Without names, every screen.
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
    console.log(`saved ${FOLDER}${file}.png · ${found.length === 0 ? 'fits' : found.join(', ')}`)
    if (found.length > 0) problems.push(`${file}: ${found.join(', ')}`)
  }
  await page.setViewportSize(WIDTHS[0])
}

/** A link to a section of Account Detail (Overview, Fees). */
const section = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Account sections' }).getByRole('link', { name })

/** Accounts from the menu, with the merchant and provider chosen. */
async function accounts(page: Page, merchant: string, provider: string) {
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Accounts' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Accounts' })).toBeVisible()
  await page.getByLabel('Merchant').selectOption({ label: merchant })
  await page.getByLabel('Provider').selectOption({ label: provider })
  await expect(page.getByRole('table').getByRole('row').nth(1)).toBeVisible()
  await expect(page.getByText('Loading channels…')).toHaveCount(0)
}

/** Account Detail on its Overview, from the Accounts list, with the channels loaded. */
async function overview(page: Page, merchant: string, provider: string, account: string) {
  await accounts(page, merchant, provider)
  await page.getByRole('table').getByRole('link', { name: account, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: account })).toBeVisible()
  await expect(section(page, 'Overview')).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('table', { name: 'Channels of the account' }).getByRole('row').nth(1)).toBeVisible()
  await page.waitForLoadState('networkidle')
}

/** The longest account name the API takes: 50 characters, without spaces, so nothing breaks it by itself. */
const LONG_NAME = `bruno-${'X'.repeat(44)}`

/**
 * Measures a screen at 1024 px with the account name in one element replaced, in the page, by LONG_NAME (`text` builds
 * the whole text of the element around it). Besides the checks of every screenshot, the element itself must neither
 * scroll sideways nor end past the viewport. Nothing is saved nor captured; the text is put back afterwards.
 */
async function longNameFits(page: Page, screen: string, target: Locator, text: (name: string) => string) {
  if (ONLY.length > 0 && !ONLY.includes(screen)) return
  await page.setViewportSize(WIDTHS[1])
  // The element is pinned before its text changes: a locator by name (the dialog, the heading) would stop matching.
  const handle = await target.elementHandle()
  if (!handle) throw new Error(`${screen}: no element to measure`)
  const original = await handle.evaluate((element, value) => {
    const before = element.textContent ?? ''
    element.textContent = value
    return before
  }, text(LONG_NAME))
  await page.waitForTimeout(300)
  const found = await overflows(page)
  const own = await handle.evaluate((element) => {
    const box = element.getBoundingClientRect()
    const issues: string[] = []
    if (element.scrollWidth > element.clientWidth) issues.push('the name scrolls inside its element')
    if (box.right > window.innerWidth + 0.5) issues.push('the name ends past the viewport')
    return issues
  })
  found.push(...own)
  console.log(`measured ${screen}-1024 with a 50-character name · ${found.length === 0 ? 'fits' : found.join(', ')}`)
  if (found.length > 0) problems.push(`${screen}-1024 with a 50-character name: ${found.join(', ')}`)
  await handle.evaluate((element, value) => {
    element.textContent = value
  }, original)
  await handle.dispose()
  await page.setViewportSize(WIDTHS[0])
}

/** The first bruno- name no account uses yet: an earlier run on the same seed left its account behind. */
async function freeName(page: Page): Promise<string> {
  for (let n = 1; ; n++) {
    const name = n === 1 ? NEW_ACCOUNT : `${NEW_ACCOUNT}-${n}`
    if ((await page.getByRole('table').getByRole('link', { name, exact: true }).count()) === 0) return name
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  let created: string | null = null
  try {
    // admin: Accounts of Provider C with New account.
    const admin = await newPage(browser)
    await signIn(admin, 'admin')
    await accounts(admin, 'Merchant B', 'Provider C')
    const name = await freeName(admin)
    await shot(admin, 'accounts-admin')
    await longNameFits(admin, 'accounts-admin', admin.getByRole('table').getByRole('link').first(), (n) => n)

    // New account under Provider C, copying the fees of ProviderC-USD, with the provider's rule set.
    await admin.getByRole('button', { name: 'New account' }).click()
    const create = admin.getByRole('dialog', { name: 'New account' })
    await expect(create).toBeVisible()
    await create.getByLabel('Name').fill(name)
    await create.getByLabel('Merchant').selectOption({ label: 'Merchant B' })
    await create.getByLabel('Provider').selectOption({ label: 'Provider C' })
    await expect(create.getByLabel('Fees').locator('option', { hasText: 'ProviderC-USD' })).toHaveCount(1)
    await create.getByLabel('Fees').selectOption({ label: 'ProviderC-USD' })
    await expect(create.getByLabel('Matching rules').locator('option', { hasText: 'Provider C legacy' })).toHaveCount(1)
    await create.getByLabel('Matching rules').selectOption({ label: 'Provider C legacy' })
    await shot(admin, 'new-account', { dialog: true })

    // A name in use: the API answers 409 account_name_taken and the form keeps its values.
    await create.getByLabel('Name').fill(ACCOUNT)
    await create.getByRole('button', { name: 'Create account' }).click()
    await expect(create.getByText('This name is already used by another account. Name must be unique.')).toBeVisible()
    await shot(admin, 'new-account-name-taken', { dialog: true })

    // A run limited to other screens creates nothing: it cancels here.
    const createsAccount = ONLY.length === 0 || ONLY.some((n) => n === 'close-dialog' || n === 'account-closed')
    if (!createsAccount) {
      await create.getByRole('button', { name: 'Cancel' }).click()
      await expect(create).toBeHidden()
    } else {
      // The free name creates it and opens its Account Detail.
      await create.getByLabel('Name').fill(name)
      await create.getByRole('button', { name: 'Create account' }).click()
      await expect(admin.getByRole('heading', { level: 1, name })).toBeVisible()
      created = name

      // Close…, then the account closed: it is left so.
      await admin.getByRole('button', { name: 'Close…' }).click()
      const close = admin.getByRole('alertdialog', { name: `Close ${name}?` })
      await expect(close).toBeVisible()
      await shot(admin, 'close-dialog', { dialog: true })
      await longNameFits(admin, 'close-dialog', close.getByRole('heading'), (n) => `Close ${n}?`)
      await close.getByRole('button', { name: 'Close account' }).click()
      await expect(close).toBeHidden()
      const header = admin.getByRole('region', { name: 'Account' })
      await expect(header.getByText('closed', { exact: true })).toBeVisible()
      await expect(admin.getByRole('button', { name: 'Reopen…' })).toBeVisible()
      await admin.waitForLoadState('networkidle')
      await shot(admin, 'account-closed')
    }

    // admin: Overview of ProviderA-USD, the Edit sheet (cancelled) and the Fees tab.
    await overview(admin, 'Merchant A', 'Provider A', ACCOUNT)
    await shot(admin, 'overview-admin')
    await longNameFits(admin, 'overview-admin', admin.getByRole('heading', { level: 1 }), (n) => n)

    await admin.getByRole('button', { name: 'Edit' }).click()
    const edit = admin.getByRole('dialog', { name: `Edit ${ACCOUNT}` })
    await expect(edit).toBeVisible()
    await shot(admin, 'edit-sheet', { dialog: true })
    await longNameFits(admin, 'edit-sheet', edit.getByRole('heading', { name: `Edit ${ACCOUNT}` }), (n) => `Edit ${n}`)
    await edit.getByRole('button', { name: 'Cancel' }).click()
    await expect(edit).toBeHidden()

    await section(admin, 'Fees').click()
    await expect(section(admin, 'Fees')).toHaveAttribute('aria-current', 'page')
    await expect(admin.getByRole('table', { name: 'Fees of the account' }).getByRole('row').nth(1)).toBeVisible()
    await admin.waitForLoadState('networkidle')
    await shot(admin, 'account-fees-tab')

    // analyst: the same Overview, without account.manage.
    const analyst = await newPage(browser)
    await signIn(analyst, 'analyst')
    await overview(analyst, 'Merchant A', 'Provider A', ACCOUNT)
    await expect(analyst.getByRole('button', { name: 'Edit' })).toHaveCount(0)
    await shot(analyst, 'overview-analyst')

    // viewer: Channel Assignment, read only, within Merchant A.
    const viewer = await newPage(browser)
    await signIn(viewer, 'viewer')
    await viewer.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Channel Assignment' }).click()
    await expect(viewer.getByRole('heading', { level: 1, name: 'Channel Assignment' })).toBeVisible()
    const primary = viewer.getByRole('table', { name: 'Primary account per channel' })
    await expect(primary.getByRole('row').nth(1)).toBeVisible()
    await viewer.waitForLoadState('networkidle')
    await shot(viewer, 'channel-assignment-viewer')
    await longNameFits(viewer, 'channel-assignment-viewer', primary.getByRole('link').first(), (n) => n)
  } finally {
    await browser.close()
    if (created) console.log(`${created} is now in the local database, closed: seed it again with \`pnpm db:seed\`.`)
  }
  // The screenshots stay on disk to look at, but a run with any problem is not one to commit.
  if (problems.length > 0) throw new Error(`Does not fit: ${problems.join('; ')}. Do not commit these screenshots.`)
}

await main()
