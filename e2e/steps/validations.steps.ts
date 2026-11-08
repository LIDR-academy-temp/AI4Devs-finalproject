// Steps of the validations and the decision (HU2). Selectors are roles and accessible texts, the same as
// frontend/src/features/validations/strings.ts and frontend/src/features/imports/strings.ts.
import { expect, type Page } from '@playwright/test'
import { type Expected, expectedOf, outcomeOf, type RangeKey, type ValidationOutcome } from '../support/expected.ts'
import { CANCEL_REASON, cardNumber } from './common.steps.ts'
import { Then, When } from './fixtures.ts'

/** The labels of the validations table, in the order of the API. */
const VALIDATIONS: Record<string, string> = {
  provider_mismatch: 'Provider mismatch',
  non_recorded_adjustment: 'Non-recorded adjustment',
  duplicate_in_batch: 'Duplicate in batch',
  status_collision_in_batch: 'Status collision in batch',
  duplicate_across_batches: 'Duplicate across batches',
  status_collision_across_batches: 'Status collision across batches',
  missing_previous_to_batch: 'Missing previous to batch',
  missing_in_range: 'Missing in range',
}

/** The labels of the reasons of an unmatched row, in the fixed order of the breakdown. */
const REASONS = {
  no_match: 'No match',
  id_format: 'ID does not fit any gateway',
  lossy_numeric_id: 'Numeric ID lost precision',
  no_gateways: 'No gateways for the account',
} as const

/** The Result column (strings.outcomes) and the Blocking column of the validations table. */
const OUTCOMES: Record<ValidationOutcome, string> = {
  passed: 'Passed',
  warning: 'Warning',
  blocked: 'Blocked',
  not_applicable: 'n/a',
}
const BLOCKS = 'Blocks'
const NOT_BLOCKING = '—'

/** The row of the date ranges table that carries each range: the I range spans CHB, REF and RDR (row 0 is the head). */
const RANGE_ROWS: Record<RangeKey, number> = { APP: 1, DEC: 2, I: 3, R: 6 }

const WRONG_ACCOUNT = 'The IDs do not fit any gateway of this account: the files may belong to another account.'
const NO_MATCHED_ROWS = 'No row of the files matches a transaction of this account.'

/** A flag of the oracle that a step depends on: without it the step would check a screen the sample does not have. */
function requireFlag(
  sample: string,
  expected: Expected,
  flag: 'likelyWrongAccount' | 'requiresEmptyBatchConfirmation',
) {
  if (expected[flag] !== true) throw new Error(`The oracle of ${sample} does not say ${flag}.`)
}

const validationRow = (page: Page, label: string) =>
  page
    .getByRole('table', { name: 'Validation results' })
    .getByRole('row')
    .filter({ has: page.getByText(label, { exact: true }) })

When('they run the validations', async ({ page }) => {
  await page.getByRole('button', { name: 'Run validations' }).click()
  await expect(page.getByRole('table', { name: 'Validation results' })).toBeVisible({ timeout: 60_000 })
})

// Each validation of the oracle (HU2 CA1): its result, its findings (a number, or a breakdown whose parts add up to
// them) and whether it blocks.
Then('the validations find what the oracle of {string} says', async ({ page }, sample: string) => {
  const expected = expectedOf(sample)
  const validations = expected.validations ?? {}
  if (Object.keys(validations).length === 0) throw new Error(`The oracle of ${sample} has no validations.`)
  for (const [code, value] of Object.entries(validations)) {
    const label = VALIDATIONS[code]
    if (!label) throw new Error(`Unknown validation in the oracle of ${sample}: ${code}`)
    const findings = typeof value === 'number' ? value : Object.values(value).reduce((sum, n) => sum + n, 0)
    const outcome = outcomeOf(expected, code, findings)
    // Columns: validation, result, findings, blocking, breakdown.
    const cells = validationRow(page, label).getByRole('cell')
    await expect(cells.nth(1), `result of ${code}`).toHaveText(OUTCOMES[outcome])
    await expect(cells.nth(2), `findings of ${code}`).toHaveText(String(findings))
    await expect(cells.nth(3), `blocking of ${code}`).toHaveText(outcome === 'blocked' ? BLOCKS : NOT_BLOCKING)
  }
})

// HU2 CA1: the APP, DEC, I and R ranges the run used. The screen shows instants; the oracle, the first and last day.
Then('the validations used the date ranges of {string}', async ({ page }, sample: string) => {
  const ranges = expectedOf(sample).ranges
  if (!ranges) throw new Error(`The oracle of ${sample} has no ranges.`)
  const rows = page.getByRole('table', { name: 'Date ranges used by the validations' }).getByRole('row')
  for (const [key, [first, last]] of Object.entries(ranges) as [RangeKey, [string, string]][]) {
    await expect(rows.nth(RANGE_ROWS[key]).getByRole('cell').nth(2), `range ${key}`).toHaveText(
      new RegExp(`^${first} \\d{2}:\\d{2} \\S+ – ${last} \\d{2}:\\d{2} \\S+$`),
    )
  }
})

Then(
  'the findings of {string} list the affected IDs of {string}',
  async ({ page }, validation: string, sample: string) => {
    const ids = expectedOf(sample).affectedIds?.provider_mismatch ?? []
    if (ids.length === 0) throw new Error(`The oracle of ${sample} has no affected IDs.`)
    await validationRow(page, validation).getByRole('button', { name: validation }).click()
    const findings = page.getByRole('table', { name: 'Findings' })
    for (const id of ids) await expect(findings).toContainText(id)
  },
)

Then('{string} is disabled with {string}', async ({ page }, button: string, reason: string) => {
  const target = page.getByRole('button', { name: button })
  await expect(target).toBeDisabled()
  // The reason is visible and tied to the button (aria-describedby).
  await expect(target).toHaveAccessibleDescription(reason)
})

When('they cancel and reprocess', async ({ page }) => {
  await page.getByRole('button', { name: 'Cancel and reprocess' }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByLabel('Reason').fill(CANCEL_REASON)
  await dialog.getByRole('button', { name: 'Yes, cancel the import' }).click()
})

Then('they see the unmatched rows by reason of {string}', async ({ page }, sample: string) => {
  const { rows } = expectedOf(sample)
  if (!rows.unmatchedByReason) throw new Error(`The oracle of ${sample} has no unmatchedByReason.`)
  const expected = Object.entries(REASONS)
    .map(([reason, label]) => [label, rows.unmatchedByReason![reason as keyof typeof REASONS]] as const)
    .filter(([, count]) => count > 0)
  await expect(cardNumber(page, 'Unmatched')).toHaveText(String(rows.unmatched))
  const items = page
    .getByRole('region', { name: 'Unmatched', exact: true })
    .getByRole('list', { name: 'Unmatched by reason' })
    .getByRole('listitem')
  await expect(items).toHaveCount(expected.length)
  for (const [i, [label, count]] of expected.entries()) {
    await expect(items.nth(i)).toHaveText(new RegExp(`^${label}\\s*${count}$`))
  }
})

Then('they see the wrong account notice of {string}', async ({ page }, sample: string) => {
  requireFlag(sample, expectedOf(sample), 'likelyWrongAccount')
  await expect(page.getByRole('region', { name: 'Wrong account?' })).toHaveText(WRONG_ACCOUNT)
})

Then('the decision of {string} asks to confirm a batch with batch fees only', async ({ page }, sample: string) => {
  requireFlag(sample, expectedOf(sample), 'requiresEmptyBatchConfirmation')
  await expect(page.getByText(NO_MATCHED_ROWS, { exact: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Continue with batch fees only' })).not.toBeChecked()
})

When('they start a new import', async ({ page }) => {
  await page.getByRole('link', { name: 'Start a new import' }).click()
})

Then('New Reconciliation has {string} chosen', async ({ page }, account: string) => {
  await expect(page).toHaveURL(/\/reconciliations\/new/)
  await expect(page.getByLabel('Account').locator('option:checked')).toHaveText(account)
})
