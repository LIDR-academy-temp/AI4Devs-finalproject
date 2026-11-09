import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TicketsPage } from './TicketsPage'

vi.mock('../features/tickets/useCatalogosTicket', () => ({
  useCatalogosTicket: vi.fn(),
}))
vi.mock('../features/tickets/useMisTickets', () => ({
  useMisTickets: vi.fn(),
}))

import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { useMisTickets } from '../features/tickets/useMisTickets'

const mockUseCatalogos = useCatalogosTicket as ReturnType<typeof vi.fn>
const mockUseMisTickets = useMisTickets as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <TicketsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCatalogos.mockReturnValue({
    estados: [{ id: 1, nombre: 'Nuevo' }],
    categorias: [],
    loading: false,
    error: null,
  })
  mockUseMisTickets.mockReturnValue({
    data: { items: [] },
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('TicketsPage', () => {
  it('muestra título y enlace nuevo ticket', () => {
    renderPage()
    expect(screen.getByText('Mis tickets')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nuevo ticket/i })).toHaveAttribute('href', '/tickets/nuevo')
  })

  it('muestra estado vacío', () => {
    renderPage()
    expect(screen.getByText(/No has reportado incidencias/i)).toBeInTheDocument()
  })

  it('enlaza fila al detalle', () => {
    mockUseMisTickets.mockReturnValue({
      data: {
        items: [
          {
            ticketId: 1,
            titulo: 'Lámpara fundida',
            estado: 'Nuevo',
            prioridad: 'Media',
            categoria: null,
            fechaCreacion: '2026-10-19T10:00:00Z',
          },
        ],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage()
    expect(screen.getByRole('link', { name: /Lámpara fundida/i })).toHaveAttribute('href', '/tickets/1')
  })

  it('reintenta tras error', () => {
    const refetch = vi.fn()
    mockUseMisTickets.mockReturnValue({
      data: null,
      loading: false,
      error: 'Error de red',
      refetch,
    })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(refetch).toHaveBeenCalled()
  })
})
