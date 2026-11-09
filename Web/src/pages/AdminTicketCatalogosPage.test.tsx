import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminTicketCatalogosPage } from './AdminTicketCatalogosPage'

vi.mock('../features/admin/tickets/catalogos/useTicketCatalogosAdmin', () => ({
  useTicketCatalogosAdmin: vi.fn(),
}))

import { useTicketCatalogosAdmin } from '../features/admin/tickets/catalogos/useTicketCatalogosAdmin'

const mockHook = useTicketCatalogosAdmin as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminTicketCatalogosPage />
    </MemoryRouter>,
  )
}

describe('AdminTicketCatalogosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHook.mockReturnValue({
      categorias: [{ id: 1, nombre: 'Plomería' }],
      prioridades: [{ id: 1, nombre: 'Alta', orden: 2 }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza título Catálogos de tickets', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Catálogos de tickets' })).toBeInTheDocument()
  })

  it('TC-TKT-K-5: tab Estados muestra 4 estados y transiciones', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Estados' }))
    expect(screen.getByRole('columnheader', { name: 'Estado (catálogo)' })).toBeInTheDocument()
    expect(screen.getAllByText('Nuevo').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('En seguimiento').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Resuelto').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Cerrado').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('En trabajo').length).toBeGreaterThanOrEqual(1)
  })

  it('lista categoría en tab Categorías', () => {
    renderPage()
    expect(screen.getByText('Plomería')).toBeInTheDocument()
  })
})
