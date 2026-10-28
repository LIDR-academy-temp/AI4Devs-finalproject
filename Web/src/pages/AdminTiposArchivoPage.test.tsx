import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminTiposArchivoPage } from './AdminTiposArchivoPage'

vi.mock('../features/admin/archivos/useTiposArchivo', () => ({
  useTiposArchivo: vi.fn(),
}))

import { useTiposArchivo } from '../features/admin/archivos/useTiposArchivo'

const mockUseTipos = useTiposArchivo as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminTiposArchivoPage />
    </MemoryRouter>,
  )
}

describe('AdminTiposArchivoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTipos.mockReturnValue({
      tipos: [{ tipoArchivoId: 1, tipoArchivo: 'Reglamento' }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
  })

  it('renderiza título Tipos de documento', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Tipos de documento' })).toBeInTheDocument()
  })

  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockUseTipos.mockReturnValue({
      tipos: [],
      loading: false,
      error: 'Error al cargar tipos',
      refetch: vi.fn(),
    })
    renderPage()
    expect(toast.error).toHaveBeenCalledWith('Error al cargar tipos')
  })

  it('lista tipo en tabla y card', () => {
    renderPage()
    expect(screen.getAllByText('Reglamento').length).toBeGreaterThanOrEqual(1)
  })
})
