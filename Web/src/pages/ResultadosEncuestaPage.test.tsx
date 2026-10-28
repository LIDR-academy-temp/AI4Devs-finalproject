import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ResultadosEncuestaPage } from './ResultadosEncuestaPage'

vi.mock('../shared/lib/apiClient', () => ({
  apiGet: vi.fn(),
}))

import { apiGet } from '../shared/lib/apiClient'

const mockApiGet = apiGet as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/encuestas/1/resultados']}>
      <Routes>
        <Route path="/admin/encuestas/:id/resultados" element={<ResultadosEncuestaPage variant="admin" />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ResultadosEncuestaPage', () => {
  it('muestra carga inicial', () => {
    mockApiGet.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/Cargando resultados/i)).toBeInTheDocument()
  })

  it('muestra resultados con contrato apiGet', async () => {
    mockApiGet.mockResolvedValue({
      data: {
        titulo: 'Encuesta anual',
        totalParticipantes: 3,
        preguntas: [],
      },
      status: 200,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Resultados' })).toBeInTheDocument()
    })
    expect(screen.getByText('Encuesta anual')).toBeInTheDocument()
    const hero = screen.getByText('Participantes').closest('.card-body')
    expect(hero).toBeTruthy()
    expect(within(hero as HTMLElement).getByText('3')).toBeInTheDocument()
  })

  it('muestra error cuando apiGet no devuelve data', async () => {
    mockApiGet.mockResolvedValue({
      data: null,
      problem: { detail: 'No encontrada' },
      status: 404,
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('No encontrada')).toBeInTheDocument()
    })
  })
})
