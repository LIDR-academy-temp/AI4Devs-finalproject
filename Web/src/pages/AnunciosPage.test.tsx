import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AnunciosPage } from './AnunciosPage'

const mockUseAnunciosResidente = vi.fn()

vi.mock('../features/anuncios/useAnuncios', () => ({
  useAnunciosResidente: () => mockUseAnunciosResidente(),
}))

describe('AnunciosPage', () => {
  it('muestra mensaje vacío', () => {
    mockUseAnunciosResidente.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(
      <MemoryRouter>
        <AnunciosPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/No hay comunicados vigentes/i)).toBeInTheDocument()
  })

  it('muestra badge Nuevo si visto es false', () => {
    mockUseAnunciosResidente.mockReturnValue({
      data: [
        {
          anuncioId: 1,
          titulo: 'Comunicado',
          contenido: 'x',
          fechaPublicacion: '2026-10-19T12:00:00Z',
          tipoAnuncio: 'General',
          visto: false,
        },
      ],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(
      <MemoryRouter>
        <AnunciosPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('Nuevo')).toBeInTheDocument()
  })
})
