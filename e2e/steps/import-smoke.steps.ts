// Steps of the import smoke that only it uses; the shared ones are in common.steps.ts. Selectors are roles and
// accessible texts, the same as frontend/src/features/imports/strings.ts.
import { expect } from '@playwright/test'
import { Then } from './fixtures.ts'

Then('they see {int} rows read and {int} matched', async ({ page }, read: number, matched: number) => {
  // The card is its label and its number, nothing else: the whole text pins the count exactly.
  await expect(page.getByRole('region', { name: 'Rows read' })).toHaveText(`Rows read${read}`)
  await expect(page.getByRole('region', { name: 'Matched', exact: true })).toHaveText(`Matched${matched}`)
})

Then('they see the channel notice {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('region', { name: 'Channels to review' })).toContainText(text)
})
