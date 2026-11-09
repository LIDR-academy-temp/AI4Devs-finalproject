// Screen steps of the demo video. Copies of the steps of the suite with the same selectors (demo-video design D3): the
// suite is not touched, so if a selector of the app changes, it changes in steps/ and here. Each copy names its origin.
// Only what support/ already exports is imported; the steps of the suite cannot be, they register with playwright-bdd.
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { apiSession } from '../support/api.ts'
import { createdBy } from '../support/cleanup.ts'
import { expectedOf } from '../support/expected.ts'

export const BASE_URL = 'http://localhost:5173'

const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

/** What the video created, for the cleanup through the API (support/cleanup.ts). */
export interface Created {
  importIds: string[]
  batchIds: string[]
}

/** Copy of setPassword of steps/common.steps.ts: the value is set from the page, so no log carries it. */
async function setPassword(page: Page, value: string) {
  await page.getByLabel('Password').evaluate((input, text) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

/** Copy of clearPassword of steps/common.steps.ts: empties the field whatever happened to the click. */
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

/**
 * Copy of signIn of steps/common.steps.ts, with two differences for the video: the user name is typed in sight, and
 * the password field must be of type password before anything is written in it, so the video only shows dots.
 */
export async function signIn(page: Page, user: string, beforeClick: () => Promise<void>) {
  const password = process.env.SEED_PASSWORD
  if (!password) throw new Error('SEED_PASSWORD is not set: copy .env.example to .env at the repository root.')
  if (!page.url().includes('/login')) await page.goto(`${BASE_URL}/login`)
  await page.getByLabel('User name').pressSequentially(user, { delay: 80 })
  await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password')
  await setPassword(page, password)
  try {
    await beforeClick()
    await page.getByRole('button', { name: 'Sign in' }).click()
  } finally {
    await clearPassword(page)
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

/** Copy of upload of steps/common.steps.ts: the first file creates the import, its importId goes to created. */
export async function uploadFile(page: Page, created: Created, path: string) {
  const upload = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/api\/v1\/(accounts\/[^/]+\/imports|imports\/[^/]+\/files)$/.test(response.url()),
    { timeout: 15_000 },
  )
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop .xlsx files here or choose files' }).click()
  await (await chooser).setFiles(repositoryFile(path))
  const response = await upload
  const made = createdBy('POST', response.url(), response.status(), response.ok() ? await response.json() : {})
  if (made && 'importId' in made) created.importIds.push(made.importId)
  await expect(page).toHaveURL(/\/imports\/[0-9a-f-]{36}/)
  await expect(page.getByRole('listitem', { name: path.split('/').at(-1)! })).toBeVisible()
}

/** Copy of processBatch of steps/settlement.steps.ts: the batchId comes from the answer of the POST. */
export async function processBatch(page: Page, created: Created): Promise<number> {
  const button = page.getByRole('button', { name: /^Process batch \d+$/ })
  await expect(button).toBeEnabled()
  const match = /^Process batch (\d+)$/.exec((await button.textContent())?.trim() ?? '')
  if (!match) throw new Error('Not a Process button.')
  const processed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && /\/api\/v1\/imports\/[^/]+\/settlements$/.test(response.url()),
    { timeout: 60_000 },
  )
  await button.click()
  const response = await processed
  const made = createdBy('POST', response.url(), response.status(), response.ok() ? await response.json() : {})
  if (!made || !('batchId' in made)) throw new Error(`Processing answered ${response.status()}, no attempt created.`)
  created.batchIds.push(made.batchId)
  await expect(page).toHaveURL(new RegExp(`/settlements/${made.batchId}`), { timeout: 60_000 })
  return Number(match[1])
}

/** Copy of the step "they download the merchant summary of {string} with its amount payable". */
export async function downloadMerchantSummary(page: Page, sample: string, batchNo: number) {
  const expected = expectedOf(sample)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Merchant summary' }).click(),
  ])
  expect(download.suggestedFilename()).toBe(`${expected.account}_B${batchNo}_A1_summary.csv`)
  const lines = (await readFile(await download.path(), 'utf8')).split(/\r?\n/)
  const payable = lines.find((line) => line.startsWith('Amount payable,'))
  expect(payable, 'the Amount payable row of the summary').toBeDefined()
  expect(payable!.split(','), 'the Amount payable row of the summary').toContain(expected.summary!.amountPayable)
}

/** Copy of cardNumber of steps/common.steps.ts: the big number of a counter card. */
export const cardNumber = (page: Page, card: string) =>
  page.getByRole('region', { name: card, exact: true }).locator(':scope > span').nth(1)

/** Copy of amountPayable of steps/settlement.steps.ts. */
export const amountPayable = (page: Page) =>
  page.getByRole('table', { name: 'Amount payable' }).getByRole('row').last().getByRole('cell').nth(2)

/** Copy of headerValue of steps/settlement.steps.ts: a term of the header of the Settlement Summary. */
export const headerValue = (page: Page, term: string) =>
  page
    .getByRole('region', { name: /^Settlement Summary · batch / })
    .locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${term}$`) }) })
    .locator('dd')

/** Copy of the step "the database is freshly seeded for {string}" of steps/settlement.steps.ts. */
export async function assertFreshSeed(sample: string) {
  const expected = expectedOf(sample)
  const api = apiSession()
  const fresh = 'Run pnpm db:seed first: the demo video needs a freshly seeded database.'
  const unassigned = await api.get<{ name: string }[]>('analyst', '/channels?unassigned=true')
  for (const channel of expected.warnings?.newChannels ?? []) {
    if (!unassigned.some((c) => c.name === channel)) throw new Error(`${channel} already has an account. ${fresh}`)
  }
  const merchants = await api.get<{ merchantId: string; name: string }[]>('analyst', '/merchants')
  let accountId: string | undefined
  for (const merchant of merchants) {
    const providers = await api.get<{ providerId: string }[]>('analyst', `/merchants/${merchant.merchantId}/providers`)
    for (const provider of providers) {
      const accounts = await api.get<{ accountId: string; name: string }[]>(
        'analyst',
        `/providers/${provider.providerId}/accounts`,
      )
      accountId ??= accounts.find((a) => a.name === expected.account)?.accountId
    }
  }
  if (!accountId) throw new Error(`Account ${expected.account} not found. ${fresh}`)
  const next = await api.get<{ batchNo: number }>('analyst', `/accounts/${accountId}/batch-number/next`)
  if (next.batchNo !== expected.proposedBatchNo) {
    throw new Error(
      `The next batch of ${expected.account} is ${next.batchNo}, not ${expected.proposedBatchNo}. ${fresh}`,
    )
  }
}
