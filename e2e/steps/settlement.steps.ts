// Steps of Settlement Review and Settlement Summary (HU3), and the check of a freshly seeded database (design D2).
// Selectors are roles and accessible texts, the same as frontend/src/features/settlements/strings.ts.
import { readFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'
import { apiSession } from '../support/api.ts'
import { createdBy } from '../support/cleanup.ts'
import { expectedOf, formatAmount, sameDecimal } from '../support/expected.ts'
import { Given, Then, When } from './fixtures.ts'

const CHANNELS_CONFIRM = 'Assign these channels to this account as primary'
const UNPAY_REASON = 'E2E: payment rejected by the bank'
const UNDO_REASON = 'E2E: wrong settlement date'

/** The value of a term of the header of the Settlement Summary (Status, Batch, Paid by…). */
const headerValue = (page: Page, term: string) =>
  page
    .getByRole('region', { name: /^Settlement Summary · batch / })
    .locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${term}$`) }) })
    .locator('dd')

/** The amount payable row of the payable table: on Settlement Review it is the one of the pre-summary. */
const amountPayable = (page: Page) =>
  page.getByRole('table', { name: 'Amount payable' }).getByRole('row').last().getByRole('cell').nth(2)

const numberOf = (text: string | null) => {
  const match = /^Process batch (\d+)$/.exec(text?.trim() ?? '')
  if (!match) throw new Error(`Not a Process button: ${text}`)
  return Number(match[1])
}

// Design D2: RAM-07 still without account and the next number of ProviderA-USD the one of the oracle. Read through the
// API before uploading anything, so a database that is not fresh fails here and says how to fix it.
// biome-ignore lint/correctness/noEmptyPattern: a step without fixtures takes an empty destructured object
Given('the database is freshly seeded for {string}', async ({}, sample: string) => {
  const expected = expectedOf(sample)
  const api = apiSession()
  const fresh = 'Run pnpm db:seed first: the suite needs a freshly seeded database (design D2).'
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
})

Then('they see the new channels of {string} in the channel notice', async ({ page }, sample: string) => {
  const notice = page.getByRole('region', { name: 'Channels to review' })
  for (const channel of expectedOf(sample).warnings?.newChannels ?? []) {
    await expect(notice.getByRole('listitem').filter({ hasText: channel })).toContainText('is not assigned yet')
  }
})

When('they continue to settlement review', async ({ page }) => {
  await page.getByRole('button', { name: 'Continue to settlement review' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('validated', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Settlement Review' }).click()
  await expect(page.getByRole('button', { name: /^Process batch \d+$/ })).toBeVisible()
})

// An input of the analyst, not a figure of the sample: empty on opening, and without it there is no pre-summary nor
// Process (spec "Pantalla Settlement Review: fecha de liquidación").
When('they choose the settlement date {string}', async ({ page }, date: string) => {
  await page.getByLabel('Settlement date').fill(date)
  await expect(page.getByRole('table', { name: 'Amount payable' })).toBeVisible({ timeout: 30_000 })
})

Then('Settlement Review proposes the batch number of {string}', async ({ page }, sample: string) => {
  const batchNo = expectedOf(sample).proposedBatchNo
  await expect(page.getByText(`Proposed: ${batchNo} · attempt 1`, { exact: true })).toBeVisible()
  await expect(page.getByLabel('Batch number')).toHaveValue(String(batchNo))
})

Then('the batch fees are the prefilled fees of {string}', async ({ page }, sample: string) => {
  const fees = expectedOf(sample).batchFeesPrefilled ?? []
  const list = page.getByRole('list', { name: 'Batch fees' }).getByRole('listitem')
  await expect(list).toHaveCount(fees.length)
  // Money as decimal text, never as a JS number: the input holds the decimal string of the API.
  for (const fee of fees) {
    const value = await page.getByLabel(`Amount — ${fee.feeType}`).inputValue()
    expect(sameDecimal(value, String(fee.amount)), `amount of ${fee.feeType}: ${value} for ${fee.amount}`).toBe(true)
  }
})

Then('the pre-summary shows the amount payable of {string}', async ({ page }, sample: string) => {
  await expect(amountPayable(page)).toHaveText(formatAmount(expectedOf(sample).summary!.amountPayable))
})

Then('the channels to assign are the new channels of {string}', async ({ page }, sample: string) => {
  const channels = expectedOf(sample).warnings?.newChannels ?? []
  const section = page.getByRole('region', { name: 'Channels to assign' })
  await expect(section.getByRole('listitem')).toHaveCount(channels.length)
  for (const channel of channels) await expect(section).toContainText(`${channel} · not assigned yet`)
})

When('they accept the channel assignment', async ({ page }) => {
  await page.getByRole('checkbox', { name: CHANNELS_CONFIRM }).check()
})

// The only conditional step of the suite (design D2): run alone on a fresh database, the undo scenario is asked to
// assign RAM-07; after the happy path it is not. It checks nothing about the channels: the happy path does.
When('they process the batch, accepting any channel assignment it asks for', async ({ page, created, story }) => {
  const confirm = page.getByRole('checkbox', { name: CHANNELS_CONFIRM })
  if (await confirm.isVisible()) await confirm.check()
  await processBatch(page, created.batchIds, story)
})

When('they process the batch', async ({ page, created, story }) => processBatch(page, created.batchIds, story))

// The batchId comes from the answer of the POST that processes (createdBy), as the importId of the upload: if the
// summary then fails to open, the After still undoes the attempt.
async function processBatch(page: Page, batchIds: string[], story: { batchNo?: number; batchId?: string }) {
  const button = page.getByRole('button', { name: /^Process batch \d+$/ })
  await expect(button).toBeEnabled()
  story.batchNo = numberOf(await button.textContent())
  const processed = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && /\/api\/v1\/imports\/[^/]+\/settlements$/.test(response.url()),
    { timeout: 60_000 },
  )
  await button.click()
  const response = await processed
  const made = createdBy('POST', response.url(), response.status(), response.ok() ? await response.json() : {})
  if (!made || !('batchId' in made)) throw new Error(`Processing answered ${response.status()}, no attempt created.`)
  story.batchId = made.batchId
  batchIds.push(made.batchId)
  await expect(page).toHaveURL(new RegExp(`/settlements/${made.batchId}`), { timeout: 60_000 })
}

// HU3 CA5 through the API: once processed, the new channels of the sample have their primary account.
// biome-ignore lint/correctness/noEmptyPattern: a step without fixtures takes an empty destructured object
Then('the new channels of {string} are no longer unassigned', async ({}, sample: string) => {
  const channels = expectedOf(sample).warnings?.newChannels ?? []
  if (channels.length === 0) throw new Error(`The oracle of ${sample} has no new channels.`)
  const unassigned = await apiSession().get<{ name: string }[]>('analyst', '/channels?unassigned=true')
  for (const channel of channels) {
    expect(
      unassigned.map((c) => c.name),
      `${channel} among the unassigned channels`,
    ).not.toContain(channel)
  }
})

Then('the settlement is {string}', async ({ page }, status: string) => {
  await expect(headerValue(page, 'Status')).toHaveText(status)
})

Then('the settlement summary shows the amount payable of {string}', async ({ page }, sample: string) => {
  await expect(amountPayable(page)).toHaveText(formatAmount(expectedOf(sample).summary!.amountPayable))
})

// Design D5: the file named by its attempt, with the amount payable of the oracle; downloading changes nothing.
When(
  'they download the merchant summary of {string} with its amount payable',
  async ({ page, story }, sample: string) => {
    const expected = expectedOf(sample)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Merchant summary' }).click(),
    ])
    expect(download.suggestedFilename()).toBe(`${expected.account}_B${story.batchNo}_A1_summary.csv`)
    const lines = (await readFile(await download.path(), 'utf8')).split(/\r?\n/)
    const payable = lines.find((line) => line.startsWith('Amount payable,'))
    expect(payable, 'the Amount payable row of the summary').toBeDefined()
    expect(payable!.split(','), 'the Amount payable row of the summary').toContain(expected.summary!.amountPayable)
  },
)

Then('they cannot mark it as paid', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Undo batch…' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mark as paid' })).toHaveCount(0)
})

When('they open the settlement summary', async ({ page, story }) => {
  await page.goto(`/settlements/${story.batchId}`)
  await expect(headerValue(page, 'Status')).toBeVisible()
})

When('they mark it as paid', async ({ page }) => {
  await page.getByRole('button', { name: 'Mark as paid' }).click()
})

Then('it was paid by {string}', async ({ page }, user: string) => {
  await expect(headerValue(page, 'Paid by')).toContainText(user)
})

async function withReason(page: Page, action: string, reason: string) {
  await page.getByRole('button', { name: action }).click()
  const dialog = page.getByRole('alertdialog')
  await dialog.getByLabel('Reason').fill(reason)
  await dialog.getByRole('button', { name: 'Confirm' }).click()
  await expect(dialog).toHaveCount(0)
}

When('they unpay it with a reason', async ({ page }) => withReason(page, 'Unpay…', UNPAY_REASON))

When('they undo it with a reason', async ({ page }) => withReason(page, 'Undo batch…', UNDO_REASON))

When('they go to Analysis & Validations', async ({ page }) => {
  await page.getByRole('link', { name: 'Go to Analysis & Validations' }).click()
  await expect(page.getByRole('region', { name: 'Import' }).getByText('analyzed', { exact: true })).toBeVisible()
})

Then('Settlement Review proposes the same batch number as attempt 2', async ({ page, story }) => {
  await expect(
    page.getByText(`Proposed: ${story.batchNo} · attempt 2 (the previous attempt of this import was undone)`, {
      exact: true,
    }),
  ).toBeVisible()
})

Then('the settlement is attempt 2 of the same batch number', async ({ page, story }) => {
  await expect(headerValue(page, 'Batch')).toHaveText(`${story.batchNo} · attempt 2`)
})
