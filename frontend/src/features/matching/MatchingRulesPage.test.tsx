import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { strings as layoutStrings } from '@/app/layout/strings'
import { tableRows, writeActions } from '@/test/matching-screens'
import { renderApp } from '@/test/render'
import { OPENING } from '@/test/validation-screens'

// Spec matching "Pantalla Matching Rules: acceso y conjuntos del proveedor" and "permisos de la pantalla"
// (web-admin-matching design D1–D3, D8). The rule sets come from the fake of test/msw/matching.ts.
const PROVIDER_C = '/matching-rules?merchantId=2&providerId=201'

describe('Matching Rules: access and rule sets of the provider', () => {
  it('lists the rule sets of Provider C, active and inactive, with their accounts and a link to each', async () => {
    renderApp(PROVIDER_C, { as: 'analyst' })

    expect(await tableRows('Rule sets of the provider')).toEqual([
      ['Provider C legacy', 'active', 'ProviderC-Alt'],
      ['Provider C retired', 'inactive', 'No accounts'],
    ])
    expect(screen.getByRole('link', { name: 'Provider C legacy' })).toHaveAttribute('href', '/matching-rules/3')
    expect(screen.getByRole('link', { name: 'Provider C retired' })).toHaveAttribute('href', '/matching-rules/4')
  })

  it('always offers the global defaults', async () => {
    renderApp(PROVIDER_C, { as: 'analyst' })
    expect(await screen.findByRole('link', { name: 'Global defaults' }, OPENING)).toHaveAttribute(
      'href',
      '/matching-rules/global',
    )
  })

  it('a provider without rule sets says its accounts use the global defaults', async () => {
    renderApp('/matching-rules?merchantId=1&providerId=101', { as: 'viewer' })

    expect(
      await screen.findByText('No rule sets for this provider. Its accounts use the global defaults.', {}, OPENING),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Global defaults' })).toBeInTheDocument()
  })

  it('a merchant or provider outside the scope is not available and lists nothing', async () => {
    renderApp(PROVIDER_C, { as: 'viewer' })

    expect(await screen.findByText('This merchant or provider is not available.', {}, OPENING)).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Rule sets of the provider' })).not.toBeInTheDocument()
  })

  it('before a provider is chosen, it asks for one', async () => {
    renderApp('/matching-rules', { as: 'analyst' })
    expect(
      await screen.findByText('Choose a merchant and a provider to see their rule sets.', {}, OPENING),
    ).toBeInTheDocument()
  })

  it.each(['/matching-rules?merchantId=1', '/matching-rules/global', '/matching-rules/3'])(
    'shows Dashboard › Administration › Matching Rules in %s',
    async (path) => {
      renderApp(path, { as: 'analyst' })
      const crumbs = within(await screen.findByRole('navigation', { name: layoutStrings.breadcrumb }))
      expect(crumbs.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
      expect(crumbs.getByText('Administration')).toBeInTheDocument()
      expect(crumbs.getByText('Matching Rules')).toHaveAttribute('aria-current', 'page')
    },
  )
})

describe('Matching Rules: permissions of the list', () => {
  it('analyst does not see New rule set', async () => {
    renderApp(PROVIDER_C, { as: 'analyst' })
    await tableRows('Rule sets of the provider')
    expect(writeActions()).toEqual([])
  })

  it('admin sees New rule set once a provider is chosen', async () => {
    renderApp(PROVIDER_C, { as: 'admin' })
    await tableRows('Rule sets of the provider')
    expect(writeActions()).toEqual(['New rule set'])
  })
})
