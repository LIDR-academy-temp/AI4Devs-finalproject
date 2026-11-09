import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AdminTicketsPage } from './AdminTicketsPage'

vi.mock('../features/auth/AuthContext', () => ({
  useAuth: () => ({ session: { token: 'tok' } }),
}))
vi.mock('../features/admin/tickets/useTicketsAdmin', () => ({
  useTicketsAdmin: vi.fn(),
}))
vi.mock('../features/tickets/useCatalogosTicket', () => ({
  useCatalogosTicket: vi.fn(),
}))
vi.mock('../features/admin/tickets/useTrabajadores', () => ({
  useTrabajadores: vi.fn(),
}))
vi.mock('../features/admin/usuarios/usePadronUsuarios', () => ({
  usePadronUsuarios: vi.fn(),
}))
vi.mock('../features/admin/tickets/useTicketAdminMutations', () => ({
  useTicketAdminMutations: vi.fn(),
}))
vi.mock('../features/tickets/useTicketDetalle', () => ({
  useTicketDetalle: vi.fn(),
}))
vi.mock('../features/tickets/useTicketComentarios', () => ({
  useTicketComentarios: vi.fn(),
}))
vi.mock('../shared/lib/apiClient', () => ({
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}))
const mockToastError = vi.fn()

vi.mock('../shared/toast/ToastContext', () => ({
  useToast: () => ({
    show: vi.fn(),
    success: vi.fn(),
    error: mockToastError,
    dismiss: vi.fn(),
  }),
}))

import { apiPatch } from '../shared/lib/apiClient'

const mockApiPatch = apiPatch as ReturnType<typeof vi.fn>

import { useTicketsAdmin } from '../features/admin/tickets/useTicketsAdmin'
import { useCatalogosTicket } from '../features/tickets/useCatalogosTicket'
import { useTrabajadores } from '../features/admin/tickets/useTrabajadores'
import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { useTicketAdminMutations } from '../features/admin/tickets/useTicketAdminMutations'
import { useTicketDetalle } from '../features/tickets/useTicketDetalle'
import { useTicketComentarios } from '../features/tickets/useTicketComentarios'

const mockUseTicketsAdmin = useTicketsAdmin as ReturnType<typeof vi.fn>
const mockUseCatalogos = useCatalogosTicket as ReturnType<typeof vi.fn>
const mockUseTrabajadores = useTrabajadores as ReturnType<typeof vi.fn>
const mockUsePadron = usePadronUsuarios as ReturnType<typeof vi.fn>
const mockUseMutations = useTicketAdminMutations as ReturnType<typeof vi.fn>
const mockUseTicketDetalle = useTicketDetalle as ReturnType<typeof vi.fn>
const mockUseTicketComentarios = useTicketComentarios as ReturnType<typeof vi.fn>

function renderAdminTickets() {
  return render(
    <MemoryRouter>
      <AdminTicketsPage />
    </MemoryRouter>,
  )
}

const ticket = {
  ticketId: 1,
  titulo: 'Fuga de agua',
  estado: 'Nuevo',
  prioridad: 'Alta',
  categoria: 'Plomería',
  solicitante: 'Ana López',
  fechaCreacion: '2026-01-01',
}

  beforeEach(() => {
    vi.clearAllMocks()
    mockToastError.mockClear()
  mockUseCatalogos.mockReturnValue({
    estados: [
      { id: 1, nombre: 'Nuevo' },
      { id: 2, nombre: 'En seguimiento' },
      { id: 3, nombre: 'Cerrado' },
    ],
    categorias: [{ id: 1, nombre: 'Plomería' }],
    prioridades: [
      { id: 1, nombre: 'Baja' },
      { id: 2, nombre: 'Media' },
      { id: 3, nombre: 'Alta' },
    ],
    loading: false,
    error: null,
  })
  mockUseTrabajadores.mockReturnValue([{ id: 5, nombre: 'Técnico' }])
  mockUsePadron.mockReturnValue({
    data: [{ usuarioId: 2, nombre: 'Residente', correo: 'r@test.com', perfil: 'Residente', bActivo: true }],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
  mockUseMutations.mockReturnValue({
    crear: vi.fn().mockResolvedValue({ ok: true }),
    actualizar: vi.fn().mockResolvedValue({ ok: true }),
    eliminar: vi.fn().mockResolvedValue({ ok: true }),
    busy: false,
  })
  mockUseTicketDetalle.mockReturnValue({
    detalle: {
      ticketId: 1,
      titulo: 'Fuga de agua',
      descripcion: 'Detalle',
      estado: 'Nuevo',
      prioridad: 'Alta',
      categoria: 'Plomería',
      fechaCreacion: '2026-01-01T00:00:00Z',
      fechaCierre: null,
    },
    loading: false,
    error: null,
    notFound: false,
    refetch: vi.fn(),
  })
  mockUseTicketComentarios.mockReturnValue({
    items: [],
    loading: false,
    error: null,
    posting: false,
    refetch: vi.fn(),
    publicar: vi.fn(),
  })
  mockUseTicketsAdmin.mockReturnValue({
    data: { items: [ticket], total: 1, pagina: 1 },
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
  mockApiPatch.mockResolvedValue({ status: 204 })
})

describe('AdminTicketsPage', () => {
  it('TC-TKT-K-5b: listado muestra etiqueta admin Abierto con tooltip catálogo', () => {
    renderAdminTickets()
    const badges = screen.getAllByText('Abierto')
    expect(badges.some((el) => el.getAttribute('title') === 'Nuevo')).toBe(true)
  })

  it('muestra título y lista de tickets', () => {
    renderAdminTickets()
    expect(screen.getByRole('heading', { name: 'Gestión de tickets' })).toBeInTheDocument()
    expect(screen.getAllByText('Fuga de agua').length).toBeGreaterThanOrEqual(1)
  })

  it('muestra panel de detalle al seleccionar ticket', async () => {
    const user = userEvent.setup()
    renderAdminTickets()
    await user.click(screen.getAllByLabelText(/ver ticket fuga de agua/i)[0])
    await waitFor(() => {
      expect(screen.getByText(/Solicitante: Ana López/i)).toBeInTheDocument()
    })
    expect(screen.getByText('→ En trabajo')).toBeInTheDocument()
  })

  it('cambiar estado llama apiPatch', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn()
    mockUseTicketsAdmin.mockReturnValue({
      data: { items: [ticket], total: 1, pagina: 1 },
      loading: false,
      error: null,
      refetch,
    })
    renderAdminTickets()
    await user.click(screen.getAllByLabelText(/ver ticket fuga de agua/i)[0])
    await user.click(screen.getByRole('button', { name: '→ En trabajo' }))
    await waitFor(() => {
      expect(mockApiPatch).toHaveBeenCalledWith('/TKT/Tickets/1/estado/2', undefined, 'tok')
    })
    expect(refetch).toHaveBeenCalled()
  })

  it('muestra carga y error', () => {
    mockUseTicketsAdmin.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    const { container, unmount } = renderAdminTickets()
    expect(container.querySelector('.placeholder-glow')).toBeTruthy()
    unmount()

    mockUseTicketsAdmin.mockReturnValue({
      data: null,
      loading: false,
      error: 'Error al cargar',
      refetch: vi.fn(),
    })
    renderAdminTickets()
    expect(mockToastError).toHaveBeenCalledWith('Error al cargar')
    expect(screen.queryByText('Error al cargar')).not.toBeInTheDocument()
  })

  it('muestra vacío si no hay tickets', () => {
    mockUseTicketsAdmin.mockReturnValue({
      data: { items: [], total: 0, pagina: 1 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    renderAdminTickets()
    expect(screen.getByText(/sin tickets/i)).toBeInTheDocument()
  })

  it('Nuevo ticket abre panel de alta', async () => {
    const user = userEvent.setup()
    renderAdminTickets()
    await user.click(screen.getByRole('button', { name: /nuevo ticket/i }))
    expect(screen.getByText('Residente solicitante')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear ticket' })).toBeInTheDocument()
  })

  it('Confirm delete invoca eliminar mutation', async () => {
    const user = userEvent.setup()
    const eliminar = vi.fn().mockResolvedValue({ ok: true })
    mockUseMutations.mockReturnValue({
      crear: vi.fn(),
      actualizar: vi.fn(),
      eliminar,
      busy: false,
    })
    renderAdminTickets()
    await user.click(screen.getAllByLabelText(/eliminar ticket fuga/i)[0])
    await user.click(screen.getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => {
      expect(eliminar).toHaveBeenCalledWith(1)
    })
  })
})
