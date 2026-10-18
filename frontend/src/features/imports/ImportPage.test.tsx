import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as layoutStrings } from '@/app/layout/strings'
import { seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from './strings'

const tab = (name: string) => screen.getByRole('tab', { name })

async function openImport(importId: string, as: 'analyst' | 'viewer' = 'analyst') {
  const view = renderApp(`/imports/${importId}`, { as })
  await screen.findByRole('tablist')
  return view
}

describe('import workspace: resuming by link (spec "Retomar un import por su enlace")', () => {
  it.each([
    ['uploaded with files', () => seedImport('batch-clean'), strings.steps.mapping],
    ['uploaded without files', () => seedImport('batch-clean', { labels: [] }), strings.steps.files],
    ['mapped', () => seedImport('batch-clean', { status: 'mapped' }), strings.steps.mapping],
    ['analyzed', () => seedImport('batch-clean', { status: 'analyzed' }), strings.steps.analysis],
    ['cancelled after the analysis', () => seedImport('batch-clean', { status: 'cancelled' }), strings.steps.analysis],
  ])('opens an import %s on its step', async (_, seed, step) => {
    await openImport(seed().importId)

    expect(tab(step)).toHaveAttribute('aria-selected', 'true')
  })

  it('opens an import mapped on its step with the confirmed mapping (spec "Import pareado")', async () => {
    await openImport(seedImport('batch-clean', { status: 'mapped' }).importId)

    expect(tab(strings.steps.mapping)).toHaveAttribute('aria-selected', 'true')
    const app = within(await screen.findByRole('region', { name: 'APP' }))
    expect(app.getByText('Confirmed: E · Successful')).toBeInTheDocument()
  })

  it('shows merchant, provider, account and status in the header', async () => {
    await openImport(seedImport('batch-clean').importId)
    const header = within(screen.getByRole('region', { name: strings.header.label }))

    expect(await header.findByText('Merchant A › Provider A › ProviderA-USD')).toBeInTheDocument()
    expect(header.getByText('uploaded')).toBeInTheDocument()
  })

  it('disables the Analysis step before the analysis and moves between the earlier ones', async () => {
    const { user, router } = await openImport(seedImport('batch-clean').importId)

    expect(tab(strings.steps.analysis)).toBeDisabled()
    await user.click(tab(strings.steps.files))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ step: 'files' }))
    expect(tab(strings.steps.files)).toHaveAttribute('aria-selected', 'true')
  })

  it('places the import in the map: Dashboard › Reconciliation › Import', async () => {
    await openImport(seedImport('batch-clean').importId)
    const crumbs = within(screen.getByRole('navigation', { name: layoutStrings.breadcrumb }))

    expect(crumbs.getByText('Reconciliation')).toBeInTheDocument()
    expect(crumbs.getByText('Import')).toHaveAttribute('aria-current', 'page')
  })

  it('viewer opening an import of ProviderC-Alt sees it is not available and none of its data', async () => {
    const { importId } = seedImport('legacy-provider', { account: 'ProviderC-Alt' })
    renderApp(`/imports/${importId}`, { as: 'viewer' })

    expect(await screen.findByText('This import is not available.')).toBeInTheDocument()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText(/Legacy_ProviderC-Alt|ProviderC-Alt|Merchant B/)).not.toBeInTheDocument()
  })
})
