import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { MisPasesVisitaPage } from './MisPasesVisitaPage'

vi.mock('../features/visitas/useVisitasPase', () => ({
  useMisPases: () => ({ pases: [], loading: false, error: null, refetch: vi.fn() }),
  crearPase: vi.fn(),
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
