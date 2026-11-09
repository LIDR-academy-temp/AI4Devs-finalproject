import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AnuncioDetallePage } from './AnuncioDetallePage'

vi.mock('../features/anuncios/useAnuncios', () => ({
  useAnuncioDetalle: vi.fn(),
}))

import { useAnuncioDetalle } from '../features/anuncios/useAnuncios'

const mockUseDetalle = useAnuncioDetalle as ReturnType<typeof vi.fn>

function renderWithId(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/anuncios/${id}`]}>
      <Routes>
        <Route path="/anuncios/:id" element={<AnuncioDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseDetalle.mockReturnValue({
    item: null,
    loading: false,
    error: null,
  })
})

describe('AnuncioDetallePage', () => {
  it('muestra error de id inválido', () => {
    renderWithId('abc')
    expect(screen.getByText('Identificador inválido.')).toBeInTheDocument()
  })

  it('muestra carga', () => {
    mockUseDetalle.mockReturnValue({
      item: null,
      loading: true,
      error: null,
    })
    renderWithId('1')
    expect(screen.getByText(/Cargando/i)).toBeInTheDocument()
  })

  it('muestra detalle', () => {
    mockUseDetalle.mockReturnValue({
      item: {
        anuncioId: 1,
        titulo: 'Comunicado',
        contenido: 'Cuerpo del mensaje',
        fechaPublicacion: '2026-10-19T12:00:00Z',
        tipoAnuncio: 'General',
      },
      loading: false,
      error: null,
    })
    renderWithId('1')
    expect(screen.getByText('Comunicado')).toBeInTheDocument()
    expect(screen.getByText('Cuerpo del mensaje')).toBeInTheDocument()
  })

  it('muestra error del hook vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockUseDetalle.mockReturnValue({
      item: null,
      loading: false,
      error: 'No encontrado',
    })
    renderWithId('1')
    expect(toast.error).toHaveBeenCalledWith('No encontrado')
    expect(
      screen.getByText(/No se pudo mostrar el anuncio/i),
    ).toBeInTheDocument()
  })
})
