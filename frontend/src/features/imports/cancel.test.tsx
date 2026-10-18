import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { holdNext, importRecord, importRequests, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from './strings'

const s = strings.cancel

async function openImport(importId: string, step = 'analysis') {
  const view = renderApp(`/imports/${importId}?step=${step}`, { as: 'analyst' })
  await screen.findByRole('tablist')
  return view
}

const header = () => within(screen.getByRole('region', { name: strings.header.label }))
const cancelButton = () => screen.queryByRole('button', { name: s.button })

describe('cancelling the import (spec "Cancelación del import desde la pantalla")', () => {
  it('cancels an analyzed import after confirming, keeps its result and offers a new import in the account', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { user, router } = await openImport(importId)

    await user.click(cancelButton()!)
    const dialog = within(await screen.findByRole('alertdialog'))
    await user.click(dialog.getByRole('button', { name: s.confirm }))

    expect(await header().findByText('cancelled')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: strings.analysis.counters.read })).toHaveTextContent('783')
    expect(await screen.findByRole('table', { name: strings.analysis.rows.title })).toBeInTheDocument()
    expect(cancelButton()).not.toBeInTheDocument()
    expect(importRequests('cancel')).toHaveLength(1)

    await user.click(screen.getByRole('tab', { name: strings.steps.files }))
    expect(screen.queryByRole('button', { name: strings.upload.dropZone })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))
    expect(screen.queryByRole('button', { name: strings.mapping.confirm })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: s.startNew }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/reconciliations/new'))
    await waitFor(() => expect(screen.getByLabelText(strings.picker.account)).toHaveValue(ACCOUNT_IDS['ProviderA-USD']))
  })

  it('closing the dialog, with its button or with Escape, does not cancel', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { user } = await openImport(importId)

    await user.click(cancelButton()!)
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: s.keep }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    await user.click(cancelButton()!)
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    expect(importRequests('cancel')).toHaveLength(0)
    expect(header().getByText('analyzed')).toBeInTheDocument()
  })

  it('an import no longer cancellable says so and reloads', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { user } = await openImport(importId)
    importRecord(importId).status = 'processed'

    await user.click(cancelButton()!)
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: s.confirm }))

    expect(await screen.findByText('This import can no longer be cancelled (processed).')).toBeInTheDocument()
    expect(await header().findByText('processed')).toBeInTheDocument()
  })

  it('is not offered on a processed import', async () => {
    await openImport(seedImport('batch-clean', { status: 'processed' }).importId)
    expect(cancelButton()).not.toBeInTheDocument()
  })

  it('is not offered on a cancelled import', async () => {
    await openImport(seedImport('batch-clean', { status: 'cancelled' }).importId)
    expect(cancelButton()).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: s.startNew })).toBeInTheDocument()
  })

  it('is disabled while the analysis runs (spec "Pantalla Column Mapping: análisis en curso")', async () => {
    const hold = holdNext('analyze')
    const { importId } = seedImport('batch-clean', { status: 'mapped' })
    const { user } = await openImport(importId, 'mapping')

    await user.click(screen.getByRole('button', { name: strings.analyze.button }))
    await hold.arrived

    expect(cancelButton()).toBeDisabled()
    hold.release()
    await waitFor(() => expect(cancelButton()).toBeEnabled())
  })
})
