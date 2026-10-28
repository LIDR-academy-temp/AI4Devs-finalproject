import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { JuntasPage } from './JuntasPage'

vi.mock('../features/juntas/useJuntas', () => ({
  useJuntas: vi.fn(),
}))

import { useJuntas } from '../features/juntas/useJuntas'

const mockUseJuntas = useJuntas as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <JuntasPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseJuntas.mockReturnValue({ juntas: [], loading: false, error: null })
})

describe('JuntasPage', () => {
  it('muestra skeleton al cargar', () => {
    mockUseJuntas.mockReturnValue({ juntas: [], loading: true, error: null })
    const { container } = renderPage()
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('muestra mensaje vacío', () => {
    renderPage()
    expect(screen.getByText('Juntas de condóminos')).toBeInTheDocument()
    expect(screen.getByText('Sin juntas publicadas.')).toBeInTheDocument()
  })

  it('lista junta con enlace', () => {
    mockUseJuntas.mockReturnValue({
      juntas: [
        {
          juntaId: 1,
          titulo: 'Asamblea anual',
          descripcion: 'Orden del día',
          ubicacion: 'Salón',
          fechaProgramada: '2026-11-01T18:00:00Z',
          activa: true,
        },
      ],
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getByText('Asamblea anual')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Asamblea anual/i })).toHaveAttribute('href', '/juntas/1')
  })
})
