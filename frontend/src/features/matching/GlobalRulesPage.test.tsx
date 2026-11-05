import { screen, within } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { describe, expect, it } from 'vitest'
import { tableRows, writeActions } from '@/test/matching-screens'
import type { UserName } from '@/test/msw/fixtures'
import { withScopedAdmin } from '@/test/msw/matching'
import { server } from '@/test/msw/server'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec matching "Pantalla Matching Rules: reglas globales", "filas a ignorar de solo lectura" and "permisos de la
// pantalla" (web-admin-matching design D3, D8).
async function openGlobals(as: UserName) {
  const rendered = renderApp('/matching-rules/global', { as })
  await screen.findByRole('heading', { level: 1, name: 'Global defaults' }, OPENING)
  await tableRows('Sheet rules')
  return rendered
}

describe('Matching Rules: global rules', () => {
  it('shows the template sheets and columns, and the aliases with their status', async () => {
    await openGlobals('viewer')

    const sheets = await tableRows('Sheet rules')
    expect(sheets[0]).toEqual(['APP', 'no', 'transactions', 'E', 'Successful', '10', 'yes'])
    expect(sheets.find((r) => r[0] === 'RR')).toEqual(['RR', 'no', 'transactions', 'R', '—', '10', 'yes'])
    expect(sheets.find((r) => r[0] === 'Other Fees')).toEqual(['Other Fees', 'no', 'batch_fees', '—', '—', '10', 'yes'])
    expect((await tableRows('Column rules'))[0]).toEqual(['Any sheet', 'ID', 'no', 'transactionId', '10', 'yes'])

    const aliases = await tableRows('Status aliases')
    expect(aliases.find((r) => r[0] === 'CHB 2')).toEqual(['CHB 2', 'Chargeback', 'excluded', 'legacy'])
    expect(aliases.find((r) => r[0] === 'Successful')).toEqual(['Successful', 'Successful', 'counted', '—'])
  })

  it('shows the rows to ignore read-only, with the note of #120', async () => {
    await openGlobals('viewer')
    const rows = within(screen.getByRole('region', { name: 'Rows to ignore' }))
    expect(within(rows.getByRole('table')).getByText('transactionId:empty')).toBeInTheDocument()
    expect(rows.getByText('Not applied yet (#120).')).toBeInTheDocument()
    expect(rows.queryByRole('button')).not.toBeInTheDocument()
  })

  it('a failed read offers Retry', async () => {
    server.use(http.get('*/api/v1/matching-rules/global', () => HttpResponse.json({}, { status: 500 }), { once: true }))
    const { user } = renderApp('/matching-rules/global', { as: 'viewer' })

    expect(await screen.findByText('Could not load the global rules.', {}, OPENING)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect((await tableRows('Sheet rules'))[0]?.[0]).toBe('APP')
  })
})

describe('Matching Rules: permissions of the global rules', () => {
  it.each(['viewer', 'analyst'] as const)('%s reads them without Edit rules', async (as) => {
    await openGlobals(as)
    expect(writeActions()).toEqual([])
  })

  it('admin with the scope all sees Edit rules', async () => {
    await openGlobals('admin')
    expect(writeActions()).toEqual(['Edit rules'])
  })

  it('an admin whose scope is assigned reads them without Edit rules', async () => {
    withScopedAdmin()
    await openGlobals('admin')
    expect(writeActions()).toEqual([])
  })
})
