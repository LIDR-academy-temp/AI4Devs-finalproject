import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NuevoTicketPage } from './NuevoTicketPage'

vi.mock('../features/tickets/useCatalogosTicket', () => ({
  useCatalogosTicket: vi.fn(),
}))
vi.mock('../features/tickets/TicketForm', () => ({
  TicketForm: () => <div data-testid="ticket-form">TicketForm</div>,
}))

import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'

const mockUseCatalogos = useCatalogosTicket as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <NuevoTicketPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseCatalogos.mockReturnValue({
    categorias: [],
    estados: [],
    loading: false,
    error: null,
  })
})

describe('NuevoTicketPage', () => {
  it('muestra título y enlace de regreso', () => {
    renderPage()
    expect(screen.getByText('Nuevo ticket')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Mis tickets/i })).toHaveAttribute('href', '/tickets')
  })

  it('muestra carga de catálogos', () => {
    mockUseCatalogos.mockReturnValue({
      categorias: [],
      estados: [],
      loading: true,
      error: null,
    })
    renderPage()
    expect(screen.getByText(/Cargando catálogos/i)).toBeInTheDocument()
  })

  it('muestra error de catálogos vía toast', async () => {
    mockUseCatalogos.mockReturnValue({
      categorias: [],
      estados: [],
      loading: false,
      error: 'Catálogo no disponible',
    })
    renderPage()
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    expect(toast.error).toHaveBeenCalledWith('Catálogo no disponible')
    expect(screen.queryByTestId('ticket-form')).not.toBeInTheDocument()
  })

  it('renderiza formulario cuando catálogos listos', () => {
    mockUseCatalogos.mockReturnValue({
      categorias: [{ id: 1, nombre: 'Mantenimiento' }],
      estados: [],
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getByTestId('ticket-form')).toBeInTheDocument()
  })
})
