// Steps shared by the smoke and the user stories. Selectors are roles and accessible texts, the same as the strings.ts
// of each feature of the frontend.
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { createdBy } from '../support/cleanup.ts'
import { expectedOf, sampleFile } from '../support/expected.ts'
import { type Created, Given, Then, When } from './fixtures.ts'

/** The reason of every cancel the steps make, the smoke's and the stories' alike. */
export const CANCEL_REASON = 'E2E: cancel the import'

const repositoryFile = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

/** Sets the value of the password field from the page, so no step title nor log carries it. */
async function setPassword(page: Page, value: string) {
  await page.getByLabel('Password').evaluate((input, text) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, value)
}

/**
 * Empties the password field without waiting for it: after the click the form may be gone, and if signing in fails
 * the snapshot of the page that the report attaches must not hold the password.
 */
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

/** Signs in as a seeded user. Every seeded user has SEED_PASSWORD. */
async function signIn(page: Page, user: string) {
  const password = process.env.SEED_PASSWORD
  if (!password) throw new Error('SEED_PASSWORD is not set: copy .env.example to .env at the repository root.')
  // Signing in from another page (the summary of an attempt, after signing out) comes back to it.
  if (!page.url().includes('/login')) await page.goto('/login')
  await page.getByLabel('User name').fill(user)
  // The password is set from the page, not with fill(): the title of a fill step carries the text it types, and
  // the password must not reach the console nor the report.
  await setPassword(page, password)
  // The finally empties the field when the click fails or times out (actionTimeout, 15 s, well before the test
  // timeout). It cannot when the page no longer answers or the test itself has run out of time: then the error of
  // the evaluate is ignored and the field keeps its value.
  try {
    await page.getByRole('button', { name: 'Sign in' }).click()
  } finally {
    await clearPassword(page)
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
}

Given('the analyst is signed in', async ({ page }) => signIn(page, 'analyst'))

Given('the {string} user is signed in', async ({ page }, user: string) => signIn(page, user))

When('they sign out', async ({ page }) => {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByLabel('User name')).toBeVisible()
})

When(
  'they start a new reconciliation in {string} › {string} › {string}',
  async ({ page }, merchant: string, provider: string, account: string) => {
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'New Reconciliation' }).click()
    await page.getByLabel('Merchant').selectOption({ label: merchant })
    await page.getByLabel('Provider').selectOption({ label: provider })
    await page.getByLabel('Account').selectOption({ label: account })
  },
)

When('they upload {string}', async ({ page, created }, path: string) => upload(page, created, path))

// The files in the order of expected.json: the first creates the import, the others are added to it.
When('they upload the files of {string}', async ({ page, created }, sample: string) => {
  for (const file of expectedOf(sample).files) await upload(page, created, sampleFile(sample, file))
})

Then('they see the rows of {string}', async ({ page }, sample: string) => {
  const { rows } = expectedOf(sample)
  // A card is its label and its number; Unmatched may add its breakdown, so its number is checked alone.
  await expect(page.getByRole('region', { name: 'Rows read' })).toHaveText(`Rows read${rows.read}`)
  await expect(page.getByRole('region', { name: 'Matched', exact: true })).toHaveText(`Matched${rows.matched}`)
  await expect(cardNumber(page, 'Unmatched')).toHaveText(String(rows.unmatched))
  // HU1 CA6: ambiguous and ignored too, when the oracle has them (the rows with an empty ID are the ignored ones).
  if (rows.ambiguous !== undefined) await expect(cardNumber(page, 'Ambiguous')).toHaveText(String(rows.ambiguous))
  if (rows.ignoredEmptyId !== undefined) {
    await expect(cardNumber(page, 'Ignored')).toHaveText(String(rows.ignoredEmptyId))
  }
})

/** The big number of a counter card: its second child, after the label. */
export const cardNumber = (page: Page, card: string) =>
  page.getByRole('region', { name: card, exact: true }).locator(':scope > span').nth(1)

// The first file creates the import (POST /accounts/{id}/imports); a later one is added to it (POST /imports/{id}/files).
async function upload(page: Page, created: Created, path: string) {
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
  const fileName = path.split('/').at(-1)!
  await expect(page.getByRole('listitem', { name: fileName })).toBeVisible()
}

When('they confirm the proposed mapping', async ({ page }) => {
  await page.getByRole('tab', { name: 'Mapping' }).click()
  await page.getByRole('button', { name: 'Confirm mapping' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('mapped', { exact: true })).toBeVisible()
})

When('they analyze the import', async ({ page }) => {
  await page.getByRole('button', { name: 'Analyze' }).click()
  await expect(page.getByRole('tab', { name: 'Analysis' })).toHaveAttribute('aria-selected', 'true', {
    timeout: 90_000,
  })
})

When('they cancel the import', async ({ page }) => {
  await page.getByRole('button', { name: 'Cancel import' }).click()
  // The reason is required (spec "Cancelación del import desde la pantalla", #47).
  await page.getByRole('alertdialog').getByLabel('Reason').fill(CANCEL_REASON)
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, cancel the import' }).click()
})

Then('the import is {string}', async ({ page }, status: string) => {
  await expect(page.getByRole('region', { name: 'Import' }).getByText(status, { exact: true })).toBeVisible()
})
