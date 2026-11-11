import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from './strings'

const tab = (name: string) => screen.getByRole('tab', { name })

describe('import read-only (spec "Import en solo lectura")', () => {
  it('viewer sees the analysis of batch-clean and none of the actions', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    const { user } = renderApp(`/imports/${importId}`, { as: 'viewer' })

    expect(await screen.findByRole('region', { name: strings.analysis.counters.read })).toHaveTextContent('783')
    expect(screen.getByRole('region', { name: strings.analysis.channels.title })).toHaveTextContent('RAM-07')
    expect(await screen.findByRole('table', { name: strings.analysis.rows.title })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.cancel.button })).not.toBeInTheDocument()

    await user.click(tab(strings.steps.files))
    expect(screen.queryByRole('button', { name: strings.upload.dropZone })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()

    await user.click(tab(strings.steps.mapping))
    const app = within(await screen.findByRole('region', { name: 'APP' }))
    expect(app.getByRole('combobox', { name: strings.mapping.kind })).toBeDisabled()
    expect(app.getByRole('combobox', { name: strings.mapping.fieldFor('ID') })).toBeDisabled()
    expect(screen.queryByRole('button', { name: strings.mapping.confirm })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.analyze.button })).not.toBeInTheDocument()
  })

  it('viewer cannot edit an import that is still uploaded either', async () => {
    const { importId } = seedImport('batch-clean')
    const { user } = renderApp(`/imports/${importId}`, { as: 'viewer' })

    const app = within(await screen.findByRole('region', { name: 'APP' }))
    expect(app.getByRole('combobox', { name: strings.mapping.cycle })).toBeDisabled()
    expect(screen.queryByRole('button', { name: strings.mapping.confirm })).not.toBeInTheDocument()
    await user.click(tab(strings.steps.files))
    expect(screen.queryByRole('button', { name: strings.upload.dropZone })).not.toBeInTheDocument()
  })

  it('analyst opening Files of an analyzed import is told files cannot change', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    renderApp(`/imports/${importId}?step=files`, { as: 'analyst' })

    expect(
      await screen.findByText('Files cannot change after the analysis. Cancel the import and start a new one.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: strings.upload.dropZone })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()
  })
})
