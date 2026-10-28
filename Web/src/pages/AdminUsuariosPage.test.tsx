import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminUsuariosPage } from './AdminUsuariosPage'

vi.mock('../features/admin/usuarios/usePadronUsuarios', () => ({
  usePadronUsuarios: vi.fn(),
}))
vi.mock('../features/admin/usuarios/useCasasSelect', () => ({
  useCasasSelect: vi.fn(),
}))
vi.mock('../shared/lib/apiClient', () => ({
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
}))

const mockToastError = vi.fn()

vi.mock('../shared/toast/ToastContext', () => ({
  useToast: () => ({
    show: vi.fn(),
    success: vi.fn(),
    error: mockToastError,
    dismiss: vi.fn(),
  }),
}))

import { usePadronUsuarios } from '../features/admin/usuarios/usePadronUsuarios'
import { useCasasSelect } from '../features/admin/usuarios/useCasasSelect'
import { apiDelete, apiPost, apiPut } from '../shared/lib/apiClient'

const mockUsePadron = usePadronUsuarios as ReturnType<typeof vi.fn>
const mockUseCasas = useCasasSelect as ReturnType<typeof vi.fn>
const mockApiPost = apiPost as ReturnType<typeof vi.fn>
const mockApiPut = apiPut as ReturnType<typeof vi.fn>
const mockApiDelete = apiDelete as ReturnType<typeof vi.fn>

const usuario = {
  usuarioId: 1,
  nombre: 'María Ruiz',
  correo: 'maria@test.com',
  telefono: null,
  perfil: 'Residente',
  bActivo: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockToastError.mockClear()
  mockUseCasas.mockReturnValue({ casas: [], loading: false, error: null })
  mockUsePadron.mockReturnValue({
    data: [],
    loading: false,
    error: null,
    refetch: vi.fn(),
  })
  mockApiPost.mockResolvedValue({ data: { usuarioId: 2, passwordTemporal: 'temp-123' }, status: 201 })
  mockApiPut.mockResolvedValue({ status: 200 })
  mockApiDelete.mockResolvedValue({ status: 204 })
})

describe('AdminUsuariosPage', () => {
  it('muestra título y estado vacío', async () => {
    render(<AdminUsuariosPage />)
    expect(screen.getByRole('heading', { name: 'Residentes y usuarios' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/sin usuarios registrados/i)).toBeInTheDocument()
    })
  })

  it('muestra usuario en tabla', () => {
    mockUsePadron.mockReturnValue({
      data: [usuario],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<AdminUsuariosPage />)
    expect(screen.getAllByText('maria@test.com').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Sí').length).toBeGreaterThan(0)
  })

  it('muestra carga y error', async () => {
    mockUsePadron.mockReturnValue({
      data: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    })
    const { container, unmount } = render(<AdminUsuariosPage />)
    expect(container.querySelector('.placeholder-glow')).toBeTruthy()
    unmount()

    mockUsePadron.mockReturnValue({
      data: [],
      loading: false,
      error: 'Fallo de red',
      refetch: vi.fn(),
    })
    render(<AdminUsuariosPage />)
    expect(mockToastError).toHaveBeenCalledWith('Fallo de red')
  })

  it('abre panel lateral de nuevo usuario', async () => {
    const user = userEvent.setup()
    const { container } = render(<AdminUsuariosPage />)
    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }))
    expect(container.querySelector('.cq-split.panel-open')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument()
  })

  it('eliminar llama DELETE tras confirmar', async () => {
    const user = userEvent.setup()
    mockUsePadron.mockReturnValue({
      data: [usuario],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<AdminUsuariosPage />)
    await user.click(screen.getByLabelText(/eliminar maria@test.com/i))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Eliminar' }))
    await waitFor(() => {
      expect(mockApiDelete).toHaveBeenCalledWith('/SGR/Usuarios/1')
    })
  })

  it('crear envía POST desde el panel', async () => {
    const user = userEvent.setup()
    render(<AdminUsuariosPage />)
    await user.click(screen.getByRole('button', { name: /nuevo usuario/i }))
    const panel = screen.getByRole('region')
    await user.type(within(panel).getByLabelText(/^nombre/i), 'Nuevo User')
    await user.type(within(panel).getByLabelText(/^correo/i), 'nuevo@test.com')
    await user.click(within(panel).getByRole('button', { name: /crear usuario/i }))
    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith('/SGR/Usuarios', {
        nombre: 'Nuevo User',
        correo: 'nuevo@test.com',
        telefono: null,
        perfil: 'Residente',
        casaId: null,
      })
    })
    expect(screen.getByText('temp-123')).toBeInTheDocument()
  })

  it('editar envía PUT desde el panel', async () => {
    const user = userEvent.setup()
    mockUsePadron.mockReturnValue({
      data: [usuario],
      loading: false,
      error: null,
      refetch: vi.fn(),
    })
    render(<AdminUsuariosPage />)
    await user.click(screen.getAllByLabelText(/editar maria@test.com/i)[0])
    const panel = screen.getByRole('region')
    const nombreInput = within(panel).getByLabelText(/^nombre/i)
    await user.clear(nombreInput)
    await user.type(nombreInput, 'María Actualizada')
    await user.click(within(panel).getByRole('button', { name: /actualizar/i }))
    await waitFor(() => {
      expect(mockApiPut).toHaveBeenCalledWith('/SGR/Usuarios/1', {
        nombre: 'María Actualizada',
        correo: 'maria@test.com',
        telefono: '',
      })
    })
  })
})
