import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { importRecord, importRequests, seedImport } from '@/test/msw/imports'
import { holdNextValidation, respondNext, seedValidationRun, validationRequests } from '@/test/msw/validations'
import { renderApp } from '@/test/render'

async function openAnalysis(importId: string) {
  const view = renderApp(`/imports/${importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('region', { name: 'Validations' })
  return view
}

const section = () => within(screen.getByRole('region', { name: 'Validations' }))

describe('Analysis & Validations: no double run and reload on conflict (spec "corrida sin doble envío")', () => {
  it('a double click sends one POST and the button stays disabled until the answer', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const hold = holdNextValidation('run')
    const { user } = await openAnalysis(importId)
    const button = section().getByRole('button', { name: 'Run validations' })

    await user.dblClick(button)
    await hold.arrived

    expect(validationRequests('run')).toHaveLength(1)
    expect(button).toBeDisabled()
    expect(section().getByText('Running the validations…')).toBeInTheDocument()
    hold.release()
    expect(await section().findByRole('button', { name: 'Run again' })).toBeEnabled()
    expect(validationRequests('run')).toHaveLength(1)
  })

  it('two clicks in the same tick, before React re-renders, still send a single POST', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const hold = holdNextValidation('run')
    await openAnalysis(importId)
    const button = section().getByRole('button', { name: 'Run validations' })

    // Inside one act the button cannot be disabled between the clicks: only the synchronous guard stops the second.
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await hold.arrived
    hold.release()

    expect(await section().findByRole('button', { name: 'Run again' })).toBeEnabled()
    expect(validationRequests('run')).toHaveLength(1)
  })

  it('409 import_changed says so, reads the run and the import again and lets run again', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    const { user } = await openAnalysis(importId)
    await waitFor(() => expect(importRequests('detail').length).toBeGreaterThan(0))
    const gets = validationRequests('get').length
    const details = importRequests('detail').length
    respondNext('run', { status: 409, code: 'import_changed', details: { status: 'analyzed' } })

    await user.click(section().getByRole('button', { name: 'Run validations' }))

    expect(
      await section().findByText('The import changed while the validations ran. The results were reloaded.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(validationRequests('get').length).toBeGreaterThan(gets))
    await waitFor(() => expect(importRequests('detail').length).toBeGreaterThan(details))
    expect(section().getByRole('button', { name: 'Run validations' })).toBeEnabled()
  })

  it('409 import_not_analyzed on a cancelled import says so and no longer offers to run', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)
    importRecord(importId).status = 'cancelled'

    await user.click(section().getByRole('button', { name: 'Run again' }))

    expect(await section().findByText('The validations cannot run on a cancelled import.')).toBeInTheDocument()
    await waitFor(() => expect(section().queryByRole('button', { name: 'Run again' })).not.toBeInTheDocument())
  })
})

describe('Analysis & Validations: warning before running again (spec "aviso antes de volver a ejecutar")', () => {
  it('says how many manual changes are lost and runs only after confirming', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId, undefined, { manualChangeCount: 2 })
    const { user } = await openAnalysis(importId)

    await user.click(section().getByRole('button', { name: 'Run again' }))
    const dialog = within(await screen.findByRole('alertdialog'))

    expect(
      dialog.getByText('Running the validations again discards 2 manual changes (inclusions and resolutions).'),
    ).toBeInTheDocument()
    expect(validationRequests('run')).toHaveLength(0)
    await user.click(dialog.getByRole('button', { name: 'Run again' }))
    await waitFor(() => expect(validationRequests('run')).toHaveLength(1))
  })

  it('on a validated import says that the review will be invalidated', async () => {
    const { importId } = seedImport('batch-issues', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const { user } = await openAnalysis(importId)

    await user.click(section().getByRole('button', { name: 'Run again' }))
    const dialog = within(await screen.findByRole('alertdialog'))

    expect(
      dialog.getByText('The current review will be invalidated and the import returns to analyzed.'),
    ).toBeInTheDocument()
    expect(dialog.queryByText(/manual changes/)).not.toBeInTheDocument()
  })

  it('closing the dialog does not run', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId, undefined, { manualChangeCount: 1 })
    const { user } = await openAnalysis(importId)

    await user.click(section().getByRole('button', { name: 'Run again' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    expect(validationRequests('run')).toHaveLength(0)
  })

  it('with nothing to lose runs without a dialog', async () => {
    const { importId } = seedImport('batch-issues', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user } = await openAnalysis(importId)

    await user.click(section().getByRole('button', { name: 'Run again' }))

    await waitFor(() => expect(validationRequests('run')).toHaveLength(1))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
