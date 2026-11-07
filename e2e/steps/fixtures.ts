// The test every step file binds to, with what a scenario created, so that a scenario that fails half way can be
// cleaned up. Exported so that bddgen finds the test the steps are bound to.
import { test as base, createBdd } from 'playwright-bdd'
import { apiClient, cleanUp } from '../support/cleanup.ts'

/** What a scenario created: imports and attempts from the answer of the POST that creates them (createdBy). */
export interface Created {
  importIds: string[]
  batchIds: string[]
}

/** What the steps of a scenario learn on the way and later steps compare with. */
export interface Story {
  /** The batch number processed last, as Settlement Review proposed it. */
  batchNo?: number
  /** The attempt shown last in the Settlement Summary. */
  batchId?: string
}

export const test = base.extend<{ created: Created; story: Story }>({
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures take their dependencies as a destructured object
  created: async ({}, use) => use({ importIds: [], batchIds: [] }),
  // biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures take their dependencies as a destructured object
  story: async ({}, use) => use({}),
})

export const { Given, When, Then, After } = createBdd(test)

// Cleanup of a scenario that fails half way (design D6): its attempts are unpaid and undone and its imports cancelled,
// through the API, so nothing it created stays open. A passing scenario cleans up in its own steps. What the cleanup
// could not do is noted on the test, not reported as a second error over the one of the scenario.
After(async ({ created, $testInfo }) => {
  if ($testInfo.status === $testInfo.expectedStatus) return
  for (const note of await cleanUp(created, apiClient())) {
    $testInfo.annotations.push({ type: 'cleanup', description: note })
  }
})
