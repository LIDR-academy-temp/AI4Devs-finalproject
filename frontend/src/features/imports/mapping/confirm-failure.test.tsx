import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { importRequests, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

// The body of the PUT fails to build before any request: an error that is not an ApiError.
vi.mock('./mapping-form', async (original) => ({
  ...(await original<typeof import('./mapping-form')>()),
  toMappingConfirmation: () => {
    throw new Error('Sheet "APP" has no type')
  },
}))

describe('Column Mapping: a confirmation that fails outside the API', () => {
  it('says the mapping could not be confirmed and sends no PUT', async () => {
    const { user } = renderApp(`/imports/${seedImport('batch-clean').importId}?step=mapping`, { as: 'analyst' })
    await screen.findByRole('status', { name: strings.readiness.label })

    await user.click(screen.getByRole('button', { name: strings.mapping.confirm }))

    expect(await screen.findByText(strings.mapping.confirmFailed)).toBeInTheDocument()
    expect(importRequests('mapping')).toHaveLength(0)
  })
})
