import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { navGroupsForPerfil, navItemsForPerfil } from '../navigation/appNavigation'
import { AppSidebar } from './AppSidebar'

const adminGroups = navGroupsForPerfil('Administrador')
const adminItems = navItemsForPerfil('Administrador')

vi.mock('../../features/navegacion/NavegacionContext', () => ({
  useNavegacion: () => ({
    loading: false,
    source: 'static' as const,
    groups: adminGroups,
    items: adminItems,
    allowedPaths: adminItems.map((i) => i.path),
    tree: [],
    error: null,
    refetch: async () => {},
  }),
}))

describe('AppSidebar', () => {
  it('muestra Residentes para administrador', () => {
    render(
      <MemoryRouter>
        <AppSidebar />
      </MemoryRouter>,
    )
    // El link puede tener el texto combinado con el ícono SVG;
    // usamos getByRole con name parcial o buscamos por texto en el DOM
    const link = screen.getByRole('link', { name: /Residentes/i })
    expect(link).toBeInTheDocument()
  })

  it('muestra Casas para administrador', () => {
    render(<MemoryRouter><AppSidebar /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /Casas/i })).toBeInTheDocument()
  })

  it('Encuestas es un enlace implementado sin "Próximamente"', () => {
    render(<MemoryRouter><AppSidebar /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /Encuestas/i })
    expect(link).toBeInTheDocument()
    expect(link).not.toHaveAttribute('title', 'Próximamente')
  })

  it('muestra encabezados de grupo para admin', () => {
    render(<MemoryRouter><AppSidebar /></MemoryRouter>)
    expect(screen.getByText('Gestión')).toBeInTheDocument()
    expect(screen.getByText('Comunidad')).toBeInTheDocument()
    expect(screen.getByText('Registro')).toBeInTheDocument()
  })

  it('no muestra items de residente para administrador', () => {
    render(<MemoryRouter><AppSidebar /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: /Mis Tickets/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Estado de cuenta/i })).not.toBeInTheDocument()
  })
})
