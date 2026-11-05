// Screenshots of the Matching Rules screens for the PR of web-admin-matching (design D11, task 9.2). Not a test: it is
// outside the features of playwright-bdd, so `pnpm test:e2e` does not pick it up, and no CI job runs it. It needs the
// app and the API the person starts (`pnpm db:up`, `pnpm db:seed`, `pnpm dev`) on a fresh seed. Same protections as
// web-admin-accounts: the password comes from the root .env at run time, is set from the page, the field is emptied
// right after signing in, there is no trace nor video, and nothing is captured before the screen is on display.
//
// It CREATES one empty rule set under Provider C, named bruno-<id of the run> so the integration tests ignore it
// (admin-matching D8), and leaves it inactive. Afterwards the database must be seeded again. "Provider C legacy" and the
// global rules do not change: the edit mode is cancelled, the regex that does not compile is refused by the API (400)
// and deactivating the legacy set is refused because ProviderC-Alt uses it (409 rule_set_in_use).
//
// Every screen is captured at 1280 and at 1024 px and measured at both: the run fails if the page scrolls sideways, a
// table scrolls inside its card, or an open dialog is wider or taller than what it shows.
import { existsSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, expect, type Locator, type Page } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const FOLDER = 'docs/wireframes/web-admin-matching/'
const OUT = fileURLToPath(new URL(`../../${FOLDER}`, import.meta.url))

const rootEnv = fileURLToPath(new URL('../../.env', import.meta.url))
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv)

const MERCHANT = 'Merchant B'
const PROVIDER = 'Provider C'
const LEGACY = 'Provider C legacy'
const ACCOUNT = 'ProviderC-Alt'
/** The id of the run: a second run on the same seed gets another name. */
const NEW_RULE_SET = `bruno-${Date.now().toString(36)}`
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
      // The New rule set dialog may scroll down inside itself; an alert dialog must show all of it.
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
 * Screens named on the command line (`pnpm screenshots:web-admin-matching rule-set-edit`): only those are captured
 * and measured, and the other files stay as they are. Without names, every screen.
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

/** The longest rule set name the API takes: 80 characters, without spaces, so nothing breaks it by itself. */
const LONG_NAME = `bruno-${'X'.repeat(74)}`

/**
 * Measures a screen at 1024 px with the rule set name in one element replaced, in the page, by LONG_NAME (`text` builds
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
  console.log(`measured ${screen}-1024 with an 80-character name · ${found.length === 0 ? 'fits' : found.join(', ')}`)
  if (found.length > 0) problems.push(`${screen}-1024 with an 80-character name: ${found.join(', ')}`)
  await handle.evaluate((element, value) => {
    element.textContent = value
  }, original)
  await handle.dispose()
  await page.setViewportSize(WIDTHS[0])
}

const mainNav = (page: Page, name: string) =>
  page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click()

/** Matching Rules from the menu, with Merchant B and Provider C chosen and their rule sets loaded. */
async function ruleSets(page: Page) {
  await mainNav(page, 'Matching Rules')
  await expect(page.getByRole('heading', { level: 1, name: 'Matching Rules' })).toBeVisible()
  await page.getByLabel('Merchant', { exact: true }).selectOption({ label: MERCHANT })
  await page.getByLabel('Provider', { exact: true }).selectOption({ label: PROVIDER })
  await expect(page.getByRole('table', { name: 'Rule sets of the provider' }).getByRole('row').nth(1)).toBeVisible()
  await page.waitForLoadState('networkidle')
}

/** The detail of a rule set from the list of Provider C, with its rules and the statuses loaded. */
async function ruleSet(page: Page, name: string) {
  await ruleSets(page)
  await page.getByRole('table', { name: 'Rule sets of the provider' }).getByRole('link', { name, exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Sheet rules' }).getByRole('row').nth(1)).toBeVisible()
  await page.waitForLoadState('networkidle')
}

const statusOf = (page: Page) => page.getByRole('region', { name: 'Rule set' })

async function main() {
  mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: false })
  let created: string | null = null
  try {
    const admin = await newPage(browser)
    await signIn(admin, 'admin')

    // The rule sets of Provider C, before this run creates anything.
    await ruleSets(admin)
    await shot(admin, 'rule-sets')
    await longNameFits(
      admin,
      'rule-sets',
      admin.getByRole('table', { name: 'Rule sets of the provider' }).getByRole('link').first(),
      (n) => n,
    )

    // "Provider C legacy" in read mode.
    await ruleSet(admin, LEGACY)
    await shot(admin, 'rule-set')
    await longNameFits(admin, 'rule-set', admin.getByRole('heading', { level: 1 }), (n) => n)

    // Rename…, only measured with a long name, then cancelled.
    await admin.getByRole('button', { name: 'Rename…' }).click()
    const rename = admin.getByRole('dialog', { name: `Rename ${LEGACY}` })
    await expect(rename).toBeVisible()
    await longNameFits(
      admin,
      'rename-sheet',
      rename.getByRole('heading', { name: `Rename ${LEGACY}` }),
      (n) => `Rename ${n}`,
    )
    await rename.getByRole('button', { name: 'Cancel' }).click()
    await expect(rename).toBeHidden()

    // Edit mode, as it opens: nothing is changed.
    await admin.getByRole('button', { name: 'Edit rules' }).click()
    await expect(admin.getByRole('button', { name: 'Save' })).toBeVisible()
    await shot(admin, 'rule-set-edit')

    // A regex that does not compile: the API answers 400 next to the field, and the form keeps its values.
    const pattern = admin.getByLabel('Pattern of column rule 1')
    await pattern.fill('^amount(')
    await admin.getByLabel('Regex of column rule 1').check()
    await admin.getByRole('button', { name: 'Save' }).click()
    await expect(pattern).toHaveAttribute('aria-invalid', 'true')
    await expect(admin.getByRole('button', { name: 'Save' })).toBeVisible()
    await shot(admin, 'rule-set-400')
    await admin.getByRole('button', { name: 'Cancel' }).click()
    await expect(admin.getByRole('button', { name: 'Edit rules' })).toBeVisible()
    await expect(admin.getByRole('cell', { name: 'Merchant Order No#' })).toBeVisible()

    // Deactivate…: ProviderC-Alt uses the set, so the API answers 409 rule_set_in_use and it stays active.
    await admin.getByRole('button', { name: 'Deactivate…' }).click()
    const deactivate = admin.getByRole('alertdialog', { name: `Deactivate ${LEGACY}?` })
    await expect(deactivate).toBeVisible()
    await deactivate.getByRole('button', { name: 'Deactivate' }).click()
    await expect(deactivate.getByRole('link', { name: ACCOUNT })).toBeVisible()
    await shot(admin, 'rule-set-in-use', { dialog: true })
    await longNameFits(admin, 'deactivate-dialog', deactivate.getByRole('heading'), (n) => `Deactivate ${n}?`)
    await deactivate.getByRole('button', { name: 'Cancel' }).click()
    await expect(deactivate).toBeHidden()
    await expect(statusOf(admin).getByText('active', { exact: true })).toBeVisible()

    // The Overview of ProviderC-Alt, with the link to its rule set.
    await admin.getByRole('region', { name: 'Linked accounts' }).getByRole('link', { name: ACCOUNT }).click()
    await expect(admin.getByRole('heading', { level: 1, name: ACCOUNT })).toBeVisible()
    await expect(admin.getByRole('link', { name: LEGACY })).toBeVisible()
    await admin.waitForLoadState('networkidle')
    await shot(admin, 'account-overview')
    await longNameFits(admin, 'overview-link', admin.getByRole('link', { name: LEGACY }), (n) => n)

    // The global defaults with the status aliases.
    await mainNav(admin, 'Matching Rules')
    await admin.getByRole('link', { name: 'Global defaults' }).click()
    await expect(admin.getByRole('heading', { level: 1, name: 'Global defaults' })).toBeVisible()
    await expect(admin.getByRole('table', { name: 'Status aliases' }).getByRole('row').nth(1)).toBeVisible()
    await admin.waitForLoadState('networkidle')
    await shot(admin, 'global-rules')

    // A run limited to other screens creates nothing.
    if (ONLY.length === 0 || ONLY.includes('new-rule-set')) {
      // New rule set under Provider C, empty; it opens its detail and is left inactive.
      await ruleSets(admin)
      await admin.getByRole('button', { name: 'New rule set' }).click()
      const create = admin.getByRole('dialog', { name: 'New rule set' })
      await expect(create).toBeVisible()
      await create.getByLabel('Name').fill(NEW_RULE_SET)
      await shot(admin, 'new-rule-set', { dialog: true })
      await create.getByRole('button', { name: 'Create rule set' }).click()
      await expect(admin.getByRole('heading', { level: 1, name: NEW_RULE_SET })).toBeVisible()
      created = NEW_RULE_SET

      await admin.getByRole('button', { name: 'Deactivate…' }).click()
      const off = admin.getByRole('alertdialog', { name: `Deactivate ${NEW_RULE_SET}?` })
      await off.getByRole('button', { name: 'Deactivate' }).click()
      await expect(off).toBeHidden()
      await expect(statusOf(admin).getByText('inactive', { exact: true })).toBeVisible()
    }
  } finally {
    await browser.close()
    if (created) console.log(`${created} is now in the local database, inactive: seed it again with \`pnpm db:seed\`.`)
  }
  // The screenshots stay on disk to look at, but a run with any problem is not one to commit.
  if (problems.length > 0) throw new Error(`Does not fit: ${problems.join('; ')}. Do not commit these screenshots.`)
}

await main()
