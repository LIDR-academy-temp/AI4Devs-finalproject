import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminTiposArchivoPage } from './AdminTiposArchivoPage'

function renderRedirect(initial = '/admin/archivos/tipos') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/admin/archivos/tipos" element={<AdminTiposArchivoPage />} />
        <Route path="/admin/archivos" element={<div data-testid="archivos-destino">Archivos</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminTiposArchivoPage', () => {
  it('redirige a /admin/archivos?tab=tipos', () => {
    renderRedirect()
    expect(screen.getByTestId('archivos-destino')).toBeInTheDocument()
  })
})
