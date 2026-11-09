import '../test/stubToast'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminPerfilesPage } from './AdminPerfilesPage'

vi.mock('../features/navegacion/usePerfilesAdmin', () => ({
  usePerfilesAdmin: vi.fn(),
}))

import { usePerfilesAdmin } from '../features/navegacion/usePerfilesAdmin'

const mockUsePerfiles = usePerfilesAdmin as ReturnType<typeof vi.fn>

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminPerfilesPage />
    </MemoryRouter>,
  )
}

describe('AdminPerfilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePerfiles.mockReturnValue({
      perfiles: [],
      loading: false,
      error: null,
    })
  })

  it('renderiza título Perfiles', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Perfiles' })).toBeInTheDocument()
  })

  it('muestra error de carga vía toast', async () => {
    const { useToast } = await import('../shared/toast/ToastContext')
    const toast = useToast()
    mockUsePerfiles.mockReturnValue({
      perfiles: [],
      loading: false,
      error: 'No se pudieron cargar los perfiles',
    })
    renderPage()
    expect(toast.error).toHaveBeenCalledWith('No se pudieron cargar los perfiles')
  })

  it('lista perfiles en tabla y cards', () => {
    mockUsePerfiles.mockReturnValue({
      perfiles: [
        {
          perfilId: 1,
          nombre: 'Administrador',
          descripcion: 'Acceso total',
          bAdministrador: true,
        },
      ],
      loading: false,
      error: null,
    })
    renderPage()
    expect(screen.getAllByText('Administrador').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole('button', { name: /permisos menú de administrador/i }),
    ).toBeInTheDocument()
  })
})
