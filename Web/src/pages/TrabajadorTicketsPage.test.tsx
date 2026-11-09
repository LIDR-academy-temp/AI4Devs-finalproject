import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TrabajadorTicketsPage } from './TrabajadorTicketsPage'

vi.mock('../features/tickets/useCatalogosTicket', () => ({
  useCatalogosTicket: () => ({ estados: [], loading: false, error: null }),
}))
vi.mock('../features/tickets/useTicketsAsignados', () => ({
  useTicketsAsignados: () => ({ data: { items: [] }, loading: false, error: null, refetch: vi.fn() }),
}))
vi.mock('../features/tickets/TicketsList', () => ({
  TicketsList: () => null,
}))

describe('TrabajadorTicketsPage', () => {
  it('renderiza encabezado Tickets asignados', () => {
    render(
      <MemoryRouter>
        <TrabajadorTicketsPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Tickets asignados' })).toBeInTheDocument()
  })
})
