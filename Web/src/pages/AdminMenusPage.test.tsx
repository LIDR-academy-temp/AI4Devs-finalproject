import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AdminMenusPage } from './AdminMenusPage'

vi.mock('../features/navegacion/useMenusAdmin', () => ({
  useMenusAdmin: () => ({
    menus: [
      {
        menuId: 1,
        titulo: 'Tickets',
        ruta: '/admin/tickets',
        icono: 'ticket',
        orden: 1,
        padreMenuId: null,
        eliminado: false,
      },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

vi.mock('../features/navegacion/NavegacionContext', () => ({
  useNavegacion: () => ({ refetch: vi.fn() }),
}))

describe('AdminMenusPage', () => {
  it('muestra árbol de menús', () => {
    render(<AdminMenusPage />)
    expect(screen.getByRole('heading', { name: 'Menús' })).toBeInTheDocument()
    expect(screen.getAllByText('Tickets').length).toBeGreaterThanOrEqual(1)
  })
})
