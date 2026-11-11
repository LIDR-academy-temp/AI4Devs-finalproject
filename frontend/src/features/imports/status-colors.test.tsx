import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from './strings'

// Spec web-shell "Colores de estado", scenario "Estados del import" (design D8). The text is the raw status.
async function headerOf(status: 'validated' | 'cancelled') {
  renderApp(`/imports/${seedImport('batch-clean', { status }).importId}?step=analysis`, { as: 'analyst' })
  await screen.findByRole('tablist')
  return within(screen.getByRole('region', { name: strings.header.label }))
}

describe('status colours of the import', () => {
  it('validated in green', async () => {
    expect((await headerOf('validated')).getByText('validated')).toHaveAttribute('data-variant', 'success')
  })

  it('cancelled in grey', async () => {
    expect((await headerOf('cancelled')).getByText('cancelled')).toHaveAttribute('data-variant', 'neutral')
  })
})
