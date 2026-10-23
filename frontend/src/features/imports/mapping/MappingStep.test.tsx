import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { importRecord, importRequests, seedImport } from '@/test/msw/imports'
import { renderApp } from '@/test/render'
import { strings } from '../strings'

async function openMapping(importId: string, as: 'analyst' | 'viewer' = 'analyst') {
  const view = renderApp(`/imports/${importId}?step=mapping`, { as })
  await screen.findByRole('status', { name: strings.readiness.label })
  return view
}

/** The section of a sheet (inside the card of its file when given). */
function sheet(name: string, fileName?: string) {
  const scope = fileName ? within(screen.getByRole('region', { name: fileName })) : screen
  return within(scope.getByRole('region', { name }))
}

async function choose(user: UserEvent, combobox: HTMLElement, option: string) {
  await user.click(combobox)
  await user.click(await screen.findByRole('option', { name: option }))
}

async function optionsOf(user: UserEvent, combobox: HTMLElement) {
  await user.click(combobox)
  const names = (await screen.findAllByRole('option')).map((o) => o.textContent)
  await user.keyboard('{Escape}')
  return names
}

const control = (section: ReturnType<typeof sheet>, label: string) => section.getByRole('combobox', { name: label })
const field = (section: ReturnType<typeof sheet>, column: string) => control(section, strings.mapping.fieldFor(column))
const previewHeaders = (section: ReturnType<typeof sheet>) =>
  section.getAllByRole('columnheader').map((h) => h.textContent)

describe('Column Mapping: proposal per sheet (spec "Pantalla Column Mapping: propuesta por hoja")', () => {
  it('shows each sheet of batch-clean with its name and the proposal in the analyst words', async () => {
    await openMapping(seedImport('batch-clean').importId)

    for (const [name, label] of [
      ['APP', 'Proposed: E · Successful — global rule'],
      ['DEC', 'Proposed: E · Declined — global rule'],
      ['CHB', 'Proposed: I · Chargeback — global rule'],
      ['REF', 'Proposed: I · Refund — global rule'],
      ['RDR', 'Proposed: I · RDR — global rule'],
      ['RR', 'Proposed: R · reserve, no status — global rule'],
      ['Other Fees', 'Proposed: batch fees — global rule'],
    ] as const) {
      const section = sheet(name)
      expect(section.getByRole('heading', { name })).toBeInTheDocument()
      expect(section.getByText(label)).toBeInTheDocument()
    }
    const app = sheet('APP')
    expect(control(app, strings.mapping.kind)).toHaveTextContent('Transactions')
    expect(control(app, strings.mapping.cycle)).toHaveTextContent('E · transaction')
    expect(control(app, strings.mapping.status)).toHaveTextContent('Successful')
  })

  it('shows the legacy proposal of ProviderC-Alt with its account rules', async () => {
    await openMapping(seedImport('legacy-provider').importId)

    expect(sheet('TRX').getByText('Proposed: E · status from column — account rule')).toBeInTheDocument()
    expect(sheet('Fail').getByText('Proposed: E · Declined — account rule')).toBeInTheDocument()
    expect(sheet('CB').getByText('Proposed: I · status from column — account rule')).toBeInTheDocument()
    expect(sheet('Summary').getByText('Proposed: ignore — account rule')).toBeInTheDocument()
  })

  it('shows a sheet without a rule as No proposal with no type chosen', async () => {
    await openMapping(seedImport('bonus').importId)

    const bonus = sheet('Bonus')
    expect(bonus.getByText('No proposal')).toBeInTheDocument()
    expect(control(bonus, strings.mapping.kind)).toHaveTextContent(strings.mapping.chooseKind)
  })

  it('keeps the proposal visible while the sheet is edited', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)

    await choose(user, control(sheet('DEC'), strings.mapping.cycle), 'I · adjustment')

    expect(sheet('DEC').getByText('Proposed: E · Declined — global rule')).toBeInTheDocument()
    expect(control(sheet('DEC'), strings.mapping.cycle)).toHaveTextContent('I · adjustment')
  })
})

describe('Column Mapping: sheets with nothing to map (spec "Pantalla Column Mapping: hojas sin nada que parear")', () => {
  it('shows the sheets with 0 rows and Settings, ignored by rule, as one line without controls', async () => {
    await openMapping(seedImport('batch-clean').importId)

    for (const name of ['Duplicate Corrections', 'CHB Alerts']) {
      const section = sheet(name)
      expect(section.getByRole('heading', { name })).toBeInTheDocument()
      expect(section.getByText('0 rows')).toBeInTheDocument()
      expect(section.queryByText('Proposed: ignore — global rule')).not.toBeInTheDocument()
      expect(section.queryAllByRole('combobox')).toHaveLength(0)
      expect(section.queryByRole('table')).not.toBeInTheDocument()
      expect(section.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    }

    const settings = sheet('Settings')
    expect(settings.getByText('Proposed: ignore — global rule')).toBeInTheDocument()
    expect(settings.getByText('21 rows')).toBeInTheDocument()
    expect(settings.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(settings.queryAllByRole('combobox')).toHaveLength(0)
    expect(settings.queryByText('Sheet "Settings" is ignored by rule "Settings"')).not.toBeInTheDocument()
  })

  it('Edit on Settings shows its controls with Ignore and its note, and its type can change', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)

    await user.click(sheet('Settings').getByRole('button', { name: 'Edit' }))

    const settings = sheet('Settings')
    expect(control(settings, strings.mapping.kind)).toHaveTextContent('Ignore')
    expect(settings.getByText('Sheet "Settings" is ignored by rule "Settings"')).toBeInTheDocument()
    await choose(user, control(settings, strings.mapping.kind), 'Transactions')
    expect(control(sheet('Settings'), strings.mapping.kind)).toHaveTextContent('Transactions')
  })

  it('says Show instead of Edit where the sheet cannot be edited', async () => {
    const { user } = await openMapping(seedImport('batch-clean', { status: 'analyzed' }).importId)

    const settings = sheet('Settings')
    expect(settings.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
    await user.click(settings.getByRole('button', { name: 'Show' }))
    expect(control(sheet('Settings'), strings.mapping.kind)).toBeDisabled()
  })

  it('says Show to viewer', async () => {
    await openMapping(seedImport('batch-clean').importId, 'viewer')

    expect(sheet('Settings').getByRole('button', { name: 'Show' })).toBeInTheDocument()
  })

  it('the confirmation still sends every sheet, the compact ones too', async () => {
    const { importId } = seedImport('batch-clean')
    const { user } = await openMapping(importId)

    await user.click(screen.getByRole('button', { name: strings.mapping.confirm }))

    await waitFor(() => expect(importRequests('mapping')).toHaveLength(1))
    const sent = (importRequests('mapping')[0]!.body as { sheets: { sheetId: string }[] }).sheets
    const all = importRecord(importId).files.flatMap((f) => f.sheets.map((s) => s.sheetId))
    expect(sent.map((s) => s.sheetId)).toEqual(all)
    expect(sent).toHaveLength(10)
  })
})

describe('Column Mapping: proposal per column (spec "Pantalla Column Mapping: propuesta por columna")', () => {
  it('shows the field and the origin of each column of the template', async () => {
    await openMapping(seedImport('batch-clean').importId)

    const app = sheet('APP')
    for (const [column, label] of [
      ['ID', 'Transaction ID'],
      ['Amount', 'Amount'],
      ['Currency', 'Currency'],
    ] as const) {
      expect(field(app, column)).toHaveTextContent(label)
      expect(within(app.getByRole('group', { name: column })).getByText('Global rule')).toBeInTheDocument()
    }
    expect(field(sheet('Other Fees'), 'Type of Fee')).toHaveTextContent('Fee type')
  })

  it('shows how each status value of the legacy sheets resolves', async () => {
    await openMapping(seedImport('legacy-provider').importId)

    const cb = within(sheet('CB').getByRole('group', { name: 'Order Status' }))
    expect(cb.getByText('CHB 2 → Chargeback')).toBeInTheDocument()
    expect(cb.getByText(strings.mapping.amountExcluded)).toBeInTheDocument()
    expect(cb.getByText('Account rule')).toBeInTheDocument()
    const fail = within(sheet('Fail').getByRole('group', { name: 'Order Status' }))
    expect(fail.getByText('Failed → Declined')).toBeInTheDocument()
    expect(fail.queryByText(strings.mapping.amountExcluded)).not.toBeInTheDocument()
  })

  it('never offers Gateway', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)

    const transactionFields = await optionsOf(user, field(sheet('APP'), 'ID'))
    const feeFields = await optionsOf(user, field(sheet('Other Fees'), 'Type of Fee'))

    expect(transactionFields).toContain('Transaction ID')
    expect(feeFields).toContain('Fee type')
    expect([...transactionFields, ...feeFields]).not.toContain('Gateway')
  })
})

describe('Column Mapping: preview (spec "Pantalla Column Mapping: vista previa")', () => {
  it('shows the cells of APP as text, as they were read', async () => {
    await openMapping(seedImport('batch-clean').importId)

    const preview = within(sheet('APP').getByRole('table', { name: strings.mapping.previewOf('APP') }))
    const firstRow = preview.getAllByRole('row')[1]!
    expect(
      within(firstRow)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['252570479111759', '16.22', 'USD'])
  })

  it('changes the header of a column as soon as its field changes, without any request', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)
    const before = importRequests().length
    expect(previewHeaders(sheet('APP'))).toEqual(['ID · Transaction ID', 'Amount · Amount', 'Currency · Currency'])

    await choose(user, field(sheet('APP'), 'Currency'), strings.mapping.keepAsReference)

    expect(previewHeaders(sheet('APP'))).toEqual([
      'ID · Transaction ID',
      'Amount · Amount',
      `Currency · ${strings.mapping.keepAsReference}`,
    ])
    expect(importRequests()).toHaveLength(before)
  })
})

describe('Column Mapping: editing (spec "Pantalla Column Mapping: edición del pareo")', () => {
  it('a reserve cycle empties and disables the fixed status', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)

    await choose(user, control(sheet('REF'), strings.mapping.cycle), 'R · reserve')

    const status = control(sheet('REF'), strings.mapping.status)
    expect(status).toBeDisabled()
    expect(status).toHaveTextContent(strings.mapping.noStatus)
  })

  it('a field mapped twice is an error on both columns and blocks the confirmation', async () => {
    const { user } = await openMapping(seedImport('batch-clean').importId)

    await choose(user, field(sheet('APP'), 'Currency'), 'Amount')

    const app = sheet('APP')
    for (const column of ['Amount', 'Currency']) {
      expect(
        within(app.getByRole('group', { name: column })).getByText('Amount is mapped twice in this sheet.'),
      ).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: strings.mapping.confirm })).toBeDisabled()
  })

  it('classifying a sheet without proposal as Ignore disables its columns', async () => {
    const { user } = await openMapping(seedImport('bonus').importId)

    await choose(user, control(sheet('Bonus'), strings.mapping.kind), 'Ignore')

    expect(field(sheet('Bonus'), 'Reference')).toBeDisabled()
    expect(field(sheet('Bonus'), 'Importe')).toBeDisabled()
    expect(control(sheet('Bonus'), strings.mapping.cycle)).toBeDisabled()
    expect(screen.getByRole('button', { name: strings.mapping.confirm })).toBeEnabled()
  })
})
