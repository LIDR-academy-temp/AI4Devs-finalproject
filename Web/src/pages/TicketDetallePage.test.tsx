import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { TicketDetallePage } from './TicketDetallePage'
import { useTicketDetalle } from '../features/tickets/useTicketDetalle'
import { useTicketComentarios } from '../features/tickets/useTicketComentarios'

vi.mock('../features/tickets/useTicketDetalle', () => ({
  useTicketDetalle: vi.fn(),
}))
vi.mock('../features/tickets/useTicketComentarios', () => ({
  useTicketComentarios: vi.fn(),
}))
vi.mock('../shared/toast/ToastContext', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))

const mockDetalle = vi.mocked(useTicketDetalle)
const mockComentarios = vi.mocked(useTicketComentarios)

function renderPage(path = '/tickets/1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tickets/:ticketId" element={<TicketDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDetalle.mockReturnValue({
    detalle: {
      ticketId: 1,
      titulo: 'Fuga',
      descripcion: 'En baño',
      estado: 'Nuevo',
      prioridad: 'Alta',
      categoria: 'Plomería',
      fechaCreacion: '2026-10-01T12:00:00Z',
      fechaCierre: null,
    },
    loading: false,
    error: null,
    notFound: false,
    refetch: vi.fn(),
  })
  mockComentarios.mockReturnValue({
    items: [],
    loading: false,
    error: null,
    posting: false,
    refetch: vi.fn(),
    publicar: vi.fn().mockResolvedValue({ ok: true }),
  })
})

describe('TicketDetallePage', () => {
  it('publica comentario', async () => {
    const publicar = vi.fn().mockResolvedValue({ ok: true })
    mockComentarios.mockReturnValue({
      items: [],
      loading: false,
      error: null,
      posting: false,
      refetch: vi.fn(),
      publicar,
    })
    renderPage()
    fireEvent.change(screen.getByLabelText(/Nuevo comentario/i), {
      target: { value: 'Gracias por el reporte' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }))
    await waitFor(() => {
      expect(publicar).toHaveBeenCalledWith({
        comentario: 'Gracias por el reporte',
        esInterno: false,
      })
    })
  })
})
