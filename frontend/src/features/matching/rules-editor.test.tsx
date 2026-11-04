import { screen, waitFor, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { tableRows } from '@/test/matching-screens'
import type { UserName } from '@/test/msw/fixtures'
import { matchingRequests, respondNextMatching } from '@/test/msw/matching'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec matching "Pantalla Matching Rules: modo edición", "avisos del formulario", "errores del API" and "filas a
// ignorar de solo lectura" (web-admin-matching design D4–D6). The body is always the whole document built from the
// last answer; the browser applies only the *Input schemas and the fields of each kind of sheet.

async function editLegacy(as: UserName = 'admin') {
  const rendered = renderApp('/matching-rules/3', { as })
  await screen.findByRole('heading', { level: 1, name: 'Provider C legacy' }, OPENING)
  await tableRows('Sheet rules')
  await rendered.user.click(screen.getByRole('button', { name: 'Edit rules' }))
  await screen.findByRole('button', { name: 'Save' })
  return rendered
}

async function editGlobals() {
  const rendered = renderApp('/matching-rules/global', { as: 'admin' })
  await screen.findByRole('heading', { level: 1, name: 'Global defaults' }, OPENING)
  await tableRows('Sheet rules')
  await rendered.user.click(screen.getByRole('button', { name: 'Edit rules' }))
  await screen.findByRole('button', { name: 'Save' })
  return rendered
}

const field = (label: string) => screen.getByLabelText(label)
const lastPut = () =>
  matchingRequests('put').at(-1)?.body as Record<string, unknown> & {
    sheetRules: Record<string, unknown>[]
    columnRules: Record<string, unknown>[]
  }
const patterns = (body: { sheetRules: Record<string, unknown>[] }) => body.sheetRules.map((r) => r.sheetPattern)

const LEGACY_COLUMNS = [
  {
    sheetPattern: null,
    columnPattern: 'Merchant Order No#',
    isRegex: false,
    targetField: 'transactionId',
    priority: 5,
    isActive: true,
  },
  {
    sheetPattern: null,
    columnPattern: 'Order Status',
    isRegex: false,
    targetField: 'status',
    priority: 5,
    isActive: true,
  },
  {
    sheetPattern: null,
    columnPattern: 'Amount USD',
    isRegex: false,
    targetField: 'amount',
    priority: 5,
    isActive: true,
  },
]

describe('Matching Rules: edit mode', () => {
  it('changing a sheet rule sends the whole document once, without ids, and leaves edit mode', async () => {
    const { user } = await editLegacy()

    await user.selectOptions(field('Status of sheet rule 3'), 'No fixed status')
    await user.dblClick(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument())
    expect(matchingRequests('put')).toHaveLength(1)
    expect(lastPut()).toEqual({
      name: 'Provider C legacy',
      isActive: true,
      sheetRules: [
        {
          sheetPattern: 'TRX',
          isRegex: false,
          kind: 'transactions',
          cycle: 'E',
          statusId: null,
          priority: 10,
          isActive: true,
        },
        {
          sheetPattern: 'CB',
          isRegex: false,
          kind: 'transactions',
          cycle: 'I',
          statusId: null,
          priority: 10,
          isActive: true,
        },
        {
          sheetPattern: 'Fail',
          isRegex: false,
          kind: 'transactions',
          cycle: 'E',
          statusId: null,
          priority: 10,
          isActive: true,
        },
        {
          sheetPattern: 'Summary',
          isRegex: false,
          kind: 'ignore',
          cycle: null,
          statusId: null,
          priority: 10,
          isActive: true,
        },
      ],
      columnRules: LEGACY_COLUMNS,
    })
    expect((await tableRows('Sheet rules'))[2]).toEqual(['Fail', 'no', 'transactions', 'E', '—', '10', 'yes'])
  })

  it('Move up changes the order of the body, and then the screen shows the order of the answer', async () => {
    const { user } = await editLegacy()

    await user.clear(field('Priority of sheet rule 2'))
    await user.type(field('Priority of sheet rule 2'), '50')
    await user.click(screen.getByRole('button', { name: 'Move up sheet rule CB' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(1))
    expect(patterns(lastPut())).toEqual(['CB', 'TRX', 'Fail', 'Summary'])
    // The API answers by priority: CB (50) goes after the others (10), and the screen does not reorder by itself.
    await waitFor(async () =>
      expect((await tableRows('Sheet rules')).map((r) => r[0])).toEqual(['TRX', 'Fail', 'Summary', 'CB']),
    )
  })

  it('says that the order breaks ties at equal priority', async () => {
    await editLegacy()
    expect(screen.getByText('Order breaks ties at equal priority.')).toBeInTheDocument()
  })

  it('Move up is disabled on the first rule and Move down on the last', async () => {
    await editLegacy()
    expect(screen.getByRole('button', { name: 'Move up sheet rule TRX' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move down sheet rule Summary' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Move down sheet rule TRX' })).toBeEnabled()
  })

  it('after a move the focus stays on the moved rule', async () => {
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Move up sheet rule Fail' }))
    expect(screen.getByRole('button', { name: 'Move up sheet rule Fail' })).toHaveFocus()
    expect(field('Pattern of sheet rule 2')).toHaveValue('Fail')

    // At the top, Move up is disabled: the focus goes to Move down of the same rule.
    await user.click(screen.getByRole('button', { name: 'Move up sheet rule Fail' }))
    expect(screen.getByRole('button', { name: 'Move down sheet rule Fail' })).toHaveFocus()
  })

  it('Add column rule adds a row with the focus on its pattern', async () => {
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Add column rule' }))

    expect(field('Pattern of column rule 4')).toHaveFocus()
    expect(field('Sheet of column rule 4')).toHaveValue('')
    expect(field('Priority of column rule 4')).toHaveValue('100')
  })

  it('Remove takes the rule out of the body', async () => {
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Remove sheet rule Summary' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(1))
    expect(patterns(lastPut())).toEqual(['TRX', 'CB', 'Fail'])
  })

  it('sends the reason trimmed', async () => {
    const { user } = await editLegacy()

    await user.type(field('Reason (optional)'), '  New column layout  ')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(1))
    expect(lastPut().reason).toBe('New column layout')
  })

  it('Cancel sends nothing and shows the stored rules again', async () => {
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Add column rule' }))
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await tableRows('Column rules')).toHaveLength(3)
    expect(matchingRequests('put')).toEqual([])
  })

  it('a second edit builds its body from the last answer, without the ids of the first one', async () => {
    const { user } = await editLegacy()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Edit rules' }))
    await user.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(2))
    expect(JSON.stringify(lastPut())).not.toMatch(/RuleId/)
    expect(lastPut().columnRules).toEqual(LEGACY_COLUMNS)
  })

  it('a new alias of the global rules is sent with the rules, without the rows to ignore nor the statuses', async () => {
    const { user } = await editGlobals()

    await user.click(screen.getByRole('button', { name: 'Add alias' }))
    await user.type(field('Text of alias 7'), 'Approved OK')
    await user.selectOptions(field('Status of alias 7'), 'Successful')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('putGlobals')).toHaveLength(1))
    const body = matchingRequests('putGlobals')[0]?.body as Record<string, unknown> & { statusAliases: unknown[] }
    expect(Object.keys(body).sort()).toEqual(['columnRules', 'sheetRules', 'statusAliases'])
    expect(body.statusAliases.at(-1)).toEqual({
      alias: 'Approved OK',
      statusId: 2,
      excludeAmount: false,
      isLegacy: false,
    })
  })

  it('without the catalog of statuses, Edit rules waits for it', async () => {
    server.use(http.get('*/api/v1/matching-rules/global', () => HttpResponse.json({}, { status: 500 })))
    renderApp('/matching-rules/3', { as: 'admin' })
    await tableRows('Sheet rules')

    expect(screen.getByRole('button', { name: 'Edit rules' })).toBeDisabled()
    expect(screen.getByText('Statuses are not available.')).toBeInTheDocument()
  })
})

describe('Matching Rules: rows to ignore in edit mode', () => {
  it('stay read-only and never travel in the body', async () => {
    const { user } = await editGlobals()

    const rows = within(screen.getByRole('region', { name: 'Rows to ignore' }))
    expect(rows.getByText('transactionId:empty')).toBeInTheDocument()
    expect(rows.getByText('Not applied yet (#120).')).toBeInTheDocument()
    expect(rows.queryByRole('button')).not.toBeInTheDocument()
    expect(rows.queryByRole('textbox')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(matchingRequests('putGlobals')).toHaveLength(1))
    expect(matchingRequests('putGlobals')[0]?.body).not.toHaveProperty('rowIgnoreRules')
  })
})

describe('Matching Rules: warnings of the form', () => {
  it('a blank pattern is shown next to it, with the focus, and nothing is sent', async () => {
    const { user } = await editLegacy()

    await user.clear(field('Pattern of sheet rule 2'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Enter a pattern.')).toBeInTheDocument()
    expect(field('Pattern of sheet rule 2')).toHaveFocus()
    expect(field('Pattern of sheet rule 2')).toHaveAttribute('aria-invalid', 'true')
    expect(field('Pattern of sheet rule 2')).toHaveAccessibleDescription('Enter a pattern.')
    expect(matchingRequests('put')).toEqual([])
  })

  it('a batch_fees sheet has no cycle nor status', async () => {
    const { user } = await editLegacy()

    await user.selectOptions(field('Kind of sheet rule 3'), 'batch_fees')
    expect(screen.queryByLabelText('Cycle of sheet rule 3')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Status of sheet rule 3')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(1))
    expect(lastPut().sheetRules[2]).toMatchObject({ kind: 'batch_fees', cycle: null, statusId: null })
  })

  it('a sheet that becomes transactions gets cycle E', async () => {
    const { user } = await editLegacy()

    await user.selectOptions(field('Kind of sheet rule 4'), 'transactions')
    expect(field('Cycle of sheet rule 4')).toHaveValue('E')
  })

  it('cycle R has no status', async () => {
    const { user } = await editLegacy()

    await user.selectOptions(field('Cycle of sheet rule 3'), 'R')
    expect(screen.queryByLabelText('Status of sheet rule 3')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(1))
    expect(lastPut().sheetRules[2]).toMatchObject({ cycle: 'R', statusId: null })
  })

  it('a regex that does not compile and a status of another cycle are sent: the API decides', async () => {
    const { user } = await editLegacy()

    await user.clear(field('Pattern of column rule 1'))
    await user.type(field('Pattern of column rule 1'), '^amount(')
    await user.click(field('Regex of column rule 1'))
    await user.clear(field('Pattern of sheet rule 1'))
    await user.type(field('Pattern of sheet rule 1'), 'APP')
    await user.selectOptions(field('Status of sheet rule 1'), 'Chargeback')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(matchingRequests('put')).toHaveLength(1))
    expect(lastPut().columnRules[0]).toMatchObject({ columnPattern: '^amount(', isRegex: true })
    expect(lastPut().sheetRules[0]).toMatchObject({ sheetPattern: 'APP', cycle: 'E', statusId: 4 })
  })
})

describe('Matching Rules: errors of the API', () => {
  it('a 400 on a field of a row goes next to it with the message of the API; values and order stay', async () => {
    respondNextMatching('put', {
      status: 400,
      code: 'validation_error',
      message: 'Chargeback is a cycle I status',
      details: { field: 'sheetRules[2].statusId' },
    })
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Move up sheet rule Fail' }))
    await user.selectOptions(field('Status of sheet rule 3'), 'Chargeback')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Chargeback is a cycle I status')).toBeInTheDocument()
    expect(field('Status of sheet rule 3')).toHaveFocus()
    expect(field('Status of sheet rule 3')).toHaveAccessibleDescription('Chargeback is a cycle I status')
    expect([1, 2, 3, 4].map((n) => (field(`Pattern of sheet rule ${n}`) as HTMLInputElement).value)).toEqual([
      'TRX',
      'Fail',
      'CB',
      'Summary',
    ])
  })

  it('a regex the API rejects goes next to the pattern of that column', async () => {
    respondNextMatching('put', {
      status: 400,
      code: 'validation_error',
      message: 'Invalid regular expression',
      details: { field: 'columnRules[0].columnPattern' },
    })
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Invalid regular expression')).toBeInTheDocument()
    expect(field('Pattern of column rule 1')).toHaveAccessibleDescription('Invalid regular expression')
  })

  it.each([
    ['a schema 400', { status: 400, code: 'validation_error', details: [{ path: 'sheetRules.0', message: 'x' }] }],
    [
      'a 400 on a row the form does not have',
      { status: 400, code: 'validation_error', details: { field: 'sheetRules[9].cycle' } },
    ],
  ])('%s is a general message and the form stays as it was', async (_case, scripted) => {
    respondNextMatching('put', scripted)
    const { user } = await editLegacy()

    await user.clear(field('Pattern of sheet rule 1'))
    await user.type(field('Pattern of sheet rule 1'), 'TRX2')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The rules were not saved. Check the values and try again.',
    )
    expect(field('Pattern of sheet rule 1')).toHaveValue('TRX2')
  })

  it('a network error says the server was not reached and keeps what was written', async () => {
    server.use(http.put('*/api/v1/matching-rule-sets/3', () => HttpResponse.error()))
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Add sheet rule' }))
    await user.type(field('Pattern of sheet rule 5'), 'Extra')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not reach the server. Check your connection and try again.')
    expect(alert).toHaveFocus()
    expect(field('Pattern of sheet rule 5')).toHaveValue('Extra')
  })

  it('a 403 says the permission is missing and the form stays open', async () => {
    respondNextMatching('put', { status: 403, code: 'forbidden' })
    const { user } = await editLegacy()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("You don't have permission to change these rules.")
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})
