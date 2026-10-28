import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { EncuestasPage } from './EncuestasPage'

vi.mock('../features/encuestas/useEncuestasActivas', () => ({
  useEncuestasActivas: vi.fn(),
}))

import { useEncuestasActivas } from '../features/encuestas/useEncuestasActivas'

const mockUseEncuestas = useEncuestasActivas as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <EncuestasPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseEncuestas.mockReturnValue({
    encuestas: [],
    loading: false,
    error: null,
  })
})

describe('EncuestasPage', () => {
  it('muestra estado vacío', () => {
    renderPage()
    expect(screen.getByText('Encuestas activas')).toBeInTheDocument()
    expect(screen.getByText(/No hay encuestas activas/i)).toBeInTheDocument()
  })

  it('muestra carga y error', async () => {
    mockUseEncuestas.mockReturnValue({
      encuestas: [],
      loading: true,
      error: null,
    })
    const { unmount } = renderPage()
    expect(screen.getByText(/Cargando encuestas/i)).toBeInTheDocument()
    unmount()

    mockUseEncuestas.mockReturnValue({
      encuestas: [],
      loading: false,
      error: 'No disponible',
      refetch: vi.fn(),
    })
    renderPage()
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    expect(toast.error).toHaveBeenCalledWith('No disponible')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('muestra enlace responder', () => {
    mockUseEncuestas.mockReturnValue({
      encuestas: [
        {
          encuestaId: 1,
          titulo: 'Satisfacción',
          descripcion: 'Cuéntanos',
          fechaFin: '2026-12-31T00:00:00Z',
          yaParticipo: false,
        },
      ],
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getByText('Satisfacción')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Responder' })).toHaveAttribute('href', '/encuestas/1')
  })

  it('muestra badge si ya participó', () => {
    mockUseEncuestas.mockReturnValue({
      encuestas: [
        {
          encuestaId: 2,
          titulo: 'Cerrada',
          yaParticipo: true,
        },
      ],
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getByText('Ya respondiste')).toBeInTheDocument()
  })

  it('muestra enlace ver resultados tras participar', () => {
    mockUseEncuestas.mockReturnValue({
      encuestas: [
        {
          encuestaId: 3,
          titulo: 'Vigente',
          yaParticipo: true,
          fechaFin: '2026-12-31T00:00:00Z',
        },
      ],
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getByRole('link', { name: 'Ver resultados' })).toHaveAttribute(
      'href',
      '/encuestas/3/resultados',
    )
  })
})
