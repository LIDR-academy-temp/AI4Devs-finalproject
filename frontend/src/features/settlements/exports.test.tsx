import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { USERS } from '@/test/msw/fixtures'
import {
  holdNextSettlement,
  omitExportDisposition,
  respondNextSettlement,
  seedSettlement,
  settlementRequests,
} from '@/test/msw/settlements'
import { renderApp } from '@/test/render'
import { validatedImport } from '@/test/settlement-screens'
import { OPENING } from '@/test/validation-screens'
import { fileNameOf } from './contract'

// The constant that #12 turned on; each test says which way it is.
const flags = vi.hoisted(() => ({ available: false }))
vi.mock('./exports', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./exports')>()),
  get SETTLEMENT_EXPORTS_AVAILABLE() {
    return flags.available
  },
}))

const NAMES = ['Merchant summary', 'Transactions (CSV)', 'Reserves (CSV)']

async function openSummary(as: 'analyst' | 'viewer' = 'analyst') {
  const { importId } = validatedImport()
  const view = seedSettlement(importId, { batchNo: 123 })
  const rendered = renderApp(`/settlements/${view.batchId}`, { as })
  await screen.findByRole('heading', { name: 'Settlement Summary · batch 123' }, OPENING)
  return { ...rendered, view }
}

describe('Settlement Summary: downloads before #12 (spec "descargas")', () => {
  beforeEach(() => {
    flags.available = false
  })

  it('the three buttons are disabled with their reason, and there is no download link', async () => {
    await openSummary()

    for (const name of NAMES) {
      const button = screen.getByRole('button', { name })
      expect(button).toBeDisabled()
      expect(button).toHaveAccessibleDescription('Downloads are not available yet.')
    }
    expect(screen.queryAllByRole('link', { name: /summary|CSV/ })).toHaveLength(0)
  })
})

describe('Settlement Summary: downloads with #12 (spec "descargas")', () => {
  const saved: { name: string; href: string }[] = []

  beforeEach(() => {
    flags.available = true
    saved.length = 0
    // jsdom has no object URLs nor real downloads: record what the link would save.
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:export'), revokeObjectURL: vi.fn() })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push({ name: this.download, href: this.href })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('each button downloads its file with the name of the attempt, authenticated, and nothing else changes (criterion 3 of the issue)', async () => {
    const { user, view } = await openSummary()
    const reads = settlementRequests('get').length

    for (const name of NAMES) await user.click(screen.getByRole('button', { name }))

    await waitFor(() => expect(saved).toHaveLength(3))
    expect(saved.map((s) => s.name)).toEqual([
      'ProviderA-USD_B123_A1_summary.csv',
      'ProviderA-USD_B123_A1_transactions.csv',
      'ProviderA-USD_B123_A1_reserves.csv',
    ])
    expect(settlementRequests('export').map((r) => [r.url, r.status])).toEqual([
      [`/api/v1/settlements/${view.batchId}/export?type=summary`, 200],
      [`/api/v1/settlements/${view.batchId}/export?type=transactions`, 200],
      [`/api/v1/settlements/${view.batchId}/export?type=reserves`, 200],
    ])
    expect(screen.getByText('Processed · pending payment')).toBeInTheDocument()
    expect(settlementRequests('get')).toHaveLength(reads)
  })

  it('the downloads are on since the merge of #12', async () => {
    const actual = await vi.importActual<typeof import('./exports')>('./exports')
    expect(actual.SETTLEMENT_EXPORTS_AVAILABLE).toBe(true)
  })

  it('the Back-Office CSVs warn against opening them with Excel and say how to look at them', async () => {
    await openSummary()

    const warning =
      'Upload these CSV files to the Back-Office as downloaded: do not open or save them with Excel first. ' +
      'To look at one, use Data → From Text/CSV and set the ID column to Text.'
    expect(screen.getByText(warning)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Transactions (CSV)' })).toHaveAccessibleDescription(warning)
    expect(screen.getByRole('button', { name: 'Reserves (CSV)' })).toHaveAccessibleDescription(warning)
    expect(screen.getByRole('button', { name: 'Merchant summary' })).not.toHaveAccessibleDescription(warning)
  })

  it('without Content-Disposition (not exposed by CORS) the file takes the name of the attempt', async () => {
    omitExportDisposition()
    const { user } = await openSummary()

    await user.click(screen.getByRole('button', { name: 'Reserves (CSV)' }))

    await waitFor(() => expect(saved.map((s) => s.name)).toEqual(['ProviderA-USD_B123_A1_reserves.csv']))
  })

  it('each button has its own guard: another download does not release the one on its way', async () => {
    const { user } = await openSummary()
    const hold = holdNextSettlement('export')

    await user.click(screen.getByRole('button', { name: 'Merchant summary' }))
    await hold.arrived
    await user.click(screen.getByRole('button', { name: 'Transactions (CSV)' }))
    await waitFor(() => expect(saved.map((s) => s.name)).toEqual(['ProviderA-USD_B123_A1_transactions.csv']))

    expect(screen.getByRole('button', { name: 'Merchant summary' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Merchant summary' }))
    expect(settlementRequests('export')).toHaveLength(2)
    hold.release()
    await waitFor(() => expect(saved).toHaveLength(2))
    expect(screen.getByRole('button', { name: 'Merchant summary' })).toBeEnabled()
  })

  it('a failed download says so next to the buttons, and a new try takes the message away', async () => {
    const { user } = await openSummary()
    respondNextSettlement('export', { status: 500, code: 'internal_error' })

    await user.click(screen.getByRole('button', { name: 'Reserves (CSV)' }))

    expect(await screen.findByText('The file could not be downloaded. Try again.')).toBeInTheDocument()
    expect(saved).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Reserves (CSV)' }))
    await waitFor(() => expect(saved.map((s) => s.name)).toEqual(['ProviderA-USD_B123_A1_reserves.csv']))
    expect(screen.queryByText('The file could not be downloaded. Try again.')).not.toBeInTheDocument()
  })

  it('a Content-Disposition name that cannot be decoded falls back to the name of the attempt, without an error', () => {
    expect(fileNameOf("attachment; filename*=UTF-8''%E0%A4%A")).toBeNull()
    expect(fileNameOf('attachment; filename="ProviderA-USD_B123_A1_summary.csv"')).toBe(
      'ProviderA-USD_B123_A1_summary.csv',
    )
  })

  it('without reports.view there are no download buttons', async () => {
    const permissions = USERS.viewer.permissions
    USERS.viewer.permissions = ['fee.view']
    onTestFinished(() => {
      USERS.viewer.permissions = permissions
    })
    await openSummary('viewer')

    for (const name of NAMES) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
  })
})
