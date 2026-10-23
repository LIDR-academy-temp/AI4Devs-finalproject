import { act, type BoundFunctions, fireEvent, type queries, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { dropZone, fileInput, findFileEntry } from '@/test/import-screens'
import { failNext, holdNext, importRecord, importRequests, sampleFile, seedImport } from '@/test/msw/imports'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const PART1 = 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx'

async function openMapping(importId: string) {
  const view = renderApp(`/imports/${importId}?step=mapping`, { as: 'analyst' })
  await screen.findByRole('status', { name: strings.readiness.label })
  return view
}

async function choose(user: UserEvent, combobox: HTMLElement, option: string) {
  await user.click(combobox)
  await user.click(await screen.findByRole('option', { name: option }))
}

const analyzeButton = () => screen.getByRole('button', { name: strings.analyze.button })
const readiness = () => within(screen.getByRole('status', { name: strings.readiness.label }))
const sheet = (name: string) => within(screen.getByRole('region', { name }))
const tab = (name: string) => screen.getByRole('tab', { name })
type Scope = BoundFunctions<typeof queries>
/** The items of the readiness whose description starts with this text, read as `<sheet>: <description>`. */
const itemsAbout = (scope: Scope, description: string) =>
  scope
    .queryAllByRole('listitem')
    .filter((li) => /^[^:]+: (.*)$/.exec(li.textContent ?? '')?.[1]?.startsWith(description))
/** The sheet of a readiness item: its name in bold. */
const sheetOf = (item: HTMLElement) => item.querySelector(':scope strong')?.textContent
/** The readiness item that reads entirely as this text: its sheet, the hidden separator and its description. */
const itemReading = (scope: Scope, text: string) =>
  scope.getByText((_, element) => element?.tagName === 'LI' && element.textContent === text)

/** A batch-clean import mapped with APP confirmed without its Transaction ID column. */
function mappedWithoutId() {
  const detail = seedImport('batch-clean', { status: 'mapped' })
  const app = importRecord(detail.importId).files[0]!.sheets[0]!
  app.mapping = { ...app.mapping!, columns: app.mapping!.columns.filter((c) => c.targetField !== 'transactionId') }
  return detail.importId
}

describe('Column Mapping: readiness and Analyze (spec "Pantalla Column Mapping: readiness y Analyze")', () => {
  it('a sheet confirmed without ID blocks Analyze; mapping ID and confirming makes it ready', async () => {
    const { user } = await openMapping(mappedWithoutId())

    expect(analyzeButton()).toBeDisabled()
    expect(itemsAbout(readiness(), 'transactionId: ').map(sheetOf)).toEqual(['APP'])
    expect(screen.getByText(strings.analyze.resolveMissing)).toBeInTheDocument()

    await choose(user, sheet('APP').getByRole('combobox', { name: strings.mapping.fieldFor('ID') }), 'Transaction ID')
    await user.click(screen.getByRole('button', { name: strings.mapping.confirm }))

    expect(await readiness().findByText(strings.readiness.ready)).toBeInTheDocument()
    await waitFor(() => expect(analyzeButton()).toBeEnabled())
  })

  it('an uploaded import ready by its proposal still asks to confirm the mapping first', async () => {
    await openMapping(seedImport('batch-clean').importId)

    expect(readiness().getByText(strings.readiness.ready)).toBeInTheDocument()
    expect(analyzeButton()).toBeDisabled()
    expect(screen.getByText('Confirm the mapping before analyzing.')).toBeInTheDocument()
  })

  it('an unconfirmed change disables Analyze of an import ready to analyze', async () => {
    const { user } = await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)
    expect(analyzeButton()).toBeEnabled()

    await choose(
      user,
      sheet('APP').getByRole('combobox', { name: strings.mapping.fieldFor('Currency') }),
      'Keep as reference',
    )

    expect(analyzeButton()).toBeDisabled()
    expect(screen.getByText('Confirm the mapping before analyzing.')).toBeInTheDocument()
  })

  it('a file added after confirming names each of its sheets with confirmation', async () => {
    const { importId } = seedImport('batch-split', { status: 'mapped', labels: ['batch-split_part1'] })
    const { user } = await openMapping(importId)

    await user.click(tab(strings.steps.files))
    await user.upload(fileInput(), sampleFile('batch-split_part2'))
    await findFileEntry('Recon_Template_ProviderA-USD_batch-split_part2.xlsx')
    await user.click(tab(strings.steps.mapping))

    const part2Sheets = importRecord(importId).files[1]!.sheets.map((s) => s.template.sheetName)
    const confirmations = itemsAbout(readiness(), 'confirmation: ')
    expect(confirmations.map(sheetOf)).toEqual(part2Sheets)
    expect(analyzeButton()).toBeDisabled()
    expect(within(screen.getByRole('region', { name: PART1 })).getAllByRole('region').length).toBe(10)
  })
})

describe('Column Mapping: readiness per file (spec "Pantalla Column Mapping: readiness por archivo")', () => {
  const PART2 = 'Recon_Template_ProviderA-USD_batch-split_part2.xlsx'
  const group = (fileName: string) => within(readiness().getByRole('region', { name: `Readiness · ${fileName}` }))
  const folded = (text: string) => itemReading(readiness(), text).closest('details')

  it('groups the notes by file with the actionable ones first and the informational ones folded', async () => {
    await openMapping(seedImport('batch-split').importId)

    const part1 = group(PART1)
    expect(part1.getByRole('heading', { name: PART1 })).toBeInTheDocument()
    // The sheet in bold, apart from its description; the item reads as one sentence (spec "Nombre de hoja destacado").
    const declined = itemReading(part1, 'DEC: Fixed status Declined with rows: the DEC range will open at validation')
    expect(declined.tagName).toBe('LI')
    expect(within(declined).getByText('DEC').tagName).toBe('STRONG')
    expect(declined.closest('details')).toBeNull()
    const summary1 = part1.getByText('8 informational notes')
    expect(summary1.closest('details')).not.toHaveAttribute('open')
    expect(declined.compareDocumentPosition(summary1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    for (const note of [
      'CHB: The sheet has no rows',
      'Settings: The sheet is hidden in the workbook',
      'Settings: Sheet "Settings" is ignored by rule "Settings"',
    ]) {
      expect(itemReading(part1, note).closest('details')).toBe(summary1.closest('details'))
    }

    const part2 = group(PART2)
    expect(part2.getByText('6 informational notes')).toBeInTheDocument()
    expect(part2.getAllByRole('listitem').every((item) => item.closest('details') !== null)).toBe(true)
  })

  it('puts the sheets to confirm of a file in its group, outside the folded notes', async () => {
    const { importId } = seedImport('batch-split', { status: 'mapped', labels: ['batch-split_part1'] })
    const { user } = await openMapping(importId)

    await user.click(tab(strings.steps.files))
    await user.upload(fileInput(), sampleFile('batch-split_part2'))
    await findFileEntry(PART2)
    await user.click(tab(strings.steps.mapping))

    const confirmations = itemsAbout(group(PART2), 'confirmation: ')
    expect(confirmations).toHaveLength(10)
    expect(confirmations.every((item) => item.closest('details') === null)).toBe(true)
    expect(itemsAbout(group(PART1), 'confirmation: ')).toHaveLength(0)
  })

  it('shows what concerns the whole import before the groups of the files', async () => {
    await openMapping(seedImport('batch-clean', { labels: [] }).importId)

    expect(itemReading(readiness(), 'Import: transactions: The import has no files')).toBeInTheDocument()
    expect(folded('Import: transactions: The import has no files')).toBeNull()
  })

  it('Ready to analyze: each informational note with its sheet in bold, apart from its description', async () => {
    await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)

    expect(readiness().getByText(strings.readiness.ready)).toBeInTheDocument()
    const items = readiness().getAllByRole('listitem')
    expect(items.length).toBeGreaterThan(0)
    for (const item of items)
      expect(item.textContent).toBe(`${sheetOf(item)}: ${item.lastElementChild!.textContent!.slice(2)}`)
    expect(items.map(sheetOf)).toContain('CHB Alerts')
  })
})

describe('Column Mapping: analysis in progress (spec "Pantalla Column Mapping: análisis en curso")', () => {
  it('a double click sends a single POST analyze and the controls wait for it', async () => {
    const hold = holdNext('analyze')
    const { user } = await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)

    await user.dblClick(analyzeButton())
    await hold.arrived

    expect(await screen.findByText('Analyzing… this can take up to a minute.')).toBeInTheDocument()
    expect(analyzeButton()).toBeDisabled()
    expect(screen.getByRole('button', { name: strings.mapping.confirm })).toBeDisabled()
    await user.click(tab(strings.steps.files))
    expect(dropZone()).toBeDisabled()
    const file = await findFileEntry('Recon_Template_ProviderA-USD_batch-clean.xlsx')
    expect(file.getByRole('button', { name: /^Remove / })).toBeDisabled()

    hold.release()
    await waitFor(() => expect(tab(strings.steps.analysis)).toHaveAttribute('aria-selected', 'true'))
    expect(importRequests('analyze')).toHaveLength(1)
  })

  it('two clicks in the same tick, before React re-renders, still send a single POST analyze', async () => {
    const hold = holdNext('analyze')
    await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)
    const button = analyzeButton()

    // Inside one act the button cannot be disabled between the clicks: only the synchronous guard stops the second.
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await hold.arrived
    hold.release()

    await waitFor(() => expect(tab(strings.steps.analysis)).toHaveAttribute('aria-selected', 'true'))
    expect(importRequests('analyze')).toHaveLength(1)
  })

  it('a 200 takes the screen to the Analysis step', async () => {
    const { user, router } = await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)

    await user.click(analyzeButton())

    await waitFor(() => expect(router.state.location.search).toMatchObject({ step: 'analysis' }))
    expect(tab(strings.steps.analysis)).toHaveAttribute('aria-selected', 'true')
  })

  it('a 200 invalidates the cached rows of the import (design D3)', async () => {
    const { importId } = seedImport('batch-clean', { status: 'mapped' })
    const { user, queryClient } = await openMapping(importId)
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    await user.click(analyzeButton())

    await waitFor(() => expect(tab(strings.steps.analysis)).toHaveAttribute('aria-selected', 'true'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['imports', importId, 'rows'] })
  })

  it('422 mapping_incomplete stays in Mapping with the missing field and Analyze disabled', async () => {
    const { importId } = seedImport('batch-clean', { status: 'mapped' })
    const { user } = await openMapping(importId)
    const app = importRecord(importId).files[0]!.sheets[0]!
    app.mapping = { ...app.mapping!, columns: [] }

    await user.click(analyzeButton())

    await waitFor(() => expect(itemsAbout(readiness(), 'transactionId: ').map(sheetOf)).toEqual(['APP']))
    expect(tab(strings.steps.mapping)).toHaveAttribute('aria-selected', 'true')
    expect(analyzeButton()).toBeDisabled()
  })

  it('a lost connection with the import read back as analyzed shows the Analysis step without error', async () => {
    failNext('analyze', { applied: true })
    const { user } = await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)

    await user.click(analyzeButton())

    await waitFor(() => expect(tab(strings.steps.analysis)).toHaveAttribute('aria-selected', 'true'))
    expect(screen.queryByText(strings.analyze.didNotFinish)).not.toBeInTheDocument()
  })

  it('a lost connection with the import read back as mapped says the analysis did not finish', async () => {
    failNext('analyze', { applied: false })
    const { user } = await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)

    await user.click(analyzeButton())

    expect(await screen.findByText('The analysis did not finish. Try again.')).toBeInTheDocument()
    expect(analyzeButton()).toBeEnabled()
  })

  it.each([
    [403, 'forbidden', 'You do not have permission to analyze this import.'],
    [404, 'not_found', 'This import is not available.'],
  ] as const)('a %i says why without inviting to try again', async (status, code, message) => {
    server.use(
      http.post('*/api/v1/imports/:importId/analyze', () => HttpResponse.json({ code, message: code }, { status }), {
        once: true,
      }),
    )
    const { user } = await openMapping(seedImport('batch-clean', { status: 'mapped' }).importId)

    await user.click(analyzeButton())

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.queryByText(strings.analyze.didNotFinish)).not.toBeInTheDocument()
    expect(screen.queryByText(/try again/i)).not.toBeInTheDocument()
  })

  it('422 import_too_large says how many rows there are and the limit', async () => {
    const { importId } = seedImport('batch-clean', { status: 'mapped' })
    const { user } = await openMapping(importId)
    const app = importRecord(importId).files[0]!.sheets[0]!
    app.template = { ...app.template, rowCount: 100_001 - 443 }

    await user.click(analyzeButton())

    expect(await screen.findByText(strings.analyze.tooLarge(100_001, 100_000))).toBeInTheDocument()
    expect(strings.analyze.tooLarge(100_001, 100_000)).toMatch(/100,001.*100,000/)
  })
})
