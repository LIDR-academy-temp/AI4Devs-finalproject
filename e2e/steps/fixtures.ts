// The test every step file binds to, with what a scenario created, so that a scenario that fails half way can be
// cleaned up. Exported so that bddgen finds the test the steps are bound to.
import { test as base, createBdd } from 'playwright-bdd'

/** What a scenario created: imports from the answer of the POST that creates them, attempts from their summary URL. */
export interface Created {
  importIds: string[]
  batchIds: string[]
}

export const test = base.extend<{ created: Created }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures take their dependencies as a destructured object
  created: async ({}, use) => use({ importIds: [], batchIds: [] }),
})

export const { Given, When, Then, After } = createBdd(test)

// Cleanup of a scenario that fails half way: the imports it created are cancelled, so none stays open in the local
// database. A passing scenario cleans up in its last steps. It runs in a new tab, so the page of the failure stays as
// it was for the report, and a cleanup that fails is noted on the test, not reported as a second error.
After(async ({ page, created, $testInfo }) => {
  if ($testInfo.status === $testInfo.expectedStatus) return
  for (const importId of created.importIds) {
    const tab = await page.context().newPage()
    try {
      await tab.goto(`/imports/${importId}`, { timeout: 10_000 })
      const header = tab.getByRole('region', { name: 'Import' })
      await header.getByText('Status').waitFor({ timeout: 10_000 })
      const cancel = tab.getByRole('button', { name: 'Cancel import' })
      if (!(await cancel.isVisible())) continue
      await cancel.click({ timeout: 5_000 })
      await tab
        .getByRole('alertdialog')
        .getByLabel('Reason')
        .fill('Smoke test cleanup after a failure', { timeout: 5_000 })
      await tab
        .getByRole('alertdialog')
        .getByRole('button', { name: 'Yes, cancel the import' })
        .click({ timeout: 5_000 })
      await header.getByText('cancelled', { exact: true }).waitFor({ timeout: 10_000 })
    } catch (error) {
      $testInfo.annotations.push({
        type: 'cleanup',
        description: `Import ${importId} could not be cancelled: ${(error as Error).message.split('\n')[0]}`,
      })
    } finally {
      await tab.close()
    }
  }
})
