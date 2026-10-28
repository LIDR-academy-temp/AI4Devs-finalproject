import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminCasasPage } from './AdminCasasPage'

const condominios = [{ condominioId: 1, nombre: 'Cuarta 500' }]
const casasMock = [
  {
    casaId: 10,
    condominioId: 1,
    condominioNombre: 'Cuarta 500',
    numero: '12',
    direccion: 'Interior 3',
    propietarioUsuarioId: null,
    propietarioNombre: null,
  },
  {
    casaId: 11,
    condominioId: 1,
    condominioNombre: 'Cuarta 500',
    numero: '55',
    direccion: 'cada 55',
    propietarioUsuarioId: null,
    propietarioNombre: null,
  },
]

const apiGet = vi.fn()
const apiPost = vi.fn()
const apiPut = vi.fn()
const apiDelete = vi.fn()

vi.mock('../shared/lib/apiClient', () => ({
  apiGet: (...args: unknown[]) => apiGet(...args),
  apiPost: (...args: unknown[]) => apiPost(...args),
  apiPut: (...args: unknown[]) => apiPut(...args),
  apiDelete: (...args: unknown[]) => apiDelete(...args),
}))

const mockToastError = vi.fn()
const mockToastSuccess = vi.fn()

vi.mock('../shared/toast/ToastContext', () => ({
  useToast: () => ({
    show: vi.fn(),
    success: mockToastSuccess,
    error: mockToastError,
    dismiss: vi.fn(),
  }),
}))

function setupApiGet(casas = casasMock, casasError = false) {
  apiGet.mockImplementation(async (path: string) => {
    if (path === '/SGR/Casas/condominios') {
      return { status: 200, data: condominios }
    }
    if (path.startsWith('/SGR/Casas')) {
      if (casasError) {
        return { status: 500, data: undefined, problem: { detail: 'Error de servidor' } }
      }
      return { status: 200, data: casas }
    }
    if (path.startsWith('/SGR/Usuarios')) {
      return { status: 200, data: [] }
    }
    return { status: 404, data: undefined }
  })
}

describe('AdminCasasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockToastError.mockClear()
    mockToastSuccess.mockClear()
    setupApiGet()
    apiPost.mockResolvedValue({ status: 201 })
    apiPut.mockResolvedValue({ status: 200 })
    apiDelete.mockResolvedValue({ status: 204 })
  })

  it('lista casas y muestra barra única con KPIs', async () => {
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Interior 3').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByRole('heading', { name: 'Casas' })).toBeInTheDocument()
    expect(screen.getByText('Con propietario')).toBeInTheDocument()
    expect(screen.queryByText(/listado de casas/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/administra casas con menos fricción/i)).not.toBeInTheDocument()
  })

  it('muestra vacío sin casas', async () => {
    setupApiGet([])
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/sin casas registradas/i)).toBeInTheDocument()
    })
  })

  it('muestra error de API', async () => {
    setupApiGet([], true)
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Error de servidor')
    })
    expect(screen.queryByText('Error de servidor')).not.toBeInTheDocument()
  })

  it('expone cards móviles con la misma data que la tabla', async () => {
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /editar casa 12/i }).length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText('Interior 3').length).toBeGreaterThanOrEqual(1)
  })

  it('alta casa abre panel lateral y llama POST', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nueva casa/i })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: /nueva casa/i }))
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nueva casa' })).toBeInTheDocument()

    const panel = screen.getByRole('region')
    const numeroInput = within(panel).getByLabelText(/número exterior/i)
    const direccionInput = within(panel).getByLabelText(/^dirección$/i)
    await user.clear(numeroInput)
    await user.type(numeroInput, '99')
    await user.clear(direccionInput)
    await user.type(direccionInput, 'Nueva calle')
    await user.click(screen.getByRole('button', { name: /crear casa/i }))

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/SGR/Casas', {
        condominioId: 1,
        direccion: 'Nueva calle',
        numero: '99',
        propietarioUsuarioId: null,
      })
    })
  })

  it('búsqueda global filtra filas y muestra contador N de M', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Interior 3').length).toBeGreaterThanOrEqual(1)
    })

    await user.type(screen.getByLabelText(/buscar en tabla/i), 'Interior')
    expect(screen.getAllByText('Interior 3').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('cada 55')).not.toBeInTheDocument()
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
  })

  it('filtra por columna dirección en el encabezado', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Interior 3').length).toBeGreaterThanOrEqual(1)
    })

    const direccionFilter = screen.getByLabelText(/filtrar dirección/i)
    await user.type(direccionFilter, 'Interior')

    expect(screen.getAllByText('Interior 3').length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText('cada 55')).not.toBeInTheDocument()
  })

  it('actualizar envía PUT con id y body', async () => {
    apiPut.mockResolvedValue({ status: 200, data: {} })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByLabelText(/editar casa 12/i).length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getAllByLabelText(/editar casa 12/i)[0])
    const panel = screen.getByRole('region')
    const numeroInput = within(panel).getByLabelText(/número exterior/i)
    await user.clear(numeroInput)
    await user.type(numeroInput, '555')
    await user.click(within(panel).getByRole('button', { name: /actualizar/i }))

    await waitFor(() => {
      expect(apiPut).toHaveBeenCalledWith('/SGR/Casas/10', {
        numero: '555',
        direccion: 'Interior 3',
        propietarioUsuarioId: null,
      })
    })
  })

  it('editar abre panel y resalta fila', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getAllByLabelText(/editar casa 12/i).length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getAllByLabelText(/editar casa 12/i)[0])
    expect(container.querySelector('.cq-row-active')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Editar casa' })).toBeInTheDocument()
  })

  it('muestra error de delete en el diálogo si la API falla', async () => {
    apiDelete.mockResolvedValue({
      status: 409,
      problem: { detail: 'No se puede eliminar' },
    })
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/eliminar casa 12/i)).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText(/eliminar casa 12/i))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(within(dialog).getByText(/no se puede eliminar/i)).toBeInTheDocument()
    })
    expect(apiDelete).toHaveBeenCalledWith('/SGR/Casas/10')
  })

  it('eliminar llama DELETE tras confirmar en diálogo', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <AdminCasasPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByLabelText(/eliminar casa 12/i)).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText(/eliminar casa 12/i))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/SGR/Casas/10')
    })
  })
})
