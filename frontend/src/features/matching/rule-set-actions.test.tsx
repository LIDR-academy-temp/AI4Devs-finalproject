import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { tableRows } from '@/test/matching-screens'
import { ACCOUNT_IDS } from '@/test/msw/fixtures'
import { matchingRequests, respondNextMatching } from '@/test/msw/matching'
import { RULE_SETS } from '@/test/msw/matching-fixtures'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec matching "Pantalla Matching Rules: renombrar", "activar y desactivar" and "crear un conjunto"
// (web-admin-matching design D7). Each write sends the whole document with the stored rules, without ids.
const LEGACY = RULE_SETS.find((r) => r.name === 'Provider C legacy')!
const stored = (row: typeof LEGACY) => ({
  sheetRules: row.sheetRules.map(({ sheetRuleId: _id, ...r }) => r),
  columnRules: row.columnRules.map(({ columnRuleId: _id, ...r }) => r),
})
const RETIRED = RULE_SETS.find((r) => r.name === 'Provider C retired')!

async function openSet(path: string, name: string) {
  const rendered = renderApp(path, { as: 'admin' })
  await screen.findByRole('heading', { level: 1, name }, OPENING)
  await tableRows('Sheet rules')
  return rendered
}

const lastPut = () => matchingRequests('put').at(-1)?.body

describe('Matching Rules: rename', () => {
  it('sends the new name with the stored rules and shows it in the title', async () => {
    const { user } = await openSet('/matching-rules/3', 'Provider C legacy')

    await user.click(screen.getByRole('button', { name: 'Rename…' }))
    const sheet = within(await screen.findByRole('dialog', { name: 'Rename Provider C legacy' }))
    await user.clear(sheet.getByLabelText('Name'))
    await user.type(sheet.getByLabelText('Name'), 'Provider C 2019')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Provider C 2019' })).toBeInTheDocument()
    expect(lastPut()).toEqual({ name: 'Provider C 2019', isActive: true, ...stored(LEGACY) })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Rename…' })).toHaveFocus()
  })

  it('a name in use goes next to the name and the panel keeps what was written', async () => {
    respondNextMatching('put', { status: 409, code: 'rule_set_name_taken' })
    const { user } = await openSet('/matching-rules/3', 'Provider C legacy')

    await user.click(screen.getByRole('button', { name: 'Rename…' }))
    const sheet = within(await screen.findByRole('dialog'))
    await user.clear(sheet.getByLabelText('Name'))
    await user.type(sheet.getByLabelText('Name'), 'Provider C retired')
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    const name = sheet.getByLabelText('Name')
    await waitFor(() => expect(name).toHaveAccessibleDescription('A rule set of this provider already uses this name.'))
    expect(name).toHaveValue('Provider C retired')
    expect(name).toHaveFocus()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('a blank name is not sent', async () => {
    const { user } = await openSet('/matching-rules/3', 'Provider C legacy')

    await user.click(screen.getByRole('button', { name: 'Rename…' }))
    const sheet = within(await screen.findByRole('dialog'))
    await user.clear(sheet.getByLabelText('Name'))
    await user.click(sheet.getByRole('button', { name: 'Save' }))

    expect(await sheet.findByText('Enter a name.')).toBeInTheDocument()
    expect(matchingRequests('put')).toEqual([])
  })

  it('Rename and Deactivate wait while the rules have unsaved changes', async () => {
    const { user } = await openSet('/matching-rules/3', 'Provider C legacy')

    await user.click(screen.getByRole('button', { name: 'Edit rules' }))
    await user.click(await screen.findByRole('button', { name: 'Add column rule' }))

    expect(screen.getByRole('button', { name: 'Rename…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Deactivate…' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('button', { name: 'Rename…' })).toBeEnabled()
  })
})

describe('Matching Rules: deactivate and activate', () => {
  it('a rule set in use stays active and the dialog lists its accounts with a link to each', async () => {
    respondNextMatching('put', {
      status: 409,
      code: 'rule_set_in_use',
      details: { accounts: [{ accountId: ACCOUNT_IDS['ProviderC-Alt'], name: 'ProviderC-Alt' }] },
    })
    const { user } = await openSet('/matching-rules/3', 'Provider C legacy')

    await user.click(screen.getByRole('button', { name: 'Deactivate…' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Deactivate Provider C legacy?' }))
    await user.click(dialog.getByRole('button', { name: 'Deactivate' }))

    expect(
      await dialog.findByText('This rule set is linked to these accounts. Link them to another set first.'),
    ).toBeInTheDocument()
    expect(dialog.getByRole('link', { name: 'ProviderC-Alt' })).toHaveAttribute(
      'href',
      `/accounts/${ACCOUNT_IDS['ProviderC-Alt']}`,
    )
    expect(lastPut()).toEqual({ name: 'Provider C legacy', isActive: false, ...stored(LEGACY) })
    // The dialog is modal: the page is read once it is closed.
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    expect(within(screen.getByRole('region', { name: 'Rule set' })).getByText('active')).toBeInTheDocument()
  })

  it('Activate sends isActive with the stored rules and the reason, and the set becomes active', async () => {
    const { user } = await openSet('/matching-rules/4', 'Provider C retired')

    await user.click(screen.getByRole('button', { name: 'Activate…' }))
    const dialog = within(await screen.findByRole('alertdialog', { name: 'Activate Provider C retired?' }))
    await user.type(dialog.getByLabelText('Reason (optional)'), '  Back in use  ')
    await user.click(dialog.getByRole('button', { name: 'Activate' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(lastPut()).toEqual({ name: 'Provider C retired', isActive: true, ...stored(RETIRED), reason: 'Back in use' })
    expect(within(screen.getByRole('region', { name: 'Rule set' })).getByText('active')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate…' })).toHaveFocus()
  })

  it('Cancel sends nothing', async () => {
    const { user } = await openSet('/matching-rules/3', 'Provider C legacy')

    await user.click(screen.getByRole('button', { name: 'Deactivate…' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }))

    expect(matchingRequests('put')).toEqual([])
    expect(screen.getByRole('button', { name: 'Deactivate…' })).toHaveFocus()
  })
})

describe('Matching Rules: create a rule set', () => {
  async function openNew() {
    const rendered = renderApp('/matching-rules?merchantId=2&providerId=201', { as: 'admin' })
    await tableRows('Rule sets of the provider')
    await rendered.user.click(screen.getByRole('button', { name: 'New rule set' }))
    const dialog = within(await screen.findByRole('dialog', { name: 'New rule set' }))
    return { ...rendered, dialog }
  }

  it('starts empty and lands on the detail of the new set', async () => {
    const { user, dialog, router } = await openNew()

    expect(dialog.getByLabelText('Start from')).toHaveValue('')
    await user.type(dialog.getByLabelText('Name'), ' Provider C v2 ')
    await user.dblClick(dialog.getByRole('button', { name: 'Create rule set' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Provider C v2' }, OPENING)).toBeInTheDocument()
    expect(matchingRequests('create')).toHaveLength(1)
    expect(matchingRequests('create')[0]).toMatchObject({
      url: '/api/v1/providers/201/matching-rule-sets',
      body: { name: 'Provider C v2', sheetRules: [], columnRules: [] },
    })
    expect(router.state.location.pathname).toMatch(/^\/matching-rules\/\d+$/)
  })

  it('a copy of another set takes its stored rules, without ids', async () => {
    const { user, dialog } = await openNew()

    await user.type(dialog.getByLabelText('Name'), 'Provider C v2')
    await user.selectOptions(dialog.getByLabelText('Start from'), 'Copy of Provider C legacy')
    await user.click(dialog.getByRole('button', { name: 'Create rule set' }))

    await screen.findByRole('heading', { level: 1, name: 'Provider C v2' }, OPENING)
    expect(matchingRequests('create')[0]?.body).toEqual({ name: 'Provider C v2', ...stored(LEGACY) })
    expect(await tableRows('Sheet rules')).toHaveLength(4)
  })

  it('offers the inactive sets too, marked as such', async () => {
    const { dialog } = await openNew()
    const options = within(dialog.getByLabelText('Start from'))
      .getAllByRole('option')
      .map((o) => o.textContent)
    expect(options).toEqual(['Empty', 'Copy of Provider C legacy', 'Copy of Provider C retired (inactive)'])
  })

  it('a name in use goes next to the name and the dialog keeps what was written', async () => {
    respondNextMatching('create', { status: 409, code: 'rule_set_name_taken' })
    const { user, dialog } = await openNew()

    await user.type(dialog.getByLabelText('Name'), 'PROVIDER C LEGACY')
    await user.click(dialog.getByRole('button', { name: 'Create rule set' }))

    await waitFor(() =>
      expect(dialog.getByLabelText('Name')).toHaveAccessibleDescription(
        'A rule set of this provider already uses this name.',
      ),
    )
    expect(dialog.getByLabelText('Name')).toHaveValue('PROVIDER C LEGACY')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('without a provider chosen there is no New rule set', async () => {
    renderApp('/matching-rules', { as: 'admin' })
    await screen.findByText('Choose a merchant and a provider to see their rule sets.', {}, OPENING)
    expect(screen.queryByRole('button', { name: 'New rule set' })).not.toBeInTheDocument()
  })
})
