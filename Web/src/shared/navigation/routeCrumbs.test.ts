import { describe, expect, it } from 'vitest'
import { buildRouteCrumbs, getModuleTitle, resolvePathLabel } from './routeCrumbs'

const NAV = [
  { path: '/tickets', label: 'Mis tickets' },
  { path: '/tickets/nuevo', label: 'Nuevo ticket' },
  { path: '/admin/tickets', label: 'Tickets admin' },
]

describe('routeCrumbs', () => {
  it('resuelve label por prefijo más largo', () => {
    expect(resolvePathLabel('/tickets/nuevo', NAV)).toBe('Nuevo ticket')
  })

  it('construye crumbs con detalle numérico', () => {
    const crumbs = buildRouteCrumbs('/anuncios/42', [
      { path: '/anuncios', label: 'Anuncios' },
    ])
    expect(crumbs).toEqual([
      { label: 'Inicio', path: '/' },
      { label: 'Anuncios', path: '/anuncios' },
      { label: 'Detalle', path: '/anuncios/42' },
    ])
  })

  it('getModuleTitle devuelve último segmento', () => {
    const crumbs = buildRouteCrumbs('/admin/tickets', NAV)
    expect(getModuleTitle(crumbs)).toBe('Tickets admin')
  })
})
