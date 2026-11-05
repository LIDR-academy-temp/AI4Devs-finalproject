import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ACCOUNT_IDS, type UserName } from '@/test/msw/fixtures'
import { importRecord, importRequests, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'
import { strings } from '../strings'

// Spec import "Pantalla In Progress: lista", "filtros" and "retomar y cancelar" (import-in-progress design D5, D6).
// The fake filters, orders and pages; the screen is checked on what it asks and shows.
const s = strings.inProgress
const PART1 = { labels: ['batch-split_part1'] }

async function openInProgress(search = '', as: UserName = 'analyst') {
  const rendered = renderApp(`/reconciliations/in-progress${search ? `?${search}` : ''}`, { as })
  await screen.findByRole('heading', { name: s.title, level: 1 }, OPENING)
  return rendered
}

const table = () => screen.getByRole('table', { name: s.tableLabel })
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const rowOf = (importId: string) => {
  const row = bodyRows().find(
    (r) => within(r).queryByRole('link', { name: s.resume })?.getAttribute('href') === `/imports/${importId}`,
  )
  if (!row) throw new Error(`no row for ${importId}`)
  return row
}

/** The query of the last request of the list, as the screen sent it. */
function lastQuery(): Record<string, string> {
  const url = importRequests('list').at(-1)!.url
  return Object.fromEntries(new URL(url, window.location.origin).searchParams)
}

describe('In Progress: the list (spec "Pantalla In Progress: lista")', () => {
  it('shows each open import with its account, hierarchy, files, rows, status, who started it and its dates', async () => {
    const uploaded = seedImport('batch-split', PART1)
    const analyzed = seedImport('batch-split', { status: 'analyzed' })

    await openInProgress()
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)

    expect(
      within(table())
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual([
      s.columns.account,
      s.columns.files,
      s.columns.rows,
      s.columns.status,
      s.columns.startedBy,
      s.columns.created,
      s.columns.updated,
      s.columns.actions,
    ])
    const first = within(rowOf(uploaded.importId))
    expect(first.getByText('ProviderA-USD')).toBeInTheDocument()
    expect(first.getByText('Merchant A › Provider A')).toBeInTheDocument()
    expect(first.getByText('uploaded')).toBeInTheDocument()
    expect(first.getByText('analyst')).toBeInTheDocument()
    const cells = within(rowOf(uploaded.importId))
      .getAllByRole('cell')
      .map((c) => c.textContent)
    expect(cells[1]).toBe('1')
    expect(cells[2]).toBe('—')
    expect(within(rowOf(analyzed.importId)).getAllByRole('cell')[2]).toHaveTextContent('783')
    // Latest update first, the order of the API.
    expect(bodyRows().indexOf(rowOf(analyzed.importId))).toBeLessThan(bodyRows().indexOf(rowOf(uploaded.importId)))
    expect(lastQuery()).toEqual({ page: '1', pageSize: '50' })
  })

  it('says there is nothing in progress and links to New Reconciliation', async () => {
    const { user, router } = await openInProgress()

    expect(await screen.findByText(s.empty, undefined, OPENING)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: s.startNew }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/reconciliations/new'))
  })

  it('pages on the server: Next asks for page 2', async () => {
    for (let i = 0; i < 51; i++) seedImport('batch-split', PART1)
    const { user, router } = await openInProgress()
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)

    expect(screen.getByText('Page 1 of 2 · 51 imports')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))

    await waitFor(() => expect(router.state.location.search).toMatchObject({ page: 2 }))
    expect(await screen.findByText('Page 2 of 2 · 51 imports')).toBeInTheDocument()
    expect(lastQuery()).toMatchObject({ page: '2', pageSize: '50' })
  })

  it('is a page of settlement.process: viewer does not get it', async () => {
    renderApp('/reconciliations/in-progress', { as: 'viewer' })

    expect(await screen.findByText("You don't have access to this page", undefined, OPENING)).toBeInTheDocument()
    expect(importRequests('list')).toHaveLength(0)
  })
})

describe('In Progress: filters in the address (spec "Pantalla In Progress: filtros")', () => {
  it('a status and Only mine go to the address, back to page 1, and survive a reload', async () => {
    for (let i = 0; i < 51; i++) seedImport('batch-split', PART1)
    const { user, router } = await openInProgress('page=2')
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)

    await user.selectOptions(screen.getByLabelText(s.filters.status), 'mapped')
    await user.click(screen.getByRole('checkbox', { name: s.filters.mine }))

    await waitFor(() => expect(router.state.location.search).toEqual({ status: 'mapped', mine: true }))
    await waitFor(() => expect(lastQuery()).toEqual({ status: 'mapped', mine: 'true', page: '1', pageSize: '50' }))

    await openInProgress('status=mapped&mine=true')
    expect(screen.getAllByLabelText(s.filters.status).at(-1)).toHaveValue('mapped')
    expect(screen.getAllByRole('checkbox', { name: s.filters.mine }).at(-1)).toBeChecked()
  })

  it('the provider follows the merchant and the account follows the provider', async () => {
    seedImport('legacy-provider')
    const { user } = await openInProgress()
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)

    await user.selectOptions(screen.getByLabelText(s.filters.merchant), 'Merchant B')
    const provider = screen.getByLabelText(s.filters.provider)
    await waitFor(() =>
      expect(
        within(provider)
          .getAllByRole('option')
          .map((o) => o.textContent),
      ).toEqual([s.filters.allProviders, 'Provider C']),
    )
    await user.selectOptions(provider, 'Provider C')
    const account = screen.getByLabelText(s.filters.account)
    await waitFor(() => expect(within(account).getByRole('option', { name: 'ProviderC-Alt' })).toBeInTheDocument())
    await user.selectOptions(account, 'ProviderC-Alt')

    await waitFor(() =>
      expect(lastQuery()).toEqual({
        merchantId: '2',
        providerId: '201',
        accountId: ACCOUNT_IDS['ProviderC-Alt'],
        page: '1',
        pageSize: '50',
      }),
    )
  })

  it('a merchant outside the scope is not available and nothing is asked', async () => {
    await openInProgress('merchantId=999')

    expect(await screen.findByText(s.notAvailable, undefined, OPENING)).toBeInTheDocument()
    expect(importRequests('list')).toHaveLength(0)
  })
})

describe('In Progress: resume and cancel (spec "Pantalla In Progress: retomar y cancelar")', () => {
  it('Resume opens the import in the step of its status', async () => {
    const mapped = seedImport('batch-split', { ...PART1, status: 'mapped' })
    const { user, router } = await openInProgress()
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)

    await user.click(within(rowOf(mapped.importId)).getByRole('link', { name: s.resume }))

    await waitFor(() => expect(router.state.location.pathname).toBe(`/imports/${mapped.importId}`))
    expect(await screen.findByRole('tab', { name: strings.steps.mapping, selected: true }, OPENING)).toBeInTheDocument()
  })

  it('Cancel asks for the reason, sends it and the import leaves the list', async () => {
    const uploaded = seedImport('batch-split', PART1)
    const { user } = await openInProgress()
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)

    await user.click(within(rowOf(uploaded.importId)).getByRole('button', { name: s.cancel }))
    const dialog = within(await screen.findByRole('alertdialog'))
    await user.type(dialog.getByLabelText(strings.cancel.reason), 'Duplicate upload')
    await user.click(dialog.getByRole('button', { name: strings.cancel.confirm }))

    expect(await screen.findByText(s.empty, undefined, OPENING)).toBeInTheDocument()
    expect(importRequests('cancel')[0]?.body).toEqual({ reason: 'Duplicate upload' })
    expect(importRecord(uploaded.importId).status).toBe('cancelled')
  })

  it('an import cancelled by someone else says so and the list is asked again', async () => {
    const uploaded = seedImport('batch-split', PART1)
    const { user } = await openInProgress()
    await screen.findByRole('table', { name: s.tableLabel }, OPENING)
    importRecord(uploaded.importId).status = 'cancelled'
    const before = importRequests('list').length

    await user.click(within(rowOf(uploaded.importId)).getByRole('button', { name: s.cancel }))
    const dialog = within(await screen.findByRole('alertdialog'))
    await user.type(dialog.getByLabelText(strings.cancel.reason), 'Duplicate upload')
    await user.click(dialog.getByRole('button', { name: strings.cancel.confirm }))

    expect(await screen.findByText('This import can no longer be cancelled (cancelled).')).toBeInTheDocument()
    await waitFor(() => expect(importRequests('list').length).toBeGreaterThan(before))
  })
})
