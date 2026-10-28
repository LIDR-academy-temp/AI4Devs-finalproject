import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { JuntaDetallePage } from './JuntaDetallePage'

vi.mock('../features/juntas/useJuntaDetalle', () => ({
  useJuntaDetalle: vi.fn(),
}))

import { useJuntaDetalle } from '../features/juntas/useJuntaDetalle'

const mockUseJuntaDetalle = useJuntaDetalle as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/juntas/1']}>
      <Routes>
        <Route path="/juntas/:id" element={<JuntaDetallePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JuntaDetallePage', () => {
  it('muestra skeleton al cargar', () => {
    mockUseJuntaDetalle.mockReturnValue({ junta: null, loading: true, error: null })
    const { container } = renderPage()
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('muestra detalle de junta activa', () => {
    mockUseJuntaDetalle.mockReturnValue({
      junta: {
        juntaId: 1,
        titulo: 'Junta ordinaria',
        descripcion: 'Temas varios',
        ubicacion: 'Salón',
        fechaProgramada: '2026-11-01T18:00:00Z',
        activa: true,
        contenido: 'Acuerdo 1: aprobar presupuesto',
        archivos: [{ juntaDetalleArchivoId: 1, nombreArchivo: 'acta.pdf', tipoArchivo: 'PDF' }],
      },
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getByText('Junta ordinaria')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('acta.pdf')).toBeInTheDocument()
  })

  it('muestra error', () => {
    mockUseJuntaDetalle.mockReturnValue({
      junta: null,
      loading: false,
      error: 'No encontrada',
    })
    renderPage()
    expect(screen.getByText('No se pudo cargar la junta')).toBeInTheDocument()
    expect(screen.getByText('No encontrada')).toBeInTheDocument()
  })
})
