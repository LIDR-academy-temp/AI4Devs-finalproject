import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seedImport } from '@/test/msw/imports'
import { recordRequests } from '@/test/msw/record'
import { seedSettlement, settlementRequests } from '@/test/msw/settlements'
import { seedValidationRun } from '@/test/msw/validations'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

const reviewPath = (importId: string) => `/imports/${importId}/settlement-review`

describe('Settlement Review: access and status of the import (spec "acceso y estado del import")', () => {
  it('viewer by direct link: no access, and none of the endpoints of the screen is called', async () => {
    const { importId } = seedImport('batch-clean', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const requests = recordRequests()
    renderApp(reviewPath(importId), { as: 'viewer' })

    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }, OPENING),
    ).toBeInTheDocument()
    expect(settlementRequests()).toHaveLength(0)
    expect(requests.protectedCalls().filter((c) => /settlements|batch-number|fee-types|\/fees/.test(c))).toEqual([])
  })

  it('analyzed: says why, links to the Analysis step, and there is no form nor preview', async () => {
    const { importId } = seedImport('batch-clean', { status: 'analyzed' })
    seedValidationRun(importId)
    const { user, router } = renderApp(reviewPath(importId), { as: 'analyst' })

    expect(
      await screen.findByText('This import is not validated. Review its validations before processing.', {}, OPENING),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Batch number' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Process/ })).not.toBeInTheDocument()
    expect(settlementRequests('preview')).toHaveLength(0)

    await user.click(screen.getByRole('link', { name: 'Go to the Analysis step' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/imports/${importId}`))
    expect(router.state.location.search).toMatchObject({ step: 'analysis' })
  })

  it('already processed: links to the Settlement Summary of its attempt', async () => {
    const { importId } = seedImport('batch-clean', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const { batchId } = seedSettlement(importId, { batchNo: 123 })
    const { user, router } = renderApp(reviewPath(importId), { as: 'analyst' })

    expect(await screen.findByText('This import is already processed.', {}, OPENING)).toBeInTheDocument()
    expect(settlementRequests('preview')).toHaveLength(0)

    await user.click(screen.getByRole('link', { name: 'View settlement summary' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(`/settlements/${batchId}`))
    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' })).toBeInTheDocument()
  })

  it('cancelled: says so, without a form', async () => {
    const { importId } = seedImport('batch-clean', { status: 'cancelled' })
    seedValidationRun(importId)
    renderApp(reviewPath(importId), { as: 'analyst' })

    expect(await screen.findByText('This import is cancelled.', {}, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Process/ })).not.toBeInTheDocument()
  })

  it('shows where Settlement Review sits in the map', async () => {
    const { importId } = seedImport('batch-clean', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    renderApp(reviewPath(importId), { as: 'analyst' })

    const crumbs = within(await screen.findByRole('navigation', { name: 'Breadcrumb' }, OPENING))
    expect(crumbs.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(crumbs.getByText('Reconciliation')).toBeInTheDocument()
    expect(crumbs.getByText('Settlement Review')).toHaveAttribute('aria-current', 'page')
    expect(await screen.findByRole('heading', { name: 'Settlement Review' })).toBeInTheDocument()
  })
})

describe('Settlement Summary: the page of an attempt', () => {
  it('shows where it sits in the map and its title', async () => {
    const { importId } = seedImport('batch-clean', { status: 'validated' })
    seedValidationRun(importId, undefined, { reviewedBy: 'analyst' })
    const { batchId } = seedSettlement(importId, { batchNo: 123 })
    renderApp(`/settlements/${batchId}`, { as: 'viewer' })

    expect(await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)).toBeInTheDocument()
    const crumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }))
    expect(crumbs.getByText('Settlement Summary')).toHaveAttribute('aria-current', 'page')
  })

  it('an unknown attempt: Settlement not found with a link to Dashboard', async () => {
    renderApp('/settlements/5c3f9e21-0000-4000-8000-000000000999', { as: 'analyst' })

    expect(await screen.findByRole('heading', { name: 'Settlement not found' }, OPENING)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/')
  })
})
