import '../test/stubToast'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminAnunciosPage } from './AdminAnunciosPage'

vi.mock('../features/anuncios/useAnuncios', () => ({
  useAnunciosAdmin: vi.fn(),
  useTiposAnuncio: vi.fn(),
  crearAnuncio: vi.fn(),
  actualizarAnuncio: vi.fn(),
  eliminarAnuncio: vi.fn(),
}))

import {
  useAnunciosAdmin,
  useTiposAnuncio,
  eliminarAnuncio,
} from '../features/anuncios/useAnuncios'

const mockUseAnunciosAdmin = useAnunciosAdmin as ReturnType<typeof vi.fn>
const mockUseTiposAnuncio = useTiposAnuncio as ReturnType<typeof vi.fn>
const mockEliminar = eliminarAnuncio as ReturnType<typeof vi.fn>

const tipos = [{ tipoAnuncioId: 1, tipoAnuncio: 'General' }]

const anuncio = {
  anuncioId: 1,
  titulo: 'Aviso importante',
  contenido: 'Texto',
  fechaPublicacion: '2026-10-19T12:00:00Z',
  tipoAnuncio: 'General',
  vigenteHasta: null,
  visto: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseTiposAnuncio.mockReturnValue(tipos)
  mockUseAnunciosAdmin.mockReturnValue({
    data: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
  mockEliminar.mockResolvedValue({ status: 204 })
})

describe('AdminAnunciosPage', () => {
  it('muestra título y estado de carga', () => {
    mockUseAnunciosAdmin.mockReturnValue({
      data: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    const { container } = render(<AdminAnunciosPage />)
    expect(screen.getByRole('heading', { name: 'Anuncios' })).toBeInTheDocument()
    expect(container.querySelector('.placeholder-glow')).toBeTruthy()
  })

  it('muestra fila en tabla cuando hay datos', () => {
    mockUseAnunciosAdmin.mockReturnValue({
      data: [anuncio],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<AdminAnunciosPage />)
    expect(screen.getAllByText('Aviso importante').length).toBeGreaterThanOrEqual(1)
  })

  it('abre panel lateral al pulsar Nuevo anuncio', async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminAnunciosPage />)
    await user.click(screen.getByRole('button', { name: /nuevo anuncio/i }))
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nuevo anuncio' })).toBeInTheDocument()
  })

  it('avisa si no hay tipos en catálogo', () => {
    mockUseTiposAnuncio.mockReturnValue([])
    render(<AdminAnunciosPage />)
    expect(screen.getByText(/Sin tipos en catálogo/i)).toBeInTheDocument()
  })

  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockUseAnunciosAdmin.mockReturnValue({
      data: [],
      loading: false,
      error: 'Error al cargar anuncios',
      refetch: vi.fn(),
    })
    render(<AdminAnunciosPage />)
    expect(toast.error).toHaveBeenCalledWith('Error al cargar anuncios')
  })

  it('elimina tras ConfirmDialog', async () => {
    const user = userEvent.setup()
    mockUseAnunciosAdmin.mockReturnValue({
      data: [anuncio],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<AdminAnunciosPage />)
    await user.click(screen.getByLabelText(/eliminar aviso importante/i))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => {
      expect(mockEliminar).toHaveBeenCalledWith(1)
    })
  })
})
