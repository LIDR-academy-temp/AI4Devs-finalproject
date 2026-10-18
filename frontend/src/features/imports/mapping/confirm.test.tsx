import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fileInput, findFileEntry } from '@/test/import-screens'
import { holdNext, importRecord, importRequests, sampleFile, seedImport } from '@/test/msw/imports'
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
    // The literals of the spec, not the fixture the fake API is built from.
    const sheetName = new Map(
      importRecord(importId).files[0]!.sheets.map((s) => [s.sheetId, s.template.sheetName] as const),
    )
    type SentSheet = {
      sheetId: string
      kind: string
      cycle: string | null
      statusId: number | null
      columns: { sourceColumn: string; targetField: string }[]
    }
    const sent = (importRequests('mapping')[0]!.body as { sheets: SentSheet[] }).sheets
    const byName = Object.fromEntries(sent.map((s) => [sheetName.get(s.sheetId), s]))
    expect(sent).toHaveLength(10)
    const idAmountCurrency = [
      { sourceColumn: 'ID', targetField: 'transactionId' },
      { sourceColumn: 'Amount', targetField: 'amount' },
      { sourceColumn: 'Currency', targetField: 'currency' },
    ]
    for (const [name, cycle, statusId] of [
      ['APP', 'E', 2],
      ['DEC', 'E', 3],
      ['CHB', 'I', 4],
      ['REF', 'I', 5],
      ['RDR', 'I', 6],
      ['RR', 'R', null],
    ] as const) {
      expect(byName[name]).toEqual({
        sheetId: expect.any(String),
        kind: 'transactions',
        cycle,
        statusId,
        columns: idAmountCurrency,
      })
    }
    expect(byName['Other Fees']).toEqual({
      sheetId: expect.any(String),
      kind: 'batch_fees',
      cycle: null,
      statusId: null,
      columns: [
        { sourceColumn: 'Type of Fee', targetField: 'feeType' },
        { sourceColumn: 'Amount', targetField: 'amount' },
        { sourceColumn: 'Currency', targetField: 'currency' },
      ],
    })
    for (const name of ['Duplicate Corrections', 'CHB Alerts', 'Settings']) {
      expect(byName[name]).toEqual({
        sheetId: expect.any(String),
        kind: 'ignore',
        cycle: null,
        statusId: null,
        columns: [],
      })
    }
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

  it('an edited sheet of a removed file no longer counts: Confirm mapping is enabled again', async () => {
    const { importId } = seedImport('batch-split')
    const { user } = await openMapping(importId)

    await choose(
      user,
      sheet('CHB', PART2).getByRole('combobox', { name: strings.mapping.fieldFor('Currency') }),
      'Amount',
    )
    expect(confirmButton()).toBeDisabled()

    await user.click(screen.getByRole('tab', { name: strings.steps.files }))
    await user.click((await findFileEntry(PART2)).getByRole('button', { name: strings.files.remove(PART2) }))
    await waitFor(() => expect(screen.queryByRole('listitem', { name: PART2 })).not.toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))

    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())
    await waitFor(() => expect(importRequests('mapping')).toHaveLength(1))
    const sent = (importRequests('mapping')[0]!.body as { sheets: { sheetId: string }[] }).sheets
    expect(sent.map((s) => s.sheetId)).toEqual(importRecord(importId).files[0]!.sheets.map((s) => s.sheetId))
  })

  it('an edit in a removed file leaves no unconfirmed change behind: Analyze is enabled', async () => {
    const { importId } = seedImport('batch-split', { status: 'mapped' })
    const { user } = await openMapping(importId)
    const analyze = () => screen.getByRole('button', { name: strings.analyze.button })
    expect(analyze()).toBeEnabled()

    await choose(user, cycleOf(sheet('CHB', PART2)), 'E · transaction')
    expect(analyze()).toBeDisabled()

    await user.click(screen.getByRole('tab', { name: strings.steps.files }))
    await user.click((await findFileEntry(PART2)).getByRole('button', { name: strings.files.remove(PART2) }))
    await waitFor(() => expect(screen.queryByRole('listitem', { name: PART2 })).not.toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: strings.steps.mapping }))

    await waitFor(() => expect(analyze()).toBeEnabled())
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
    // DEC of part2 has no rows and shows as one line: its own proposal is what the confirmation sends.
    await user.click(confirmButton())
    await waitFor(() => expect(importRequests('mapping')).toHaveLength(1))
    const [part1, part2] = importRecord(importId).files
    const sent = (importRequests('mapping')[0]!.body as { sheets: { sheetId: string; cycle: string | null }[] }).sheets
    const cycleSent = (file: typeof part1) =>
      sent.find((s) => s.sheetId === file!.sheets.find((x) => x.template.sheetName === 'DEC')!.sheetId)?.cycle
    expect(cycleSent(part1)).toBe('I')
    expect(cycleSent(part2)).toBe('E')
  })
})
