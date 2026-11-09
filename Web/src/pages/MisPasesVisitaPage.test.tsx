import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MisPasesVisitaPage } from './MisPasesVisitaPage'

vi.mock('../features/visitas/useVisitasPase', () => ({
  useMisPases: () => ({ pases: [], loading: false, error: null, refetch: vi.fn() }),
  crearPase: vi.fn(),
}))

vi.mock('../features/admin/visitas/useTiposIdentificacionVisitas', () => ({
  useTiposIdentificacionVisitas: () => ({
    tipos: [],
    loading: false,
    error: null,
    recargar: vi.fn(),
  }),
}))

describe('MisPasesVisitaPage', () => {
  it('renderiza encabezado Pases de visita', () => {
    render(
      <MemoryRouter>
        <MisPasesVisitaPage />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'Pases de visita' })).toBeInTheDocument()
  })
})
