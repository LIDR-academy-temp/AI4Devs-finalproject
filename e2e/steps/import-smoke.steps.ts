// Steps of the import smoke. Selectors are roles and accessible texts, the same as frontend/src/features/imports/strings.ts.
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'
import { createBdd } from 'playwright-bdd'

const { Given, When, Then, After } = createBdd()

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

Given('the analyst is signed in', async ({ page }) => {
  const password = process.env.SEED_PASSWORD
  if (!password) throw new Error('SEED_PASSWORD is not set: copy .env.example to .env at the repository root.')
  await page.goto('/login')
  await page.getByLabel('User name').fill('analyst')
  // The password is set from the page, not with fill(): the title of a fill step carries the text it types, and
  // the password must not reach the console nor the report.
  await setPassword(page, password)
  // The click has its own timeout, shorter than the test's: once the test runs out of time the finally cannot
  // empty the field any more.
  try {
    await page.getByRole('button', { name: 'Sign in' }).click({ timeout: 15_000 })
  } finally {
    await clearPassword(page)
  }
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
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

When('they upload {string}', async ({ page }, path: string) => {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop .xlsx files here or choose files' }).click()
  await (await chooser).setFiles(repositoryFile(path))
  await expect(page).toHaveURL(/\/imports\/[0-9a-f-]{36}/)
  const fileName = path.split('/').at(-1)!
  await expect(page.getByRole('listitem', { name: fileName })).toBeVisible()
})

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

Then('they see {int} rows read and {int} matched', async ({ page }, read: number, matched: number) => {
  // The card is its label and its number, nothing else: the whole text pins the count exactly.
  await expect(page.getByRole('region', { name: 'Rows read' })).toHaveText(`Rows read${read}`)
  await expect(page.getByRole('region', { name: 'Matched', exact: true })).toHaveText(`Matched${matched}`)
})

Then('they see the channel notice {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('region', { name: 'Channels to review' })).toContainText(text)
})

When('they cancel the import', async ({ page }) => {
  await page.getByRole('button', { name: 'Cancel import' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, cancel the import' }).click()
})

Then('the import is {string}', async ({ page }, status: string) => {
  await expect(page.getByRole('region', { name: 'Import' }).getByText(status, { exact: true })).toBeVisible()
})

// Cleanup of a scenario that fails half way: the import it created is cancelled, so none stays open in the local
// database. A passing scenario cancels it in its last steps.
After(async ({ page, $testInfo }) => {
  if ($testInfo.status === $testInfo.expectedStatus) return
  const importId = /\/imports\/([0-9a-f-]{36})/.exec(page.url())?.[1]
  if (!importId) return
  await page.goto(`/imports/${importId}`)
  await page.getByRole('region', { name: 'Import' }).getByText('Status').waitFor()
  const cancel = page.getByRole('button', { name: 'Cancel import' })
  if (!(await cancel.isVisible())) return
  await cancel.click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Yes, cancel the import' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('cancelled', { exact: true })).toBeVisible()
})
