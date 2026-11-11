// Helpers of the Settlement Review and Summary tests: where to start, how to fill the form and where to look.
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { expect } from 'vitest'
import type { UserName } from './msw/fixtures'
import type { SampleKey } from './msw/import-fixtures'
import { seedImport } from './msw/imports'
import { type PreviewFixture, seedSettlementPreview, settlementRequests } from './msw/settlements'
import { seedValidationRun } from './msw/validations'
import { renderApp } from './render'
import { OPENING } from './validation-screens'

/** The debounce of the preview (design D6) plus a margin: after this wait a change has had its chance to be sent. */
export const AFTER_DEBOUNCE = 600

/** An import of a sample validated on a reviewed run, optionally with its own preview fixture. */
export function validatedImport(sample: SampleKey = 'batch-clean', fixture?: PreviewFixture) {
  const { importId, accountId } = seedImport(sample, { status: 'validated' })
  const { runId } = seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
  if (fixture) seedSettlementPreview(importId, fixture)
  return { importId, accountId, runId }
}

/** Opens Settlement Review of an import and waits for its form. */
export async function openReview(importId: string, as: UserName = 'analyst') {
  const view = renderApp(`/imports/${importId}/settlement-review`, { as })
  await screen.findByRole('textbox', { name: 'Batch number' }, OPENING)
  return view
}

export const batchNoField = () => screen.getByRole('textbox', { name: 'Batch number' }) as HTMLInputElement
export const dateField = () => screen.getByLabelText('Settlement date') as HTMLInputElement
export const preSummary = () => within(screen.getByRole('region', { name: 'Pre-summary' }))
export const processButton = () => screen.getByRole('button', { name: /^Process batch/ })

/** Chooses (or clears, with '') the settlement date, as the date picker does. */
export function chooseDate(value: string) {
  fireEvent.change(dateField(), { target: { value } })
}

/** Waits until a preview answered and the pre-summary is up to date with the form. */
export async function previewShown() {
  await waitFor(() => expect(preSummary().getByRole('table', { name: 'Amount payable' })).toBeInTheDocument(), {
    timeout: 3000,
  })
  await waitFor(() => expect(preSummary().queryByText('Updating the pre-summary…')).not.toBeInTheDocument(), {
    timeout: 3000,
  })
}

/** The bodies of the previews sent so far. */
export const previewBodies = () => settlementRequests('preview').map((r) => r.body)

/** The cell texts of a row of the payable breakdown, by its label. */
export function payableRow(label: string): string[] {
  const table = preSummary().getByRole('table', { name: 'Amount payable' })
  const row = within(table)
    .getAllByRole('row')
    .find((r) => within(r).queryByText(label, { exact: true }))
  if (!row) throw new Error(`no payable line ${label}`)
  return within(row)
    .getAllByRole('cell')
    .map((c) => c.textContent ?? '')
}
