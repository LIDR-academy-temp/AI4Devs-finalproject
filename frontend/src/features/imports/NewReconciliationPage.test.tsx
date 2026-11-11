import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS, ACCOUNTS } from '@/test/msw/fixtures'
import { db } from '@/test/msw/handlers'
import { recordRequests } from '@/test/msw/record'
import { renderApp } from '@/test/render'
import { strings } from './strings'

const UNKNOWN_ACCOUNT = '00000000-0000-4000-8000-00000000ffff'

function optionLabels(select: HTMLElement) {
  return within(select)
    .getAllByRole('option')
    .filter((o) => (o as HTMLOptionElement).value !== '')
    .map((o) => o.textContent)
}

const dropZone = () => screen.getByRole('button', { name: strings.upload.dropZone })

describe('Upload Files: choosing the account (spec "Pantalla Upload Files: elección de la cuenta")', () => {
  it('analyst chooses Merchant A, Provider A and ProviderA-USD; the address reflects the three', async () => {
    const { user, router } = renderApp('/reconciliations/new', { as: 'analyst' })

    await screen.findByRole('option', { name: 'Merchant A' })
    await user.selectOptions(screen.getByLabelText(strings.picker.merchant), 'Merchant A')
    await screen.findByRole('option', { name: 'Provider A' })
    await user.selectOptions(screen.getByLabelText(strings.picker.provider), 'Provider A')
    await screen.findByRole('option', { name: 'ProviderA-USD' })
    await user.selectOptions(screen.getByLabelText(strings.picker.account), 'ProviderA-USD')

    await waitFor(() =>
      expect(router.state.location.search).toEqual({
        merchantId: 1,
        providerId: 101,
        accountId: ACCOUNT_IDS['ProviderA-USD'],
      }),
    )
    expect(dropZone()).toBeEnabled()
  })

  it('preselects the only possible provider and account', async () => {
    const { router } = renderApp('/reconciliations/new?merchantId=1&providerId=102', { as: 'analyst' })

    await waitFor(() =>
      expect(screen.getByLabelText(strings.picker.account)).toHaveValue(ACCOUNT_IDS['ProviderB-Main']),
    )
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ accountId: ACCOUNT_IDS['ProviderB-Main'] }),
    )
  })

  it('preselects the only provider of the chosen merchant', async () => {
    const { router } = renderApp('/reconciliations/new?merchantId=2', { as: 'admin' })

    await waitFor(() => expect(router.state.location.search).toMatchObject({ merchantId: 2, providerId: 201 }))
  })

  it('offers only active accounts', async () => {
    db.accounts.push({
      ...ACCOUNTS[0]!,
      accountId: '0b6f4c1e-1a2b-4c3d-8e4f-000000000009',
      name: 'ProviderA-Old',
      isActive: false,
    })
    renderApp('/reconciliations/new?merchantId=1&providerId=101', { as: 'analyst' })

    const account = await screen.findByLabelText(strings.picker.account)
    await waitFor(() => expect(optionLabels(account)).toEqual(['ProviderA-EUR', 'ProviderA-USD']))
  })

  it('without an account the drop zone is disabled, says so, and no import route is called', async () => {
    const rec = recordRequests()
    renderApp('/reconciliations/new?merchantId=1&providerId=101', { as: 'analyst' })

    await screen.findByRole('option', { name: 'ProviderA-USD' })
    expect(dropZone()).toBeDisabled()
    expect(screen.getByText(strings.upload.chooseAccount)).toBeInTheDocument()
    expect(rec.calls.filter((c) => c.includes('/imports'))).toEqual([])
  })

  it('says an account outside the scope is not available and lets the user choose among visible merchants', async () => {
    renderApp(`/reconciliations/new?accountId=${UNKNOWN_ACCOUNT}`, { as: 'analyst' })

    expect(await screen.findByText('This merchant, provider or account is not available.')).toBeInTheDocument()
    expect(optionLabels(screen.getByLabelText(strings.picker.merchant))).toEqual(['Merchant A', 'Merchant B'])
  })

  it('viewer sees no access and the screen calls none of its endpoints', async () => {
    const rec = recordRequests()
    renderApp('/reconciliations/new', { as: 'viewer' })

    expect(await screen.findByRole('heading', { name: "You don't have access to this page" })).toBeInTheDocument()
    expect(rec.protectedCalls()).toEqual([])
    expect(rec.calls.filter((c) => /merchants|providers|accounts|imports/.test(c))).toEqual([])
  })
})
