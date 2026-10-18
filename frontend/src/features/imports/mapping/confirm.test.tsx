import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fileInput, findFileEntry } from '@/test/import-screens'
import { holdNext, importRecord, importRequests, proposalBody, sampleFile, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

const PART1 = 'Recon_Template_ProviderA-USD_batch-split_part1.xlsx'
const PART2 = 'Recon_Template_ProviderA-USD_batch-split_part2.xlsx'

async function openMapping(importId: string) {
  const view = renderApp(`/imports/${importId}?step=mapping`, { as: 'analyst' })
  await screen.findByRole('status', { name: strings.readiness.label })
  return view
}

function sheet(name: string, fileName?: string) {
  const scope = fileName ? within(screen.getByRole('region', { name: fileName })) : screen
  return within(scope.getByRole('region', { name }))
}

async function choose(user: UserEvent, combobox: HTMLElement, option: string) {
  await user.click(combobox)
  await user.click(await screen.findByRole('option', { name: option }))
}

const cycleOf = (section: ReturnType<typeof sheet>) => section.getByRole('combobox', { name: strings.mapping.cycle })
const confirmButton = () => screen.getByRole('button', { name: strings.mapping.confirm })
const header = () => within(screen.getByRole('region', { name: strings.header.label }))
const readiness = () => within(screen.getByRole('status', { name: strings.readiness.label }))

describe('Column Mapping: confirmation (spec "Pantalla Column Mapping: confirmación")', () => {
  it('confirming the proposal sends every sheet and leaves the import mapped and ready', async () => {
    const { importId } = seedImport('batch-clean')
    const { user } = await openMapping(importId)

    await user.click(confirmButton())

    expect(await header().findByText('mapped')).toBeInTheDocument()
    expect(readiness().getByText(strings.readiness.ready)).toBeInTheDocument()
    expect(importRequests('mapping').map((r) => r.body)).toEqual([proposalBody(importRecord(importId))])
  })

  it('a corrected sheet is shown with its confirmed mapping and keeps its preview', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)

    await choose(user, cycleOf(sheet('DEC')), 'I · adjustment')
    await choose(user, sheet('DEC').getByRole('combobox', { name: strings.mapping.status }), 'Refund')
    await user.click(confirmButton())

    expect(await sheet('DEC').findByText('Confirmed: I · Refund')).toBeInTheDocument()
    expect(header().getByText('mapped')).toBeInTheDocument()
    expect(within(sheet('DEC').getByRole('table')).getAllByRole('row').length).toBeGreaterThan(1)
  })

  it('is disabled while sending and a double click sends a single PUT', async () => {
    const hold = holdNext('mapping')
    const { user } = await openMapping(seedImport('batch-clean').importId)

    await user.dblClick(confirmButton())
    await hold.arrived

    expect(confirmButton()).toBeDisabled()
    hold.release()
    expect(await header().findByText('mapped')).toBeInTheDocument()
    expect(importRequests('mapping')).toHaveLength(1)
  })

  it('two clicks in the same tick, before React re-renders, still send a single PUT', async () => {
    const hold = holdNext('mapping')
    await openMapping(seedImport('batch-clean').importId)
    const button = confirmButton()

    // Inside one act the button cannot be disabled between the clicks: only the synchronous guard stops the second.
    act(() => {
      fireEvent.click(button)
      fireEvent.click(button)
    })
    await hold.arrived
    hold.release()

    expect(await header().findByText('mapped')).toBeInTheDocument()
    expect(importRequests('mapping')).toHaveLength(1)
  })

  it('an import no longer editable says so and reloads it as it stands', async () => {
    const { importId } = seedImport('batch-clean')
    const { user } = await openMapping(importId)
    importRecord(importId).status = 'analyzed'

    await user.click(confirmButton())

    expect(await screen.findByText('This import can no longer be edited (analyzed).')).toBeInTheDocument()
    expect(await header().findByText('analyzed')).toBeInTheDocument()
    expect(importRequests('detail').length).toBeGreaterThan(0)
  })
})

describe('Column Mapping: unconfirmed changes survive the Files step (design D5)', () => {
  it('keeps the change of DEC after a rejected duplicate and after removing part2', async () => {
    const { importId } = seedImport('batch-split')
    const { user } = await openMapping(importId)

    await choose(user, cycleOf(sheet('DEC', PART1)), 'I · adjustment')

    await user.click(screen.getByRole('tab', { name: strings.steps.files }))
    await user.upload(fileInput(), sampleFile('batch-split_part1', 'part1-again.xlsx'))
    await (await findFileEntry('part1-again.xlsx')).findByText(/already in the import/)
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))
    expect(cycleOf(sheet('DEC', PART1))).toHaveTextContent('I · adjustment')

    await user.click(screen.getByRole('tab', { name: strings.steps.files }))
    await user.click((await findFileEntry(PART2)).getByRole('button', { name: strings.files.remove(PART2) }))
    await waitFor(() => expect(screen.queryByRole('listitem', { name: PART2 })).not.toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))

    expect(cycleOf(sheet('DEC', PART1))).toHaveTextContent('I · adjustment')
    expect(screen.queryByRole('region', { name: PART2 })).not.toBeInTheDocument()
  })

  it('keeps the change of DEC when part2 is added, and part2 takes its own proposal', async () => {
    const { importId } = seedImport('batch-split', { labels: ['batch-split_part1'] })
    const { user } = await openMapping(importId)

    await choose(user, cycleOf(sheet('DEC', PART1)), 'I · adjustment')
    await user.click(screen.getByRole('tab', { name: strings.steps.files }))
    await user.upload(fileInput(), sampleFile('batch-split_part2'))
    await findFileEntry(PART2)
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))

    expect(cycleOf(sheet('DEC', PART1))).toHaveTextContent('I · adjustment')
    expect(cycleOf(sheet('DEC', PART2))).toHaveTextContent('E · transaction')
  })
})
